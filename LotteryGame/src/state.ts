/**
 * 核心业务数据类型与默认配置。
 * 与 DOM 无关；抽奖规则校验与队列逻辑见 draw.ts，界面见 ui.ts。
 */

/** 该等级每批揭晓：自动连续或手动点击「下一批」推进 */
export type DrawMode = 'manual' | 'auto';

/**
 * 号码滚动阶段的停止方式（与 drawMode 独立）。
 * auto：滚动固定时长后自动落定；manual：滚动至用户点击「停止」再落定。
 */
export type RollStopMode = 'manual' | 'auto';

/** 单个中奖等级：名称、人数、揭晓方式、每批数量与滚动停止方式 */
export type PrizeTier = {
  /** 行级唯一标识，由 createId() 生成，删除行后 id 不会复用给其它逻辑依赖 */
  id: string;
  /** 展示用等级名，如「一等奖」 */
  name: string;
  /** 该等级需要抽取的中奖人数（正整数语义，表单可能读出小数时再 floor） */
  count: number;
  /** 自动：按间隔连续揭晓；手动：每批前需点击「抽取本批」（首批在点「开始抽奖」后立即进行） */
  drawMode: DrawMode;
  /** 每一批同时揭晓几个号码（1 ～ 该等级人数） */
  batchSize: number;
  /** 滚动动画：自动到时停止，或手动点「停止」再揭晓结果 */
  rollStopMode: RollStopMode;
};

/**
 * 抽奖阶段枚举（预留）。
 * 当前实现主要通过 AbortController 与按钮 disabled 表达「抽奖中」，未单独维护该状态机。
 */
export type DrawPhase = 'idle' | 'drawing' | 'completed';

/** 一条已揭晓的中奖记录：对应哪个等级、抽中的号码 */
export type ResultEntry = {
  /** 单条记录唯一 id，用于缺席补抽等操作 */
  id: string;
  /** 所属等级 id */
  tierId: string;
  /** 所属等级名称（展示用） */
  tierName: string;
  /** 当前有效号码（补抽后更新） */
  number: number;
  /** 因缺席作废的号码，仅作置灰展示 */
  voidedNumbers?: number[];
  /** 缺席补抽动画进行中：结果区当前位显示占位，揭晓后清除 */
  pendingAbsentRedraw?: boolean;
};

/** 生成短随机字符串，用作 PrizeTier.id 或列表行 data-tier-id */
export function createId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** 首次进入页面或「恢复默认」时使用的三条等级示例数据 */
export const defaultTiers = (): PrizeTier[] => [
  { id: createId(), name: '一等奖', count: 1, drawMode: 'manual', batchSize: 1, rollStopMode: 'manual' },
  { id: createId(), name: '二等奖', count: 3, drawMode: 'manual', batchSize: 1, rollStopMode: 'manual' },
  { id: createId(), name: '三等奖', count: 5, drawMode: 'manual', batchSize: 1, rollStopMode: 'manual' },
];
