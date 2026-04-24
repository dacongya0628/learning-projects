/**
 * 应用入口：挂载 ui 壳子、绑定事件、驱动抽奖异步流程。
 * 依赖 ui.ts（DOM 与动画）、draw.ts（校验与队列）、state.ts（结果类型）。
 */

import './styles.css';
import { createId, type DrawMode, type PrizeTier, type ResultEntry } from './state';
import { prepareDrawQueue, shuffle, validateDraw } from './draw';
import {
  addTierRow,
  applyGlobalDrawModeToAllTierRows,
  applyGlobalRollStopToAllTierRows,
  bindTierListActions,
  delay,
  fillDefaultTiers,
  mountShell,
  playRevealAnimation,
  playRevealBatchAnimation,
  readTiers,
  renderResults,
  setDrawingUiLocked,
  setError,
  setPhase,
  suggestNextTierName,
  type Elements,
  type RevealRollOptions,
} from './ui';

/** 单个号码或单批揭晓前「滚动」动画时长（毫秒） */
const ROLL_MS = 1100;
/** 自动模式下相邻两批之间的停顿 */
const PAUSE_BETWEEN_MS = 550;

/** 当前抽奖任务的取消句柄；非 null 表示有一次进行中的 runLottery */
let drawController: AbortController | null = null;
/** 本轮已揭晓结果，与 results 表格同步 */
let results: ResultEntry[] = [];
/** 不放回队列；抽奖结束后仍保留，供「缺席补抽」将号码放回再抽取 */
let drawQueue: number[] | null = null;
/** 手动模式下：点击「抽取本批」时调用的回调（与 drawController 并存） */
let manualAdvance: (() => void) | null = null;
/** 滚动手动停：点击「停止」时 resolve，与 runLottery 并存 */
let stopRollResolver: (() => void) | null = null;
/**
 * 为 true 时：`runLottery` 因用户点「重置本轮」或「返回设置」而 abort，不在 catch 里提示「已中止」
 *（避免异步 catch 覆盖同步的 setError(null)）
 */
let suppressLotteryAbortToast = false;
/** 缺席补抽揭晓动画的取消句柄（与 drawController 互斥） */
let absentRedrawController: AbortController | null = null;
/**
 * 主流程正在「本批从队列取号～揭晓动画～写入 results」时置位，与 drawQueue 冲突，禁止缺席补抽。
 * 在「抽取本批」等待、自动档批次间隔等时刻为 false，允许先缺席补抽再继续抽奖。
 */
let lotteryRevealInFlight = false;

/** 从表单读取号码范围（已 trunc 为整数，校验在 validateDraw） */
function readMinMax(els: Elements): { min: number; max: number } {
  const min = Math.trunc(Number(els.formMin.value));
  const max = Math.trunc(Number(els.formMax.value));
  return { min, max };
}

function updateProgress(els: Elements, text: string): void {
  els.progressText.textContent = text;
}

/**
 * 等待用户点击「抽取本批」（与 btnStart 共用；先于 drawController 判断）。
 */
function waitManualAdvance(els: Elements, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      if (manualAdvance) {
        manualAdvance = null;
      }
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    manualAdvance = () => {
      signal.removeEventListener('abort', onAbort);
      manualAdvance = null;
      resolve();
    };

    setDrawingUiLocked(els, true, { manualWaiting: true });
    els.btnStart.textContent = '抽取本批';
    els.stageHint.textContent = '点击「抽取本批」开始本批抽奖';
  });
}

/** 号码滚动阶段：等待用户点击「停止」后再落定（与 btnStopRoll 配对） */
function waitForStopRoll(els: Elements, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      if (stopRollResolver) {
        stopRollResolver = null;
      }
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });

    stopRollResolver = () => {
      signal.removeEventListener('abort', onAbort);
      stopRollResolver = null;
      setDrawingUiLocked(els, true);
      resolve();
    };

    setDrawingUiLocked(els, true, { rollingStop: true });
    els.stageHint.textContent = '号码滚动中… 点击「停止」锁定本批结果';
  });
}

/** 根据等级配置构造揭晓动画参数（自动到时停 vs 手动点停） */
function buildRollOpts(tier: PrizeTier, els: Elements, signal: AbortSignal): RevealRollOptions {
  if (tier.rollStopMode === 'manual') {
    return {
      rollStopMode: 'manual',
      waitForStopRoll: () => waitForStopRoll(els, signal),
    };
  }
  return { rollStopMode: 'auto' };
}

/** 各等级剩余名额，用于下拉选项 */
function refreshStageTierOptions(
  els: Elements,
  tiers: PrizeTier[],
  remainingMap: Map<string, number>,
  preferredId: string | null,
): void {
  const sel = els.stageTierPick;
  const prev = preferredId ?? sel.value;
  sel.innerHTML = '';
  for (const t of tiers) {
    const rem = remainingMap.get(t.id) ?? 0;
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.disabled = rem <= 0;
    opt.textContent = `${t.name}（剩余 ${rem}）`;
    sel.appendChild(opt);
  }
  if ((remainingMap.get(prev) ?? 0) > 0) {
    sel.value = prev;
  } else {
    const next = tiers.find((t) => (remainingMap.get(t.id) ?? 0) > 0);
    if (next) sel.value = next.id;
  }
}

/** 将舞台大标题 `#stage-tier` 与「当前抽取等级」下拉当前选中项对齐 */
function syncStageTierTitleFromPick(els: Elements, tiers: PrizeTier[]): void {
  const id = els.stageTierPick.value;
  const picked = tiers.find((t) => t.id === id);
  if (picked) {
    els.stageTier.textContent = picked.name;
  }
}

/**
 * 根据设置区等级列表填充舞台「当前抽取等级」下拉（初始剩余=各等级人数）。
 * 进入舞台、重置本轮后调用；校验失败返回 false。
 */
function syncStageTierPickFromSettings(els: Elements): boolean {
  const { min, max } = readMinMax(els);
  const tiers = readTiers(els.tierList).map((t) => ({
    ...t,
    count: Math.max(1, Math.floor(t.count)),
    batchSize: Math.max(1, Math.floor(t.batchSize)),
  }));
  const err = validateDraw(min, max, tiers);
  if (err) {
    setError(els.errorBox, err);
    return false;
  }
  setError(els.errorBox, null);
  const remainingMap = new Map(tiers.map((t) => [t.id, t.count] as const));
  refreshStageTierOptions(els, tiers, remainingMap, els.stageTierPick.value || null);
  const onStage = els.appMain.classList.contains('phase-stage');
  const hasSelectable = [...els.stageTierPick.options].some((o) => !o.disabled);
  els.stageTierPick.disabled = !onStage || !hasSelectable;
  syncStageTierTitleFromPick(els, tiers);
  return true;
}

/**
 * 在舞台通过「当前抽取等级」选择本批要抽的等级；每批使用该等级自己的方式/每批数/滚动停配置。
 * 首次点「开始抽奖」即开首批；后续手动批在「抽取本批」前可改选等级。
 */
async function runLottery(els: Elements, signal: AbortSignal): Promise<void> {
  const { min, max } = readMinMax(els);
  const tiers = readTiers(els.tierList).map((t) => ({
    ...t,
    count: Math.max(1, Math.floor(t.count)),
    batchSize: Math.max(1, Math.floor(t.batchSize)),
  }));

  const err = validateDraw(min, max, tiers);
  if (err) {
    setError(els.errorBox, err);
    return;
  }
  setError(els.errorBox, null);

  els.appMain.classList.remove('lottery-complete');

  results = [];
  renderResults(els.resultsBody, results, tiers.map((t) => t.id));

  const tierById = new Map(tiers.map((t) => [t.id, t] as const));
  const remainingMap = new Map(tiers.map((t) => [t.id, t.count] as const));
  const batchRoundByTier = new Map<string, number>();

  drawQueue = prepareDrawQueue(min, max);
  let drawn = 0;
  const total = tiers.reduce((s, t) => s + t.count, 0);

  refreshStageTierOptions(els, tiers, remainingMap, null);
  syncStageTierTitleFromPick(els, tiers);
  els.stageTierPick.disabled = false;

  els.stageHint.textContent = '请在上方选择本批要抽取的等级，然后等待滚动揭晓';
  /**
   * 全轮仅「整个 runLottery 的第一批」跳过手动档的「抽取本批」等待（「开始抽奖」已视为开始）。
   * 若前几批都是自动档，必须在每批结束后清 false，否则切换到手动档时会误跳过等待。
   */
  let skipFirstManualAdvance = true;
  /** 上一批已揭晓的等级，用于切换等级时清空舞台号码 */
  let lastRevealTierId: string | null = null;
  /** 上一批揭晓方式；用于「手动档 → 自动档」时插一次「抽取本批」再开始自动揭晓 */
  let lastBatchDrawMode: DrawMode | null = null;

  while (drawn < total) {
    if (signal.aborted) return;

    let tierId = els.stageTierPick.value;
    let tier = tierById.get(tierId);
    let rem = tier ? (remainingMap.get(tierId) ?? 0) : 0;
    if (!tier || rem <= 0) {
      setError(els.errorBox, '请先在「当前抽取等级」中选择仍有名额的等级。');
      return;
    }

    const rollHint = tier.rollStopMode === 'auto' ? '滚动自动停' : '滚动手动停';
    const totalBatchesThisTier = Math.ceil(tier.count / Math.min(tier.batchSize, tier.count));
    els.stageHint.textContent =
      tier.drawMode === 'auto'
        ? `「${tier.name}」自动揭晓 · 本等级约 ${totalBatchesThisTier} 批 · ${rollHint} · 可随时改选等级`
        : `「${tier.name}」手动揭晓（除首批外每批点「抽取本批」）· ${rollHint} · 可随时改选等级`;

    /** 刚从手动档切到自动档：须再点一次「抽取本批」才开始该自动等级（自动→自动连续批不经过此处） */
    if (lastBatchDrawMode === 'manual' && tier.drawMode === 'auto') {
      els.stageHint.textContent = `「${tier.name}」将自动揭晓；请点击「抽取本批」开始本等级`;
      await waitManualAdvance(els, signal);
      tierId = els.stageTierPick.value;
      tier = tierById.get(tierId);
      rem = tier ? (remainingMap.get(tierId) ?? 0) : 0;
      if (!tier || rem <= 0) {
        setError(els.errorBox, '请先在「当前抽取等级」中选择仍有名额的等级。');
        return;
      }
      const rh = tier.rollStopMode === 'auto' ? '滚动自动停' : '滚动手动停';
      const tb = Math.ceil(tier.count / Math.min(tier.batchSize, tier.count));
      els.stageHint.textContent =
        tier.drawMode === 'auto'
          ? `「${tier.name}」自动揭晓 · 本等级约 ${tb} 批 · ${rh} · 可随时改选等级`
          : `「${tier.name}」手动揭晓（除首批外每批点「抽取本批」）· ${rh} · 可随时改选等级`;
    }

    if (tier.drawMode === 'manual' && !skipFirstManualAdvance) {
      await waitManualAdvance(els, signal);
    }

    tierId = els.stageTierPick.value;
    tier = tierById.get(tierId);
    rem = tier ? (remainingMap.get(tierId) ?? 0) : 0;
    if (!tier || rem <= 0) {
      setError(els.errorBox, '请先在「当前抽取等级」中选择仍有名额的等级。');
      return;
    }

    if (lastRevealTierId !== null && tier.id !== lastRevealTierId) {
      clearStageRevealDisplay(els);
    }

    const take = Math.min(tier.batchSize, rem);

    lotteryRevealInFlight = true;
    try {
      setDrawingUiLocked(els, true);
      els.stageTierPick.disabled = true;
      els.btnStart.textContent = '抽奖中…';

      const nums: number[] = [];
      for (let k = 0; k < take; k++) {
        const next = drawQueue.pop();
        if (next === undefined) {
          setError(els.errorBox, '候选号码已用尽，请检查配置。');
          return;
        }
        nums.push(next);
      }

      drawn += take;
      const br = (batchRoundByTier.get(tier.id) ?? 0) + 1;
      batchRoundByTier.set(tier.id, br);
      els.stageTier.textContent = tier.name;
      updateProgress(
        els,
        `进度：${drawn} / ${total} · ${tier.name} 第 ${br} 批 · 本批 ${take} 个`,
      );

      const rollOpts = buildRollOpts(tier, els, signal);
      if (nums.length === 1) {
        await playRevealAnimation(
          els.stageNumber,
          els.stageParticles,
          min,
          max,
          nums[0],
          ROLL_MS,
          signal,
          rollOpts,
        );
      } else {
        await playRevealBatchAnimation(
          els.stageNumber,
          els.stageParticles,
          min,
          max,
          nums,
          ROLL_MS,
          signal,
          rollOpts,
        );
      }

      for (const number of nums) {
        results.push({
          id: createId(),
          tierId: tier.id,
          tierName: tier.name,
          number,
        });
      }
      renderResults(els.resultsBody, results, tiers.map((t) => t.id));

      remainingMap.set(tier.id, rem - take);
      refreshStageTierOptions(els, tiers, remainingMap, tier.id);
      syncStageTierTitleFromPick(els, tiers);

      /** 下拉已切到下一等级时立刻清空中央号码，避免自动档批次间隔内仍显示上一等级结果 */
      const leftAfterBatch = total - drawn;
      if (leftAfterBatch > 0 && els.stageTierPick.value !== tier.id) {
        clearStageRevealDisplay(els);
      }

      setDrawingUiLocked(els, true);
      els.stageTierPick.disabled = false;

      skipFirstManualAdvance = false;

      lastRevealTierId = tier.id;
      lastBatchDrawMode = tier.drawMode;
    } finally {
      lotteryRevealInFlight = false;
    }

    const left = total - drawn;
    if (tier.drawMode === 'auto' && left > 0) {
      await delay(PAUSE_BETWEEN_MS, signal);
    }
  }

  if (signal.aborted) return;

  clearStageRevealDisplay(els);
  els.appMain.classList.add('lottery-complete');
  els.stageTier.textContent = '全部完成';
  els.stageHint.textContent = '可点击「返回抽奖设置」重新配置，或「重置本轮」再抽一次';
  els.stageTierPick.disabled = true;
  updateProgress(els, `完成：共揭晓 ${total} 个号码`);
}

/**
 * 仅窄屏自动滚动；PC 宽屏下布局切换后舞台已在可视区，强制 scrollIntoView 易造成页面上跳。
 */
function scrollIntoViewIfNarrow(el: HTMLElement, options: ScrollIntoViewOptions): void {
  if (window.matchMedia('(max-width: 767px)').matches) {
    el.scrollIntoView(options);
  }
}

/**
 * 缺席补抽：先从队列取出新号码；结果区立即将原号码置灰、当前位显示占位，再播放舞台揭晓动画（**始终手动点「停止」**），最后落定新号码。
 */
async function markAbsentAndRedraw(els: Elements, resultId: string): Promise<void> {
  if (absentRedrawController || lotteryRevealInFlight) {
    setError(els.errorBox, '请稍候再操作。');
    return;
  }
  if (!drawQueue || drawQueue.length === 0) {
    setError(els.errorBox, '没有可补抽的剩余号码，请扩大号码范围或减少中奖人数后重试。');
    return;
  }
  const entry = results.find((r) => r.id === resultId);
  if (!entry) return;

  const old = entry.number;
  drawQueue.push(old);
  drawQueue = shuffle(drawQueue);
  let next = drawQueue.pop();
  if (next === undefined) {
    setError(els.errorBox, '补抽失败，请重试。');
    return;
  }
  while (next === old && drawQueue.length > 0) {
    drawQueue.push(next);
    drawQueue = shuffle(drawQueue);
    const again = drawQueue.pop();
    if (again === undefined) break;
    next = again;
  }

  const ac = new AbortController();
  absentRedrawController = ac;
  const prevHint = els.stageHint.textContent;

  const prevVoided = entry.voidedNumbers ? [...entry.voidedNumbers] : [];
  const prevPending = entry.pendingAbsentRedraw;
  if (!entry.voidedNumbers) entry.voidedNumbers = [];
  entry.voidedNumbers.push(old);
  entry.number = next;
  entry.pendingAbsentRedraw = true;
  setError(els.errorBox, null);
  renderResults(els.resultsBody, results, readTiers(els.tierList).map((t) => t.id));

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    setDrawingUiLocked(els, true);
    els.stageHint.textContent = '缺席补抽：滚动中，点击「停止」揭晓';

    const { min, max } = readMinMax(els);
    const rollOpts: RevealRollOptions = {
      rollStopMode: 'manual',
      waitForStopRoll: () => waitForStopRoll(els, ac.signal),
    };
    await playRevealAnimation(
      els.stageNumber,
      els.stageParticles,
      min,
      max,
      next,
      ROLL_MS,
      ac.signal,
      rollOpts,
    );

    entry.pendingAbsentRedraw = false;
    setError(els.errorBox, null);
    renderResults(els.resultsBody, results, readTiers(els.tierList).map((t) => t.id));
  } catch (e) {
    entry.number = old;
    entry.voidedNumbers = prevVoided.length > 0 ? [...prevVoided] : undefined;
    entry.pendingAbsentRedraw = prevPending;
    drawQueue.push(next);
    renderResults(els.resultsBody, results, readTiers(els.tierList).map((t) => t.id));
    if (e instanceof DOMException && e.name === 'AbortError') {
      setError(els.errorBox, null);
    } else {
      setError(els.errorBox, '缺席补抽中断。');
      console.error(e);
    }
  } finally {
    absentRedrawController = null;
    setDrawingUiLocked(els, false);
    els.stageHint.textContent = els.appMain.classList.contains('lottery-complete')
      ? '可点击「返回抽奖设置」重新配置，或「重置本轮」再抽一次'
      : (prevHint ?? '');
  }
}

/** 仅清空大号码区与粒子动效，用于切换奖项时去掉上一轮揭晓数字 */
function clearStageRevealDisplay(els: Elements): void {
  els.stageNumber.textContent = '?';
  els.stageNumber.classList.remove('is-rolling', 'is-landed', 'land-pop', 'stage-number--multi');
  els.stageParticles.classList.remove('burst');
}

/** 清空舞台文案与动画 class，不改动表单与等级列表 */
function resetStageCopy(els: Elements): void {
  els.appMain.classList.remove('lottery-complete');
  els.stageTier.textContent = '准备就绪';
  els.stageHint.textContent =
    '先选「当前抽取等级」再点「开始抽奖」；手动批点「抽取本批」；滚动手动停点「停止」';
  clearStageRevealDisplay(els);
  els.btnStopRoll.hidden = true;
  els.stageTierPick.innerHTML = '';
  els.stageTierPick.disabled = true;
  updateProgress(els, '');
}

/** 中止抽奖、清空结果、回到设置阶段并解锁 UI */
function goToSetup(els: Elements): void {
  absentRedrawController?.abort();
  absentRedrawController = null;
  if (drawController) suppressLotteryAbortToast = true;
  drawController?.abort();
  drawController = null;
  manualAdvance = null;
  stopRollResolver = null;
  results = [];
  drawQueue = null;
  renderResults(
    els.resultsBody,
    results,
    readTiers(els.tierList).map((t) => t.id),
  );
  resetStageCopy(els);
  setError(els.errorBox, null);
  setDrawingUiLocked(els, false);
  els.btnStart.textContent = '开始抽奖';
  setPhase(els, 'setup');
  scrollIntoViewIfNarrow(els.appMain, { behavior: 'smooth', block: 'start' });
}

function init(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) return;

  const els = mountShell(root);
  fillDefaultTiers(els.tierList, els.tierTemplate);
  els.defaultDrawMode.value = 'manual';
  els.defaultRollStopMode.value = 'manual';
  bindTierListActions(els.tierList);
  setPhase(els, 'setup');

  // --- 统一揭晓方式 / 滚动停：改动时同步到所有等级行（各行仍可再改）---
  els.defaultDrawMode.addEventListener('change', () => {
    const mode = els.defaultDrawMode.value === 'manual' ? 'manual' : 'auto';
    applyGlobalDrawModeToAllTierRows(els.tierList, mode);
  });
  els.defaultRollStopMode.addEventListener('change', () => {
    const mode = els.defaultRollStopMode.value === 'manual' ? 'manual' : 'auto';
    applyGlobalRollStopToAllTierRows(els.tierList, mode);
  });

  // --- 添加等级 ---
  els.btnAddTier.addEventListener('click', () => {
    addTierRow(els.tierList, els.tierTemplate, {
      name: suggestNextTierName(els.tierList),
      count: 1,
      batchSize: 1,
    });
  });

  // --- 示例 / 重置设置区表单 ---
  els.btnExample.addEventListener('click', () => {
    els.formMin.value = '1';
    els.formMax.value = '100';
    els.defaultDrawMode.value = 'manual';
    els.defaultRollStopMode.value = 'manual';
    fillDefaultTiers(els.tierList, els.tierTemplate);
    setError(els.errorBox, null);
  });

  els.btnResetSetup.addEventListener('click', () => {
    els.formMin.value = '1';
    els.formMax.value = '100';
    els.defaultDrawMode.value = 'manual';
    els.defaultRollStopMode.value = 'manual';
    fillDefaultTiers(els.tierList, els.tierTemplate);
    setError(els.errorBox, null);
  });

  // --- 进入舞台视图（仍可在返回后改配置）---
  els.btnGoStage.addEventListener('click', () => {
    const { min, max } = readMinMax(els);
    const tiers = readTiers(els.tierList).map((t) => ({
      ...t,
      count: Math.max(1, Math.floor(t.count)),
      batchSize: Math.max(1, Math.floor(t.batchSize)),
    }));
    const err = validateDraw(min, max, tiers);
    if (err) {
      setError(els.errorBox, err);
      return;
    }
    setError(els.errorBox, null);
    setPhase(els, 'stage');
    syncStageTierPickFromSettings(els);
    scrollIntoViewIfNarrow(els.drawView, { behavior: 'smooth', block: 'start' });
  });

  els.btnBackToSetup.addEventListener('click', () => {
    goToSetup(els);
  });

  els.stageTierPick.addEventListener('change', () => {
    if (!els.appMain.classList.contains('phase-stage')) return;
    const tiers = readTiers(els.tierList).map((t) => ({
      ...t,
      count: Math.max(1, Math.floor(t.count)),
      batchSize: Math.max(1, Math.floor(t.batchSize)),
    }));
    syncStageTierTitleFromPick(els, tiers);
  });

  // --- 开始抽奖 / 手动「抽取本批」/ 滚动「停止」---
  els.btnStart.addEventListener('click', async () => {
    /** 缺席补抽进行中勿推进「抽取本批」，否则与补抽队列/结果冲突 */
    if (absentRedrawController) return;
    if (manualAdvance) {
      manualAdvance();
      return;
    }
    if (stopRollResolver) {
      stopRollResolver();
      return;
    }
    if (drawController) return;

    drawController = new AbortController();
    const signal = drawController.signal;

    setError(els.errorBox, null);
    setDrawingUiLocked(els, true);
    els.btnStart.textContent = '抽奖中…';

    try {
      await runLottery(els, signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        if (!suppressLotteryAbortToast) {
          setError(els.errorBox, '已中止本次抽奖。');
        }
      } else {
        setError(els.errorBox, '抽奖过程出现异常，请重试。');
        console.error(e);
      }
    } finally {
      suppressLotteryAbortToast = false;
      manualAdvance = null;
      stopRollResolver = null;
      setDrawingUiLocked(els, false);
      els.btnStart.textContent = '开始抽奖';
      drawController = null;
    }
  });

  els.btnStopRoll.addEventListener('click', () => {
    if (stopRollResolver) {
      stopRollResolver();
    }
  });

  // --- 舞台内重置：保留舞台视图，只清空本轮结果与动画 ---
  els.btnResetDraw.addEventListener('click', () => {
    absentRedrawController?.abort();
    absentRedrawController = null;
    if (drawController) suppressLotteryAbortToast = true;
    drawController?.abort();
    drawController = null;
    manualAdvance = null;
    stopRollResolver = null;
    results = [];
    drawQueue = null;
    renderResults(
      els.resultsBody,
      results,
      readTiers(els.tierList).map((t) => t.id),
    );
    resetStageCopy(els);
    setError(els.errorBox, null);
    setDrawingUiLocked(els, false);
    els.btnStart.textContent = '开始抽奖';
    syncStageTierPickFromSettings(els);
  });

  els.resultsBody.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest('button.num-chip[data-result-id]');
    if (!chip) return;
    const id = chip.getAttribute('data-result-id');
    if (!id) return;
    e.preventDefault();
    void markAbsentAndRedraw(els, id).catch((err) => {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error(err);
      }
    });
  });
}

init();
