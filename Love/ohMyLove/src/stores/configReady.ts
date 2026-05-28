import { defineStore } from 'pinia';

// 配置完成标记的取值：
// custom  表示使用 ConfigView 保存到 IndexedDB 的自定义资源。
// default 表示全部使用项目 public 目录里的默认资源。
// null    表示还没有完成配置，需要停留在配置页。
export type ReadyMode = 'custom' | 'default' | null;

// 这个 key 必须和 configPage.ts、userConfigStore.ts 保持一致。
const READY_KEY = 'proposalConfigReady';

/*
 * 配置状态 Store。
 *
 * 这个 Store 不保存照片、音乐等大资源，只保存“是否允许进入动画页”的轻量状态。
 * 真正的 Blob 数据仍然在 IndexedDB 里，由 resourceLoader 在动画启动时读取。
 */
export const useConfigReadyStore = defineStore('configReady', {
  state: () => ({
    mode: null as ReadyMode
  }),
  getters: {
    // 只要 mode 有值，就代表用户已经完成了启动前置配置。
    isReady: state => Boolean(state.mode)
  },
  actions: {
    // 从 localStorage 重新读取状态。路由守卫每次跳转前都会调用，保证状态最新。
    refresh() {
      try {
        this.mode = localStorage.getItem(READY_KEY) as ReadyMode;
      } catch (error) {
        console.warn('无法读取本地配置标记。', error);
        this.mode = null;
      }
    },
    // 主动设置启动模式。当前预留给 Vue 化后的逻辑使用，旧配置页仍直接写 localStorage。
    setMode(mode: Exclude<ReadyMode, null>) {
      localStorage.setItem(READY_KEY, mode);
      this.mode = mode;
    },
    // 清除启动标记，让用户重新回到配置页。
    clear() {
      localStorage.removeItem(READY_KEY);
      this.mode = null;
    }
  }
});
