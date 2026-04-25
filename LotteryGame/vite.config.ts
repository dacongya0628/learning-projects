/**
 * Vite 构建配置。
 * - base: './'：资源使用相对路径，便于直接打开 dist/index.html（file://）。
 * - vite-plugin-singlefile：将 JS/CSS 内联进单个 HTML，与「单文件分发」目标一致。
 */
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    /** 相对路径，双击本地 HTML 时仍能加载内联/相对资源 */
    base: './',
    plugins: [
        /** 打包为单 HTML（脚本与样式内联） */
        viteSingleFile()
    ],
    server: {
        host: '0.0.0.0',
        open: true
    }
});
