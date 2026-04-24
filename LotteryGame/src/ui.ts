/**
 * 界面层：挂载整页 HTML 壳子、阶段切换、等级列表 CRUD、错误提示、揭晓动画与结果渲染。
 * 与业务编排解耦：main.ts 只通过 Elements 与这些导出函数交互；数据类型来自 state.ts。
 */

import type { DrawMode, PrizeTier, ResultEntry, RollStopMode } from './state';
import { createId, defaultTiers } from './state';
import { APP_VERSION } from './version';

/**
 * mountShell 后得到的根级 DOM 引用集合，供 main.ts 绑定事件与更新文案。
 * id/class 与 styles.css 中的选择器对应。
 */
export type Elements = {
  /** #app 根节点（与传入 mountShell 的 root 相同） */
  app: HTMLElement;
  /** main.app-main：含 phase-setup / phase-stage，控制两阶段布局 */
  appMain: HTMLElement;
  /** 最小号码 */
  formMin: HTMLInputElement;
  /** 最大号码 */
  formMax: HTMLInputElement;
  /** 统一揭晓方式：改动能同步到所有等级行；新增行也以此为初始值 */
  defaultDrawMode: HTMLSelectElement;
  /** 统一滚动停止：改动能同步到所有等级行；新增行也以此为初始值 */
  defaultRollStopMode: HTMLSelectElement;
  /** 等级行 ul#tier-list */
  tierList: HTMLElement;
  /** 单行 li.tier-row 的 HTML 模板 */
  tierTemplate: HTMLTemplateElement;
  btnAddTier: HTMLButtonElement;
  btnExample: HTMLButtonElement;
  btnGoStage: HTMLButtonElement;
  btnResetSetup: HTMLButtonElement;
  btnStart: HTMLButtonElement;
  btnBackToSetup: HTMLButtonElement;
  btnResetDraw: HTMLButtonElement;
  /** 滚动阶段「手动停止」时显示，点击后落定本批号码 */
  btnStopRoll: HTMLButtonElement;
  /** 全局错误提示，role="alert" */
  errorBox: HTMLElement;
  /** 舞台当前等级名 */
  stageTier: HTMLElement;
  /** 本轮抽奖中选择本批要抽的等级（剩余名额为 0 的项会禁用） */
  stageTierPick: HTMLSelectElement;
  /** 舞台说明文案 */
  stageHint: HTMLElement;
  /** 大号揭晓数字，动画 class：is-rolling / is-landed / land-pop */
  stageNumber: HTMLElement;
  /** 落定时的粒子 burst 容器 */
  stageParticles: HTMLElement;
  /** 中奖记录分组容器 */
  resultsBody: HTMLElement;
  /** 进度行 aria-live */
  progressText: HTMLElement;
  /** 舞台+结果整块，窄屏滚动目标 */
  drawView: HTMLElement;
};

/**
 * 在 root（通常为 #app）内写入完整页面结构并返回各关键节点引用。
 *
 * 结构概览（与 innerHTML 一致）：
 * - `.app-shell`：header（标题区）+ main（设置卡 + `#draw-view` 内舞台卡与结果卡）+ footer（版本号含 APP_VERSION）
 * - 设置区：`#form-min` / `#form-max`、统一揭晓/滚动停、`#tier-list` + `#tier-template` 克隆行
 * - 舞台区：`#stage-tier` / `#stage-hint`、`#stage-number` + `#stage-particles`、操作按钮与 `#progress-text`
 */
export function mountShell(root: HTMLElement): Elements {
  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="logo-bubble" aria-hidden="true">🎁</div>
        <div class="header-text">
          <h1 class="app-title">大葱鸭随机抽奖机</h1>
          <p class="app-sub">
            支持多等级、全局不放回抽奖；每等级可选手动/自动与每批揭晓数量 · 已中奖不会重复 ✨
          </p>
        </div>
        <a href="#footer-contact" class="header-contact-link">联系作者</a>
      </header>

      <main class="app-main phase-setup" id="app-main">
        <p class="step-badge" id="step-badge" aria-live="polite">第 1 步：抽奖设置</p>

        <p class="error-box error-box-global" id="error-box" role="alert" hidden></p>

        <section class="card config-card" aria-labelledby="config-heading">
          <h2 id="config-heading" class="card-title">抽奖设置</h2>
          <div class="config-settings-row">
            <label class="field">
              <span class="field-label">最小号码</span>
              <input type="number" id="form-min" value="1" step="1" inputmode="numeric" />
            </label>
            <label class="field">
              <span class="field-label">最大号码</span>
              <input type="number" id="form-max" value="100" step="1" inputmode="numeric" />
            </label>
            <label class="field config-mode-field">
              <span class="field-label">统一揭晓方式</span>
              <select id="default-draw-mode" class="tier-mode-input" aria-label="统一揭晓方式，将应用到所有等级">
                <option value="manual" selected>手动（每批点「抽取本批」）</option>
                <option value="auto">自动（连续揭晓）</option>
              </select>
            </label>
            <label class="field config-mode-field">
              <span class="field-label">统一滚动停止</span>
              <select id="default-roll-stop-mode" class="tier-mode-input" aria-label="统一滚动停止方式，将应用到所有等级">
                <option value="manual" selected>手动（点「停止」揭晓）</option>
                <option value="auto">自动（到时揭晓）</option>
              </select>
            </label>
          </div>

          <div class="tiers-head">
            <span class="field-label">中奖等级与人数</span>
            <div class="tiers-actions">
              <button type="button" class="btn btn-soft" id="btn-add-tier">＋ 添加等级</button>
              <button type="button" class="btn btn-soft" id="btn-example">填入示例</button>
            </div>
          </div>

          <ul class="tier-list" id="tier-list" role="list"></ul>
          <template id="tier-template">
            <li class="tier-row" role="listitem">
              <div class="tier-row-main">
                <label class="tier-name-wrap">
                  <span class="sr-only">等级名称</span>
                  <input type="text" class="tier-name" placeholder="例如：一等奖" maxlength="20" />
                </label>
                <label class="tier-count-wrap">
                  <span class="tier-count-label">人数</span>
                  <input type="number" class="tier-count" min="1" step="1" value="1" inputmode="numeric" />
                </label>
                <div class="tier-row-btns">
                  <button type="button" class="icon-btn tier-up" title="上移" aria-label="上移">↑</button>
                  <button type="button" class="icon-btn tier-down" title="下移" aria-label="下移">↓</button>
                  <button type="button" class="icon-btn tier-remove danger" title="删除" aria-label="删除">✕</button>
                </div>
              </div>
              <div class="tier-row-meta">
                <label class="tier-meta-field">
                  <span class="tier-meta-label">方式</span>
                  <select class="tier-mode tier-mode-input" aria-label="揭晓方式">
                    <option value="auto">自动</option>
                    <option value="manual" selected>手动</option>
                  </select>
                </label>
                <label class="tier-meta-field">
                  <span class="tier-meta-label">每批</span>
                  <input type="number" class="tier-batch" min="1" step="1" value="1" inputmode="numeric" title="每批同时揭晓几个号码" />
                </label>
                <label class="tier-meta-field">
                  <span class="tier-meta-label">滚动停</span>
                  <select class="tier-roll-stop tier-mode-input" aria-label="滚动停止方式" title="自动：滚动固定时间后揭晓；手动：点停止后揭晓">
                    <option value="auto">自动停</option>
                    <option value="manual" selected>手动停</option>
                  </select>
                </label>
              </div>
            </li>
          </template>

          <div class="actions-row">
            <button type="button" class="btn btn-primary" id="btn-go-stage">进入抽奖舞台</button>
            <button type="button" class="btn btn-outline" id="btn-reset-setup">恢复默认设置</button>
          </div>
        </section>

        <div class="draw-view" id="draw-view">
          <section class="card stage-card" aria-labelledby="stage-heading">
            <h2 id="stage-heading" class="card-title">抽奖舞台</h2>
            <div class="stage-tier-pick-row">
              <label class="stage-tier-pick-label">
                <span class="stage-tier-pick-text">当前抽取等级</span>
                <select id="stage-tier-pick" class="tier-mode-input" disabled aria-label="选择本批要抽取的等级"></select>
              </label>
            </div>
            <p class="stage-tier" id="stage-tier">准备就绪</p>
            <p class="stage-hint" id="stage-hint">先选等级再点「开始抽奖」；后续手动批点「抽取本批」；滚动手动停时点「停止」</p>
            <div class="stage-display" aria-live="assertive">
              <div class="stage-particles" id="stage-particles" aria-hidden="true"></div>
              <div class="stage-number" id="stage-number">?</div>
            </div>

            <div class="actions-row stage-actions">
              <button type="button" class="btn btn-primary" id="btn-start">开始抽奖</button>
              <button type="button" class="btn btn-accent" id="btn-stop-roll" hidden>停止</button>
              <button type="button" class="btn btn-outline" id="btn-back-setup">返回抽奖设置</button>
              <button type="button" class="btn btn-outline" id="btn-reset-draw">重置本轮</button>
            </div>
            <p class="progress-text" id="progress-text" aria-live="polite"></p>
          </section>

          <section class="card results-card" aria-labelledby="results-heading">
            <h2 id="results-heading" class="card-title">中奖记录</h2>
            <div class="results-body" id="results-body">
              <p class="results-empty">还没有揭晓的号码哦～</p>
            </div>
          </section>
        </div>
      </main>

      <footer class="app-footer" id="footer-contact">
        <p class="footer-tech">
          技术支持：泥瓶巷少年（大葱鸭） · <span class="footer-dev-wx">微信 xdc1608323479</span>
        </p>
        <p class="footer-dev-offer">
          如需类似工具或定制开发（App、微信小程序、H5、企业官网等），欢迎微信联系交流。
        </p>
        <p class="footer-version">当前版本号：${APP_VERSION}</p>
      </footer>
    </div>
  `;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  return {
    app: root,
    appMain: $('#app-main'),
    formMin: $('#form-min'),
    formMax: $('#form-max'),
    defaultDrawMode: $('#default-draw-mode') as HTMLSelectElement,
    defaultRollStopMode: $('#default-roll-stop-mode') as HTMLSelectElement,
    tierList: $('#tier-list'),
    tierTemplate: $('#tier-template') as HTMLTemplateElement,
    btnAddTier: $('#btn-add-tier'),
    btnExample: $('#btn-example'),
    btnGoStage: $('#btn-go-stage'),
    btnResetSetup: $('#btn-reset-setup'),
    btnStart: $('#btn-start'),
    btnBackToSetup: $('#btn-back-setup'),
    btnResetDraw: $('#btn-reset-draw'),
    btnStopRoll: $('#btn-stop-roll'),
    errorBox: $('#error-box'),
    stageTier: $('#stage-tier'),
    stageTierPick: $('#stage-tier-pick') as HTMLSelectElement,
    stageHint: $('#stage-hint'),
    stageNumber: $('#stage-number'),
    stageParticles: $('#stage-particles'),
    resultsBody: $('#results-body'),
    progressText: $('#progress-text'),
    drawView: $('#draw-view'),
  };
}

const STEP_SETUP = '第 1 步：抽奖设置';
const STEP_STAGE = '第 2 步：抽奖舞台';

/** 切换「设置 / 舞台」阶段：改 main 的 phase class 与步骤徽章文案 */
export function setPhase(els: Elements, phase: 'setup' | 'stage'): void {
  const badge = els.appMain.querySelector('#step-badge');

  if (phase === 'setup') {
    els.appMain.classList.remove('phase-stage');
    els.appMain.classList.add('phase-setup');
    if (badge) badge.textContent = STEP_SETUP;
  } else {
    els.appMain.classList.remove('phase-setup');
    els.appMain.classList.add('phase-stage');
    if (badge) badge.textContent = STEP_STAGE;
  }
}

function readDefaultDrawModeFromDoc(list: HTMLElement): DrawMode {
  const sel = list.ownerDocument.getElementById('default-draw-mode') as HTMLSelectElement | null;
  return sel?.value === 'manual' ? 'manual' : 'auto';
}

function readDefaultRollStopModeFromDoc(list: HTMLElement): RollStopMode {
  const sel = list.ownerDocument.getElementById('default-roll-stop-mode') as HTMLSelectElement | null;
  return sel?.value === 'manual' ? 'manual' : 'auto';
}

/** 将「统一揭晓方式」同步到列表中每一行的「方式」下拉 */
export function applyGlobalDrawModeToAllTierRows(list: HTMLElement, mode: DrawMode): void {
  for (const li of list.querySelectorAll<HTMLElement>('.tier-row')) {
    const modeSel = li.querySelector('.tier-mode') as HTMLSelectElement | null;
    if (modeSel) modeSel.value = mode;
  }
}

/** 将「统一滚动停止」同步到列表中每一行的「滚动停」下拉 */
export function applyGlobalRollStopToAllTierRows(list: HTMLElement, mode: RollStopMode): void {
  for (const li of list.querySelectorAll<HTMLElement>('.tier-row')) {
    const rollSel = li.querySelector('.tier-roll-stop') as HTMLSelectElement | null;
    if (rollSel) rollSel.value = mode;
  }
}

function tierFromRow(li: HTMLLIElement): PrizeTier | null {
  const name = (li.querySelector('.tier-name') as HTMLInputElement).value.trim();
  const count = Math.floor(Number((li.querySelector('.tier-count') as HTMLInputElement).value));
  const modeSel = li.querySelector('.tier-mode') as HTMLSelectElement | null;
  const batchIn = li.querySelector('.tier-batch') as HTMLInputElement | null;
  const rollStopSel = li.querySelector('.tier-roll-stop') as HTMLSelectElement | null;
  const drawMode: DrawMode = modeSel?.value === 'manual' ? 'manual' : 'auto';
  const batchRaw = Math.floor(Number(batchIn?.value));
  const batchSize = Number.isFinite(batchRaw) && batchRaw >= 1 ? batchRaw : 1;
  const rollStopMode: RollStopMode = rollStopSel?.value === 'manual' ? 'manual' : 'auto';
  const id = li.dataset.tierId || createId();
  li.dataset.tierId = id;
  if (!name || !Number.isFinite(count)) return null;
  return { id, name, count, drawMode, batchSize, rollStopMode };
}

/** 从列表 DOM 读出所有有效行；空名或非数字 count 的行被过滤 */
export function readTiers(list: HTMLElement): PrizeTier[] {
  const rows = [...list.querySelectorAll<HTMLLIElement>('.tier-row')];
  return rows
    .map((row) => tierFromRow(row))
    .filter((t): t is PrizeTier => t !== null);
}

const CN_ORDINAL = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 按当前列表已有行数，生成下一档等级名称（一等奖…十等奖，之后为「第 N 等级」） */
export function suggestNextTierName(list: HTMLElement): string {
  const n = list.querySelectorAll('.tier-row').length + 1;
  if (n >= 1 && n <= 10) {
    return `${CN_ORDINAL[n - 1]}等奖`;
  }
  return `第 ${n} 等级`;
}

/**
 * 克隆模板追加一行；可传入部分 tier 覆盖默认 id/name/count/drawMode/batchSize。
 * 未指定 drawMode / rollStopMode 时跟随页面上方的「统一揭晓方式」「统一滚动停止」。
 * @returns 新插入的 li 元素
 */
export function addTierRow(
  list: HTMLElement,
  template: HTMLTemplateElement,
  tier?: Partial<PrizeTier>,
): HTMLLIElement {
  const frag = template.content.cloneNode(true) as DocumentFragment;
  const li = frag.querySelector('li') as HTMLLIElement;
  const id = tier?.id ?? createId();
  li.dataset.tierId = id;
  const nameIn = li.querySelector('.tier-name') as HTMLInputElement;
  const countIn = li.querySelector('.tier-count') as HTMLInputElement;
  const modeSel = li.querySelector('.tier-mode') as HTMLSelectElement;
  const batchIn = li.querySelector('.tier-batch') as HTMLInputElement;
  const rollStopSel = li.querySelector('.tier-roll-stop') as HTMLSelectElement;
  nameIn.value = tier?.name ?? '';
  countIn.value = String(Math.max(1, Math.floor(tier?.count ?? 1)));
  const dm: DrawMode = tier?.drawMode ?? readDefaultDrawModeFromDoc(list);
  modeSel.value = dm;
  batchIn.value = String(Math.max(1, Math.floor(tier?.batchSize ?? 1)));
  const rm: RollStopMode = tier?.rollStopMode ?? readDefaultRollStopModeFromDoc(list);
  rollStopSel.value = rm;
  list.appendChild(li);
  return li;
}

/** 清空列表后按 defaultTiers() 填满三行 */
export function fillDefaultTiers(list: HTMLElement, template: HTMLTemplateElement): void {
  list.innerHTML = '';
  for (const t of defaultTiers()) {
    addTierRow(list, template, t);
  }
}

/** 显示或清空全局错误；message 为 null 时隐藏 */
export function setError(box: HTMLElement, message: string | null): void {
  if (message) {
    box.hidden = false;
    box.textContent = message;
  } else {
    box.hidden = true;
    box.textContent = '';
  }
}

export type DrawingUiLockOptions = {
  /** 为 true 时：整体仍视为抽奖中，但允许点击「开始/抽取本批」推进手动批 */
  manualWaiting?: boolean;
  /** 为 true 时：号码滚动中，显示并允许点击「停止」以手动落定 */
  rollingStop?: boolean;
};

/**
 * 抽奖进行中锁定设置区与部分舞台按钮，防止中途改配置或返回。
 * 「重置本轮」始终可用，便于紧急清空。
 * manualWaiting 为 true 时解锁 btnStart（由 main 改文案为「抽取本批」）。
 * rollingStop 为 true 时显示 btnStopRoll 并解锁，其余主按钮仍按 locked 处理。
 */
export function setDrawingUiLocked(
  els: Elements,
  locked: boolean,
  opts?: DrawingUiLockOptions,
): void {
  const manualWaiting = opts?.manualWaiting === true;
  const rollingStop = opts?.rollingStop === true;
  /** 滚动手动停时禁用「开始」，仅「停止」可点；等待「抽取本批」时相反 */
  els.btnStart.disabled = rollingStop || (locked && !manualWaiting);
  if (rollingStop) {
    els.btnStopRoll.hidden = false;
    els.btnStopRoll.disabled = false;
  } else {
    els.btnStopRoll.hidden = true;
    els.btnStopRoll.disabled = true;
  }
  els.btnBackToSetup.disabled = locked;
  els.btnGoStage.disabled = locked;
  els.btnResetSetup.disabled = locked;
  els.formMin.disabled = locked;
  els.formMax.disabled = locked;
  els.defaultDrawMode.disabled = locked;
  els.defaultRollStopMode.disabled = locked;
  els.btnAddTier.disabled = locked;
  els.btnExample.disabled = locked;
  for (const el of els.tierList.querySelectorAll<HTMLInputElement>('input')) {
    el.disabled = locked;
  }
  for (const el of els.tierList.querySelectorAll<HTMLSelectElement>('select')) {
    el.disabled = locked;
  }
  for (const el of els.tierList.querySelectorAll<HTMLButtonElement>('button')) {
    el.disabled = locked;
  }
  els.btnResetDraw.disabled = false;

  if (!locked) {
    const onStage = els.appMain.classList.contains('phase-stage');
    if (!onStage || els.stageTierPick.options.length === 0) {
      els.stageTierPick.disabled = true;
    } else {
      const hasSelectable = [...els.stageTierPick.options].some((o) => !o.disabled);
      els.stageTierPick.disabled = !hasSelectable;
    }
  } else if (manualWaiting) {
    els.stageTierPick.disabled = false;
  } else {
    els.stageTierPick.disabled = true;
  }
}

/** 闭区间 [min(a,b), max(a,b)] 内均匀随机整数 */
export function randomIntInclusive(a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** 可中断的 setTimeout；signal 触发时 reject AbortError */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/** 揭晓动画：自动到时停，或手动点停后再展示 finalNumber */
export type RevealRollOptions = {
  rollStopMode: 'auto' | 'manual';
  /** rollStopMode 为 manual 时必传，由 main 在展示「停止」按钮后注入 */
  waitForStopRoll?: () => Promise<void>;
};

/**
 * 滚动闪动后落定到 finalNumber；滚动阶段在 [min,max] 内随机显示。
 * auto：滚动 rollMs 后自动落定；manual：持续滚动直至 waitForStopRoll 完成再落定。
 * 依赖 CSS：is-rolling、is-landed、land-pop、particles.burst。
 */
export async function playRevealAnimation(
  stageNumber: HTMLElement,
  stageParticles: HTMLElement,
  min: number,
  max: number,
  finalNumber: number,
  rollMs: number,
  signal: AbortSignal | undefined,
  rollOpts: RevealRollOptions,
): Promise<void> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  stageNumber.classList.remove('stage-number--multi', 'is-landed', 'land-pop');
  stageNumber.classList.add('is-rolling');
  stageParticles.classList.remove('burst');
  void stageParticles.offsetWidth;
  stageParticles.classList.add('burst');

  if (rollOpts.rollStopMode === 'auto') {
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const tick = (now: number) => {
        if (signal?.aborted) {
          stageNumber.classList.remove('is-rolling');
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const elapsed = now - start;
        if (elapsed < rollMs) {
          stageNumber.textContent = String(randomIntInclusive(min, max));
          requestAnimationFrame(tick);
        } else {
          stageNumber.textContent = String(finalNumber);
          stageNumber.classList.remove('is-rolling');
          stageNumber.classList.add('is-landed', 'land-pop');
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  } else {
    const wait = rollOpts.waitForStopRoll;
    if (!wait) {
      throw new Error('waitForStopRoll is required when rollStopMode is manual');
    }
    let rafId = 0;
    let spinning = true;
    const loop = () => {
      if (!spinning) return;
      if (signal?.aborted) return;
      stageNumber.textContent = String(randomIntInclusive(min, max));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    try {
      await Promise.race([
        wait(),
        new Promise<never>((_, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          });
        }),
      ]);
    } finally {
      spinning = false;
      cancelAnimationFrame(rafId);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    stageNumber.textContent = String(finalNumber);
    stageNumber.classList.remove('is-rolling');
    stageNumber.classList.add('is-landed', 'land-pop');
  }

  await delay(650, signal);
  stageNumber.classList.remove('land-pop');
}

/**
 * 本批多个号码：滚动阶段显示多组随机数（中间点分隔），落定后展示 finalNumbers。
 * 多号码时添加 stage-number--multi 以缩小字号。
 */
export async function playRevealBatchAnimation(
  stageNumber: HTMLElement,
  stageParticles: HTMLElement,
  min: number,
  max: number,
  finalNumbers: number[],
  rollMs: number,
  signal: AbortSignal | undefined,
  rollOpts: RevealRollOptions,
): Promise<void> {
  if (finalNumbers.length === 0) return;
  if (finalNumbers.length === 1) {
    await playRevealAnimation(
      stageNumber,
      stageParticles,
      min,
      max,
      finalNumbers[0],
      rollMs,
      signal,
      rollOpts,
    );
    return;
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  stageNumber.classList.add('stage-number--multi');
  stageNumber.classList.remove('is-landed', 'land-pop');
  stageNumber.classList.add('is-rolling');
  stageParticles.classList.remove('burst');
  void stageParticles.offsetWidth;
  stageParticles.classList.add('burst');

  const n = finalNumbers.length;

  if (rollOpts.rollStopMode === 'auto') {
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const tick = (now: number) => {
        if (signal?.aborted) {
          stageNumber.classList.remove('is-rolling');
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const elapsed = now - start;
        if (elapsed < rollMs) {
          const parts: string[] = [];
          for (let i = 0; i < n; i++) {
            parts.push(String(randomIntInclusive(min, max)));
          }
          stageNumber.textContent = parts.join(' · ');
          requestAnimationFrame(tick);
        } else {
          stageNumber.textContent = finalNumbers.join(' · ');
          stageNumber.classList.remove('is-rolling');
          stageNumber.classList.add('is-landed', 'land-pop');
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  } else {
    const wait = rollOpts.waitForStopRoll;
    if (!wait) {
      throw new Error('waitForStopRoll is required when rollStopMode is manual');
    }
    let rafId = 0;
    let spinning = true;
    const loop = () => {
      if (!spinning) return;
      if (signal?.aborted) return;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        parts.push(String(randomIntInclusive(min, max)));
      }
      stageNumber.textContent = parts.join(' · ');
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    try {
      await Promise.race([
        wait(),
        new Promise<never>((_, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
            once: true,
          });
        }),
      ]);
    } finally {
      spinning = false;
      cancelAnimationFrame(rafId);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    stageNumber.textContent = finalNumbers.join(' · ');
    stageNumber.classList.remove('is-rolling');
    stageNumber.classList.add('is-landed', 'land-pop');
  }

  await delay(650, signal);
  stageNumber.classList.remove('land-pop');
}

/**
 * 按 tierId 分组渲染 chips；entries 为空时显示占位文案。
 * `tierOrderIds` 为设置区等级列表 id 顺序时，分组按该顺序展示（与揭晓顺序无关）。
 */
export function renderResults(
  container: HTMLElement,
  entries: ResultEntry[],
  tierOrderIds?: readonly string[],
): void {
  if (entries.length === 0) {
    container.innerHTML = '<p class="results-empty">还没有揭晓的号码哦～</p>';
    return;
  }

  const byTier = new Map<string, { name: string; rows: ResultEntry[] }>();
  for (const e of entries) {
    const key = e.tierId;
    if (!byTier.has(key)) {
      byTier.set(key, { name: e.tierName, rows: [] });
    }
    byTier.get(key)!.rows.push(e);
  }

  let orderedIds: string[];
  if (tierOrderIds && tierOrderIds.length > 0) {
    const seen = new Set<string>();
    orderedIds = [];
    for (const id of tierOrderIds) {
      if (byTier.has(id)) {
        orderedIds.push(id);
        seen.add(id);
      }
    }
    const extra = [...byTier.keys()].filter((id) => !seen.has(id)).sort();
    orderedIds.push(...extra);
  } else {
    orderedIds = [...byTier.keys()];
  }

  const parts: string[] = [];
  for (const tid of orderedIds) {
    const { name, rows } = byTier.get(tid)!;
    /** 同一等级内一排展示：无缺席的号码按揭晓顺序；有缺席补抽的，其当前号码排到该等级行末 */
    const head: string[] = [];
    const tail: string[] = [];
    for (const e of rows) {
      for (const n of e.voidedNumbers ?? []) {
        head.push(
          `<span class="num-chip num-chip--voided" title="已标记缺席">${escapeHtml(String(n))}</span>`,
        );
      }
      const safeId = escapeHtml(e.id);
      const cur =
        e.pendingAbsentRedraw === true
          ? `<span class="num-chip num-chip--pending" title="补抽揭晓中" aria-live="polite">···</span>`
          : `<button type="button" class="num-chip num-chip--current" data-result-id="${safeId}" title="点击标记缺席并补抽新号码" aria-label="当前号码，点击标记缺席并补抽">${escapeHtml(String(e.number))}</button>`;
      if ((e.voidedNumbers?.length ?? 0) > 0) {
        tail.push(cur);
      } else {
        head.push(cur);
      }
    }
    const chipsHtml = head.join('') + tail.join('');
    parts.push(`
      <div class="result-group">
        <h3 class="result-tier-name">${escapeHtml(name)}</h3>
        <div class="result-chips">${chipsHtml}</div>
      </div>
    `);
  }
  container.innerHTML = parts.join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 在 `#tier-list` 上委托 click：上移 / 下移 / 删除（至少保留一行）。
 * 避免为每行动态绑定监听器。
 */
export function bindTierListActions(list: HTMLElement): void {
  list.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const row = t.closest('.tier-row') as HTMLLIElement | null;
    if (!row) return;

    if (t.classList.contains('tier-remove')) {
      if (list.querySelectorAll('.tier-row').length <= 1) return;
      row.remove();
      return;
    }
    if (t.classList.contains('tier-up')) {
      const prev = row.previousElementSibling;
      if (prev) list.insertBefore(row, prev);
      return;
    }
    if (t.classList.contains('tier-down')) {
      const next = row.nextElementSibling;
      if (next) list.insertBefore(next, row);
    }
  });
}
