# 大葱鸭随机抽奖机
> 一个基于 Vite + TypeScript 的单页随机抽奖应用。

支持自定义号码区间、多个中奖等级及各级人数、**不放回抽取**（同一人不会中两次），中奖号码按等级顺序 **一个一个** 揭晓，并带有滚动闪动与落定动画。界面为响应式布局，适配手机与 PC。

## 🎯 学习目标

- 理解 Vite + TypeScript 单页应用的工程化组织方式
- 练习用 `AbortController` 管理异步流程的取消
- 掌握 Fisher–Yates 洗牌算法与不放回抽样实现
- 熟悉 `requestAnimationFrame` 驱动的滚动动画与 CSS `@keyframes` 配合
- 通过模块拆分（类型、逻辑、UI、流程）练习 TypeScript 项目结构设计

## 🚀 快速开始

### 依赖说明

```bash
# 需要 Node.js 18+（建议 LTS）
```

### 运行项目

```bash
# 安装依赖
npm install

# 本地开发（热更新）
npm run dev

# 生产构建（输出到 dist/）
npm run build

# 预览构建结果
npm run preview
```

项目入口文件是 `index.html`，开发时访问 `http://localhost:5173`，构建后可直接双击 `dist/index.html` 打开。

### 查看效果 / 验证方式

- 设置号码范围（如 1~100）和多个中奖等级（如一等奖 1 人、二等奖 3 人）
- 点击「进入抽奖舞台」切换到舞台视图
- 点击「开始抽奖」后，号码会滚动闪烁再落定揭晓
- 中奖记录会同步显示在右侧/下方结果区
- 可随时「重置本轮」清空结果，或「返回抽奖设置」修改配置

## 📁 项目结构

```text
LotteryGame/
├── index.html              # 页面入口（仅含 #app 挂载点）
├── package.json            # 依赖、脚本、版本号
├── tsconfig.json           # TypeScript 编译配置
├── vite.config.ts          # Vite 构建配置（base、单文件插件）
├── public/                 # 静态资源（favicon 等）
├── src/
│   ├── main.ts             # 应用入口：流程控制、事件绑定、抽奖主循环
│   ├── state.ts            # 类型定义（PrizeTier、ResultEntry）与默认数据
│   ├── draw.ts             # 校验、洗牌、不放回队列生成
│   ├── ui.ts               # DOM 挂载、表单读写、揭晓动画、结果渲染
│   ├── styles.css          # 全局样式、响应式布局、舞台动画
│   └── version.ts          # 页脚版本号
├── dist/                   # npm run build 产物（可双击运行）
├── README.md               # 功能说明与使用方式
├── 使用者说明.md            # 最终用户本地运行指南
└── 开发说明.md              # 架构、源码与算法说明
```

## ✨ 已实现能力

| 能力 | 说明 | 代码位置 |
|------|------|------|
| 号码范围设置 | 自定义最小/最大号码（整数闭区间），所有号码构成奖池 | `src/ui.ts`、`src/main.ts` |
| 多等级抽奖 | 可添加多个中奖等级，每级独立设置名称、人数、揭晓方式 | `src/state.ts`、`src/ui.ts` |
| 等级排序 | 通过 ↑/↓ 按钮调整等级抽取顺序 | `src/ui.ts` |
| 不放回抽取 | 同一号码在整轮抽奖中最多出现一次 | `src/draw.ts` |
| 两步流程 | 设置页 → 舞台页，两阶段独立布局 | `src/main.ts`、`src/ui.ts` |
| 滚动揭晓动画 | 号码滚动闪烁后落定，支持自动停和手动停两种模式 | `src/ui.ts` |
| 批量揭晓 | 每批可同时揭晓多个号码，适配大人数等级 | `src/ui.ts` |
| 缺席补抽 | 已中奖者可标记缺席并补抽新号码 | `src/main.ts` |
| 中奖记录 | 按等级分组展示所有已揭晓号码 | `src/ui.ts` |
| 响应式布局 | 宽屏左右并排，窄屏上下排列 | `src/styles.css` |
| 单文件构建 | 构建产物内联为单 HTML，可双击直接运行 | `vite.config.ts` |

## 🧠 设计要点

### 抽奖算法

- 使用 Fisher–Yates 洗牌算法将整个号码区间打乱，生成不放回队列
- 每次从队列尾部 `pop()` 取号，保证每个号码在整个抽奖过程中最多出现一次
- 校验逻辑确保总中奖人数不超过号码区间大小

### 异步流程控制

- 使用 `AbortController` 管理抽奖流程的取消（重置本轮、返回设置）
- `runLottery` 主循环通过 `async/await` 串联每批揭晓动画
- 手动模式下通过回调函数（`manualAdvance`、`stopRollResolver`）等待用户操作

### 揭晓动画

- 滚动阶段使用 `requestAnimationFrame` 在 `[min, max]` 区间内随机显示数字
- 落定后通过 CSS `@keyframes` 触发弹跳动画（`landBounce`）
- 粒子层通过 `burst` class 做一次短粒子扩散效果

### 界面分层

- 设置阶段（`phase-setup`）和舞台阶段（`phase-stage`）通过 CSS class 切换显隐
- 所有 DOM 操作集中在 `ui.ts`，业务逻辑在 `main.ts`，纯计算在 `draw.ts`
- 类型定义集中在 `state.ts`，与 DOM 无关

## 🛠 开发指引

### 核心模块

1. `src/main.ts`
   负责初始化页面、绑定事件、驱动抽奖主循环，以及异步流程的取消管理。
2. `src/draw.ts`
   负责号码区间生成、洗牌、校验逻辑，不操作 DOM。
3. `src/ui.ts`
   负责 DOM 挂载、表单读写、揭晓动画、结果渲染和 UI 锁定状态管理。
4. `src/state.ts`
   提供核心数据类型（`PrizeTier`、`ResultEntry`）和默认配置。

### 适合继续扩展的方向

- 持久化配置/结果到 `localStorage`
- 增加导出中奖结果（CSV/图片）
- 增加音效和更丰富的动画效果
- 国际化支持（抽离文案为字典）
- 部署到服务器时调整 `base` 路径

## 📚 技术收获

- 用 Vite + TypeScript 搭建一个完整的单页应用
- 通过 `AbortController` 管理可取消的异步流程
- 实现 Fisher–Yates 洗牌算法与不放回抽样
- 体会「类型定义 → 纯逻辑 → UI 层 → 流程编排」的分层设计
- 为后续学习更复杂的 TypeScript 项目或前端工程化打基础

## 🤝 贡献指南

欢迎通过 Issue 或 Pull Request 交流学习思路、指出问题，或继续补充更多玩法。在扩展功能时，建议优先保持模块职责清晰，避免把类型、逻辑、UI 和流程混写在同一个文件里。

## 📄 许可证

MIT（可按需修改）。
