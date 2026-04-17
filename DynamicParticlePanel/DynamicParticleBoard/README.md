# DynamicParticleBoard

> Canvas 粒子动态背景组件化重构学习项目

通过将 `OriginProject` 中的原始粒子背景 Demo 改造成 `Vue 3 + Vite` 工程，深入理解 Canvas 动画、粒子网络交互，以及前端组件化拆分的实际落地方式。

## 🎯 学习目标

- 理解 Canvas 2D 动画循环的基本组织方式
- 掌握粒子节点、连线阈值、鼠标扰动之间的关系
- 学习如何把旧式 HTML 内联脚本重构为 Vue 3 组件结构
- 练习使用 composable 管理动画生命周期与事件监听
- 观察粒子网络这类视觉 Demo 在性能和结构上的取舍

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 查看效果

运行开发命令后，在浏览器打开终端提示的本地地址，即可看到全屏粒子背景和左上角控制面板效果。

## 📁 项目结构

```text
DynamicParticleBoard/
├── public/
│   └── icon.png                    # 页面图标
├── src/
│   ├── App.vue                     # 页面状态、参数校验与重建触发
│   ├── main.js                     # 应用入口
│   ├── components/
│   │   ├── ControlPanel.vue        # 参数输入与模式切换面板
│   │   └── ParticleCanvas.vue      # Canvas 容器组件
│   ├── composables/
│   │   └── useParticleNetwork.js   # 动画生命周期与渲染调度
│   ├── constants/
│   │   └── defaults.js             # 默认参数与提示文案
│   ├── styles/
│   │   └── global.css              # 全局基础样式
│   └── utils/
│       └── particleCore.js         # 粒子生成、连线和运动规则
├── index.html                      # 页面挂载入口
├── package.json                    # 项目脚本与依赖
└── vite.config.js                  # Vite 配置
```

## 🎯 支持的功能

### 粒子背景效果

| 功能 | 说明 | 实现方式 |
|------|------|----------|
| 粒子生成 | 随机生成指定数量的粒子节点 | `buildNodes` |
| 粒子运动 | 粒子在画布内移动并碰到边界反弹 | `moveNodes` |
| 动态连线 | 粒子距离足够近时自动连线 | `buildEdges` + `getEdgeLength` |
| 鼠标扰动 | 鼠标移动时影响附近粒子的运动方向 | 隐藏节点跟随鼠标 + 距离判断 |
| 模式切换 | 支持正常模式与鬼畜模式 | `type` + 绘制时颜色分支 |
| 参数调节 | 支持实时调整点数和速度 | 控制面板 + 重建 token |

### 控制面板能力

- 点数范围：`1-200`
- 速度范围：`1-10`
- 模式切换：`正常` / `鬼畜`
- 输入校验：越界时显示提示，不覆盖当前有效状态

## 🎨 粒子系统规则

### 节点生成规则

- 实际节点数是 `nodeNum + 1`
- 额外的第一个节点不参与绘制，只作为鼠标扰动源
- 节点初始位置、速度、半径都带有随机性

### 连线规则

- 连线阈值与画布宽度绑定，规则为 `width / 8`
- 只保留每对节点的一条无向边，避免重复计算
- 连线长度越接近阈值，透明度和线宽越低

### 鼠标扰动规则

- 鼠标并不直接拖动所有粒子
- 系统通过一个隐藏节点插值跟随鼠标
- 粒子靠近鼠标时会发生速度方向反转，远离鼠标时保持边界反弹逻辑

### 视觉模式

- **正常模式**：白色粒子与白色连线
- **鬼畜模式**：绘制阶段随机取色，形成闪烁的彩色效果

## ⚙️ 配置说明

### 默认参数

在 `src/constants/defaults.js` 中可以查看和调整默认配置：

```javascript
export const DEFAULT_NODE_NUM = 100
export const DEFAULT_SPEED = 1
export const MIN_NODE_NUM = 1
export const MAX_NODE_NUM = 200
export const MIN_SPEED = 1
export const MAX_SPEED = 10
```

### 提示文案

```javascript
export const TIP_INVALID_NODE_NUM = '请输入 1-200 的值'
export const TIP_INVALID_SPEED = '请输入 1-10 的值'
export const TIP_BUILDING = '生成中...'
export const TIP_SWITCHING = '版本切换中...'
```

### 运行参数更新方式

- `App.vue` 维护 `nodeNum`、`speed`、`type` 等页面状态
- 参数合法变更后，通过递增 `rebuildToken` 触发画布侧重建
- `useParticleNetwork.js` 监听 `rebuildToken` 后重新生成节点和边

## 🔧 开发指南

### 核心模块

1. **App.vue**
   - 管理页面级状态
   - 负责参数校验与提示显示
   - 通过 `rebuildToken` 隔离 UI 事件与底层重建逻辑

2. **ControlPanel.vue**
   - 管理输入框本地显示值
   - 将点数、速度、模式变化通过事件抛给父组件
   - 保证非法输入只提示，不立刻污染有效状态

3. **ParticleCanvas.vue**
   - 提供 `canvas` 节点引用
   - 将运行参数集中交给 `useParticleNetwork`

4. **useParticleNetwork.js**
   - 负责画布初始化、首帧渲染与动画循环
   - 注册并清理 `resize`、`mousemove` 事件
   - 管理节点、边和鼠标位置这类组件私有运行状态

5. **particleCore.js**
   - 提供粒子系统相关的纯函数
   - 包含节点生成、连线构建、距离判断、样式生成等规则

### 重构价值

这个项目最值得学习的部分，不只是粒子效果本身，而是如何把原始 Demo 从“全局变量 + 内联脚本”拆成更清晰的前端工程结构：

- 页面状态与 Canvas 状态分离
- 渲染生命周期与数学规则分离
- 组件职责与纯算法分离

### 可继续扩展的方向

- 增加粒子大小、背景色、连线阈值等可配置项
- 为移动端补充 `pointer` / `touch` 事件支持
- 引入 TypeScript 描述节点和边的数据结构
- 为高粒子数量场景尝试 `OffscreenCanvas` 或 Worker 优化

## 📚 技术收获

- **Canvas 2D API**：画布绘制、路径渲染、透明度控制
- **动画循环**：`requestAnimationFrame` 驱动的持续更新
- **Vue 3 组件化**：`script setup`、父子通信、响应式状态管理
- **Composition API**：用 composable 封装动画生命周期
- **前端重构**：把旧 Demo 中的全局逻辑拆成模块化结构

## 🤝 贡献指南

欢迎通过 Issue 或 Pull Request 交流学习思路与改进建议。

建议保持以下基本约定：

- 尽量保持现有模块职责清晰
- 优先复用 `particleCore.js` 中的纯函数
- 修改交互规则时，注意同步检查控制面板与画布重建逻辑

## 📄 许可证

仓库根目录提供了 [LICENSE](../../LICENSE) 文件，当前为 MIT License。

## 🙏 致谢

感谢原始粒子背景 Demo 提供了可重构的学习样本，也感谢 Vue 和 Vite 提供了简洁的现代前端开发体验。

---

**注意**：这是一个学习性质的粒子背景项目，适合用来理解 Canvas 动画与 Vue 3 重构思路，不建议直接把当前实现当作高密度、高性能场景下的生产方案。
