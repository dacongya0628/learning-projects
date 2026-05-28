import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/*
 * Vite 构建配置。
 *
 * base 使用 './'，这样 dist 中生成的 JS/CSS/静态资源引用都是相对路径。
 * 后续部署到服务器子目录时，不需要强依赖站点根路径。
 */
export default defineConfig({
  base: './',
  plugins: [vue()]
});
