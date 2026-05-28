import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

/*
 * Vue 应用入口。
 *
 * 这里只负责装配全局能力，不写业务逻辑：
 * 1. createPinia() 提供配置状态管理。
 * 2. router 提供配置页和动画页之间的切换。
 * 3. mount('#app') 把整个 Vue 应用挂到 index.html 的根节点上。
 *
 * 注意：页面 CSS 没有在这里统一引入，而是放到各自的 View 里。
 * 这样可以避免 Config 页面和 Animation 页面互相污染样式。
 */
createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app');
