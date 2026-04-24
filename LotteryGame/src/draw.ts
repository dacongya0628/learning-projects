/**
 * 抽奖数学与校验：区间、总人数校验、洗牌、不放回队列。
 * 不操作 DOM；由 main.ts 在抽奖流程中调用。
 */

import type { PrizeTier } from './state';

/**
 * 所有等级「人数」之和（对 count 做 floor 且与 0 取较大后再累加）。
 */
export function sumTierCounts(tiers: PrizeTier[]): number {
  return tiers.reduce((s, t) => s + Math.max(0, Math.floor(t.count)), 0);
}

/**
 * 校验当前配置是否允许开始抽奖。
 * @returns 若合法返回 null；否则返回面向用户的中文错误说明
 */
export function validateDraw(min: number, max: number, tiers: PrizeTier[]): string | null {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return '请输入有效的数字范围。';
  }
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return '号码范围请使用整数。';
  }
  if (min > max) {
    return '最小号码不能大于最大号码。';
  }
  const pool = max - min + 1;
  if (pool <= 0) {
    return '号码范围无效。';
  }
  if (tiers.length === 0) {
    return '请至少添加一个中奖等级。';
  }
  const total = sumTierCounts(tiers);
  if (total === 0) {
    return '请为等级设置至少 1 个中奖名额。';
  }
  // 不放回：总中奖人数不能超过候选号码个数
  if (total > pool) {
    return `中奖总人数（${total}）不能超过可选号码数量（${pool}）。`;
  }
  for (const t of tiers) {
    if (!t.name.trim()) {
      return '每个等级都需要填写名称。';
    }
    const c = Math.floor(t.count);
    if (c < 1) {
      return `等级「${t.name.trim() || t.name}」的中奖人数至少为 1。`;
    }
    const bs = Math.floor(Number(t.batchSize));
    if (!Number.isFinite(bs) || !Number.isInteger(bs)) {
      return `等级「${t.name.trim() || t.name}」的「每批数量」须为整数。`;
    }
    if (bs < 1) {
      return `等级「${t.name.trim() || t.name}」每批至少揭晓 1 个号码。`;
    }
    if (bs > c) {
      return `等级「${t.name.trim() || t.name}」每批数量不能大于该等级人数（${c}）。`;
    }
    if (t.drawMode !== 'manual' && t.drawMode !== 'auto') {
      return `等级「${t.name.trim() || t.name}」的揭晓方式无效。`;
    }
    if (t.rollStopMode !== 'manual' && t.rollStopMode !== 'auto') {
      return `等级「${t.name.trim() || t.name}」的滚动停止方式无效。`;
    }
  }
  return null;
}

/** 闭区间 [min, max] 上所有整数的升序数组 */
export function buildRange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let n = min; n <= max; n++) {
    out.push(n);
  }
  return out;
}

/**
 * Fisher–Yates 洗牌，返回新数组，不修改入参。
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成不放回抽奖队列：先 buildRange 再 shuffle。
 * main.ts 中通过 pop() 从尾部依次取号（与 shift 等价随机性，实现简单）。
 */
export function prepareDrawQueue(min: number, max: number): number[] {
  return shuffle(buildRange(min, max));
}
