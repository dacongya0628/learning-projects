# 快乐的大葱鸭背景页

这是一个纯静态页面，直接打开 `index.html` 就能运行，不需要安装依赖或启动构建工具。

## 文件结构

- `index.html`：页面结构，只保留中心文案和几个视觉图层。
- `css/style.css`：页面布局、暗角、标题样式、鼠标反色圆。
- `js/app.js`：canvas 字符墙、鼠标跟随、标题打字效果。

## 核心效果

1. Canvas 字符墙

   `js/app.js` 里用固定网格铺满屏幕，每个格子显示一个随机字符。每隔约 `50ms` 随机替换一小部分字符，形成类似原站的暗色字符噪声背景。

2. 鼠标白色圆形反色

   `css/style.css` 里的 `.cursor-orb` 使用 `mix-blend-mode: difference`。它覆盖到文字或背景的哪一部分，哪一部分就会发生像素级反色，所以半个字进入圆内时也会半个字变色。

3. 中心文案

   当前唯一可见文案是 `快乐的大葱鸭`。文案在 `js/app.js` 的 `typeTitle()` 函数里：

   ```js
   const text = "快乐的大葱鸭";
   ```

## 常用修改

- 改中心文案：修改 `js/app.js` 里的 `const text`。
- 改背景字符：修改 `glyphs`。
- 改背景颜色：修改 `palette`。
- 改鼠标圆大小：修改 `.cursor-orb` 的 `width` 和 `height`。
