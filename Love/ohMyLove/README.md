# Oh My Love

这是当前求婚动画项目的 Vue 3 改版目录。上一级目录中的静态文件仍保留不动，本目录可以作为 Vue 项目根目录独立维护。

## 技术栈

- Vue 3
- TypeScript
- Pinia
- Vue Router
- Vite

## 目录说明

- `src/views/ConfigView.vue`：配置页，承载照片、音乐、歌词、标题和最终文案配置。
- `src/views/AnimationView.vue`：动画页，承载开始按钮、加载进度和动画入口。
- `src/animation/AnimationController.ts`：动画总控制器，负责串联资源加载、音乐、爱心动画、心电图和 3D 照片墙。
- `src/effects`：从原始静态实现迁移过来的动画效果模块。
- `src/config/config.ts`：动画参数和默认资源配置。
- `src/stores`：Pinia 状态。
- `src/router`：路由配置。
- `public`：默认照片、字体、音乐等静态资源。

## 本地命令

```bash
npm install
npm run build
```

如需本地调试，再运行：

```bash
npm run dev
```

## 部署

生产构建产物会输出到 `dist`。部署时，把 `ohMyLove/dist` 里的文件上传到服务器站点目录即可。

前端项目的源码无法做到对访问者绝对不可见，生产构建只会输出压缩后的 JS/CSS。如果后续要进一步降低源码可读性，可以在构建阶段再加混淆插件。
