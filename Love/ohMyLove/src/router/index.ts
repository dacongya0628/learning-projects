import { createRouter, createWebHashHistory } from 'vue-router';
import { useConfigReadyStore } from '../stores/configReady';

/*
 * 路由配置。
 *
 * 这里使用 hash history，是为了让构建后的静态文件更容易部署：
 * 服务器不需要额外配置 history fallback，直接访问 index.html 后，
 * #/config 和 #/animation 都能由前端接管。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        // 首页根据本地配置状态决定进入配置页还是动画页。
        // proposalConfigReady 由 ConfigView 里的旧配置逻辑写入。
        const mode = localStorage.getItem('proposalConfigReady');
        return mode ? '/animation' : '/config';
      }
    },
    {
      path: '/config',
      name: 'config',
      // 懒加载配置页，让动画页相关代码不在首屏配置阶段提前执行。
      component: () => import('../views/ConfigView.vue')
    },
    {
      path: '/animation',
      name: 'animation',
      // 动画页会导入大量 canvas/音频/照片墙逻辑，所以同样保持懒加载。
      component: () => import('../views/AnimationView.vue')
    }
  ]
});

/*
 * 进入动画页前的保护。
 *
 * 如果用户还没有保存自定义配置，也没有选择“全部使用默认资源”，
 * 就不允许直接进入动画页，避免动画启动后缺少必要资源。
 */
router.beforeEach(to => {
  const readyStore = useConfigReadyStore();
  readyStore.refresh();

  if (to.name === 'animation' && !readyStore.isReady) {
    return { name: 'config' };
  }

  return true;
});

export default router;
