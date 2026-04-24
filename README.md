# learning-projects
> 一个收集原生前端、Canvas 动效与小型构建工具练习的学习项目仓库。

这个仓库用于集中整理我在学习过程里完成的小项目。当前内容主要围绕前端基础、Canvas 交互动画以及轻量构建工具实现展开，每个子项目都尽量保持独立目录、独立 README 和独立运行方式，方便按主题逐个阅读和练习。

## 🎯 学习目标

- 通过多个小项目拆开练习不同方向的前端能力，而不是把所有内容混在一个大工程里
- 同时覆盖界面效果、动画实现、小游戏机制和构建工具思路
- 让每个子项目都能作为相对完整的学习样本单独阅读、运行和扩展
- 保留从"基础实现"到"结构拆分"的练习过程，方便后续回顾和迭代

## 🚀 快速开始

### 依赖说明

```bash
# 根目录没有统一的安装或构建步骤
# 请根据对应子项目 README 使用各自的运行方式
```

### 查看 / 运行项目

```bash
# 进入目标子项目目录
# 查看该目录下的 README.md
# 按子项目说明运行或直接在浏览器中打开入口文件
```

### 当前项目入口

- `AircraftWars`：直接在浏览器中打开 `AircraftWars/index.html`
- `DynamicParticlePanel`：直接在浏览器中打开 `DynamicParticlePanel/index.html`
- `TailwindCss`：在项目目录执行 `node src/build.js`，再打开 `demo/index.html` 查看结果

## 📁 项目结构

```text
learning-projects/
├── AircraftWars/          # 原生 JavaScript + Canvas 飞机大战练习
├── DynamicParticlePanel/  # 全屏粒子连线动画练习
├── TailwindCss/           # 简化版 Tailwind CSS 构建工具练习
├── LICENSE                # 仓库统一 MIT 许可证
└── README.md              # 仓库总览说明
```

## ✨ 当前收录项目

| 项目 | 主题 | 主要技术 | 查看方式 | 当前实现范围 |
|------|------|------|------|------|
| [AircraftWars](./AircraftWars/README.md) | 纵向射击小游戏 | HTML、CSS、原生 JavaScript、Canvas | 打开 `AircraftWars/index.html` | 已实现画布适配、玩家移动、自动开火、敌机生成、敌机子弹、碰撞爆炸、玩家受击与无敌、血条系统、动态难度、游戏结束弹窗、首页 UI |
| [DynamicParticlePanel](./DynamicParticlePanel/README.md) | 粒子连线动态背景 | HTML、CSS、原生 JavaScript、Canvas | 打开 `DynamicParticlePanel/index.html` | 已实现全屏粒子系统、距离连线、DPR 适配、窗口 resize 与网格分区优化 |
| [TailwindCss](./TailwindCss/README.md) | 简化版原子化 CSS 构建工具 | Node.js、ES Modules | 执行 `node src/build.js` 后查看 `demo/index.html` | 已实现类名扫描、CSS 规则生成、伪类/响应式变体和演示页面 |

## 🧠 仓库说明

### 子项目组织方式

- 每个子项目都使用独立目录保存源码、资源与文档
- 根目录 README 只负责总览和导航，具体实现细节以下层项目 README 为准
- 当前仓库没有统一的 monorepo 构建、测试或发布流程

### 当前内容侧重

- 目前收录项目主要集中在前端学习方向
- 其中 `AircraftWars` 和 `DynamicParticlePanel` 偏向 Canvas 可视化与动画机制
- `TailwindCss` 更偏向 Node.js 文件处理、类名扫描和 CSS 生成流程练习

## 🛠 开发指引

### 推荐阅读顺序

1. 先从上面的项目表选择感兴趣的主题
2. 再阅读对应子项目目录下的 `README.md`
3. 然后结合入口文件与源码目录继续向下阅读实现细节

### 后续新增项目时建议保持

- 新项目使用独立目录，不依赖仓库根目录的隐式运行环境
- 为每个子项目补齐单独的 `README.md`
- 在根目录 README 中同步补充项目名称、主题、技术栈与查看方式

## 📚 技术收获

- 可以通过一组体量较小的项目并行练习不同方向的工程基础
- 原生前端技术足够支撑很多教学型项目，包括动画、小游戏和工具雏形
- 把项目拆成独立目录后，更容易对比不同实现方式和不同技术主题
- 根目录总览文档能帮助后续维护时快速判断"仓库里现在到底有什么"

## 🤝 贡献指南

欢迎通过 Issue 或 Pull Request 交流这些学习项目的实现思路、指出文档问题，或补充新的练习方向。若你继续扩展仓库，建议优先保持目录命名、README 结构和项目说明方式的一致性。

## 📄 许可证

仓库根目录提供了 [MIT License](./LICENSE)，当前各子项目默认随仓库整体许可证一并分发。若后续将某个子项目独立拆分，建议再补充单项目级别的许可证说明。

## 🙏 致谢

感谢 HTML5 Canvas、浏览器原生事件与渲染能力、Node.js 文件系统能力，以及 Tailwind CSS 等优秀项目带来的学习素材和实现思路。

---

**注意**：这是一个持续补充中的学习项目集合仓库，当前更适合作为练习记录和代码阅读样本使用，而不是一个带统一工程规范与统一发布流程的成品仓库。
