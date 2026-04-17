# Dynamic Particle Board

> 基于 Canvas 的粒子动态背景学习项目

通过实现一个完整的粒子系统，深入理解 Canvas 动画与 Vue 3 组件化的结合使用。

## 🎯 学习目标

- 掌握 Canvas 2D API 的使用方法
- 理解 Vue 3 Composition API 的实践应用
- 学习粒子系统的算法实现
- 实践前端工程化和模块化设计

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
DynamicParticleBoard/
├── src/
│   ├── App.vue                 # 根组件，状态管理
│   ├── main.js                 # 应用入口
│   ├── components/             # Vue 组件
│   │   ├── ControlPanel.vue    # 控制面板组件
│   │   └── ParticleCanvas.vue  # Canvas 画布组件
│   ├── composables/            # 组合式函数
│   │   └── useParticleNetwork.js # 粒子网络逻辑
│   ├── utils/                  # 工具函数
│   │   └── particleCore.js     # 粒子核心算法
│   ├── constants/              # 常量定义
│   │   └── defaults.js         # 默认配置
│   └── styles/                 # 全局样式
│       └── global.css          # 基础样式
├── public/                     # 静态资源
├── dist/                       # 构建输出
├── package.json                # 项目配置
└── vite.config.js             # Vite 配置
```

## 🎯 核心功能

### 粒子系统特性

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 粒子运动 | 随机运动与边界反弹 | 速度向量 + 碰撞检测 |
| 鼠标交互 | 鼠标移动产生扰动效果 | 距离计算 + 方向反转 |
| 动态连线 | 粒子间距离连线 | 阈值判断 + 透明度渐变 |
| 双模式 | 正常/鬼畜模式切换 | 颜色渲染策略 |

### 控制面板功能

- **点数控制**：1-200 个粒子动态调节
- **速度控制**：1-10 级速度调节
- **模式切换**：正常模式 / 鬼畜模式
- **实时反馈**：参数修改即时生效

## 🎨 技术实现

### 粒子生成算法

```javascript
export function buildNodes({ nodeNum, speed, width, height }) {
  return Array.from({ length: nodeNum + 1 }, (_, index) => ({
    drivenByMouse: index === 0,  // 第一个节点作为鼠标扰动源
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.random() * speed - 0.1,
    vy: Math.random() * speed - 0.1,
    radius: Math.random() > 0.9 ? 3 + Math.random() * 3 : 1 + Math.random() * 3
  }))
}
```

### 连线渲染算法

```javascript
// 基于距离的动态连线
edges.forEach((edge) => {
  const length = getEdgeLength(edge)
  if (length > threshold) return  // 超过阈值不绘制
  
  ctx.strokeStyle = getEdgeStrokeStyle(type)
  ctx.lineWidth = (1 - length / threshold) * 2.5
  ctx.globalAlpha = 1 - length / threshold
  // 绘制连线...
})
```

### 鼠标交互算法

```javascript
export function moveNodes({ nodes, mousePos, width, height }) {
  const threshold = getThreshold(width)
  
  nodes.forEach((node) => {
    const distance = getNodeDistance(node, mousePos, width)
    
    if (distance > threshold) {
      // 远离鼠标：边界反弹
      if (node.x <= 0 || node.x >= width) node.vx *= -1
      if (node.y <= 0 || node.y >= height) node.vy *= -1
    } else {
      // 靠近鼠标：方向反转产生扰动
      if ((node.x > mousePos.x && node.vx > 0) || 
          (node.x < mousePos.x && node.vx < 0)) {
        node.vx *= -1
      }
    }
  })
}
```

## ⚙️ 配置说明

### 默认参数

在 `src/constants/defaults.js` 中可以配置：

```javascript
export const DEFAULT_NODE_NUM = 100    // 默认粒子数量
export const DEFAULT_SPEED = 1         // 默认速度
export const MIN_NODE_NUM = 1          // 最小粒子数
export const MAX_NODE_NUM = 200        // 最大粒子数
export const MIN_SPEED = 1             // 最小速度
export const MAX_SPEED = 10            // 最大速度
```

### 视觉模式

- **正常模式** (`TYPE_NORMAL = 1`)：白色粒子和连线
- **鬼畜模式** (`TYPE_CHAOS = 2`)：随机彩色粒子和连线

## 🔧 核心模块

### 1. 状态管理 (`App.vue`)
- 响应式状态定义
- 组件间通信
- 参数验证与提示系统

### 2. 控制面板 (`ControlPanel.vue`)
- 表单输入处理
- 本地显示值管理
- 用户交互反馈

### 3. Canvas 渲染 (`ParticleCanvas.vue`)
- Canvas 元素引用
- 计算属性优化
- 参数传递

### 4. 粒子系统 (`useParticleNetwork.js`)
- 动画生命周期管理
- Canvas 上下文操作
- 事件监听器管理

### 5. 核心算法 (`particleCore.js`)
- 粒子运动计算
- 距离判断逻辑
- 渲染样式生成

## 📚 技术收获

- **Canvas 2D API**：图形绘制、动画循环、上下文管理
- **Vue 3 Composition API**：响应式系统、组合式函数、生命周期
- **数学算法**：向量运算、距离计算、碰撞检测
- **前端工程化**：模块化设计、组件化架构、性能优化

## 🛠️ 扩展练习

### 基础扩展
- 添加粒子大小控制参数
- 实现颜色主题切换
- 增加连线距离阈值调节

### 进阶挑战
- 集成 Web Workers 优化性能
- 添加粒子轨迹效果
- 实现重力物理模拟

### 架构升级
- 迁移到 TypeScript
- 集成状态管理器
- 适配组件库

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 遵循 Vue 3 最佳实践
- 添加必要的注释
- 保持代码简洁清晰

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为前端技术发展做出贡献的开发者们！

---

**注意**: 这是一个学习项目，旨在帮助理解 Canvas 动画与 Vue 3 的结合使用。