# LearnTailwindCSS

> 简化版 Tailwind CSS 构建工具学习项目

通过实现一个迷你版的 Tailwind CSS 构建系统，深入理解原子化 CSS 的工作原理。

## 🎯 学习目标

- 理解原子化 CSS 的工作机制
- 掌握文件扫描和类名提取技术
- 学习 CSS 规则生成和优化
- 实践模块化的构建工具设计

## 🚀 快速开始

### 安装依赖

```bash
# 项目使用原生 Node.js，无需额外依赖
# 确保你的 Node.js 版本 >= 14.0.0
```

### 构建项目

```bash
# 运行构建脚本
node src/build.js
```

### 查看效果

打开 `demo/index.html` 文件在浏览器中查看生成的 CSS 效果。

## 📁 项目结构

```
learnTailwindCss/
├── demo/                    # 演示页面
│   └── index.html          # 测试页面，包含各种 CSS 类的使用示例
├── dist/                   # 构建输出目录
│   └── index.css           # 生成的 CSS 文件
├── src/                    # 源代码目录
│   ├── build.js            # 主构建脚本
│   ├── config.js           # 配置文件
│   ├── generateCss.js      # CSS 生成器
│   └── scanClasses.js      # 类名扫描器
├── 项目分析报告.md          # 详细的项目分析报告
└── package.json            # 项目配置文件
```

## 🎯 支持的功能

### 基础样式属性

| 类名前缀 | CSS 属性 | 示例 | 生成的 CSS |
|---------|---------|------|-----------|
| `p` | padding | `p-20` | `padding: 20px;` |
| `px` | padding-left, padding-right | `px-20` | `padding-left: 20px; padding-right: 20px;` |
| `py` | padding-top, padding-bottom | `py-20` | `padding-top: 20px; padding-bottom: 20px;` |
| `pt` | padding-top | `pt-20` | `padding-top: 20px;` |
| `pr` | padding-right | `pr-20` | `padding-right: 20px;` |
| `pb` | padding-bottom | `pb-20` | `padding-bottom: 20px;` |
| `pl` | padding-left | `pl-20` | `padding-left: 20px;` |
| `m` | margin | `m-20` | `margin: 20px;` |
| `mx` | margin-left, margin-right | `mx-20` | `margin-left: 20px; margin-right: 20px;` |
| `my` | margin-top, margin-bottom | `my-20` | `margin-top: 20px; margin-bottom: 20px;` |
| `mt` | margin-top | `mt-20` | `margin-top: 20px;` |
| `mr` | margin-right | `mr-20` | `margin-right: 20px;` |
| `mb` | margin-bottom | `mb-20` | `margin-bottom: 20px;` |
| `ml` | margin-left | `ml-20` | `margin-left: 20px;` |
| `fs` | font-size | `fs-30` | `font-size: 30px;` |
| `c` | color | `c-red` | `color: red;` |
| `bgC` | background-color | `bgC-black` | `background-color: black;` |
| `lh` | line-height | `lh-x1` | `line-height: 1;` |

### 变体支持

#### 伪类变体
```html
<div class="hover:c-white">悬停时文字变白色</div>
```

#### 响应式变体
```html
<div class="xl:c-blue">大屏幕时文字变蓝色</div>
```

#### 组合变体
```html
<div class="hover:bgC-red">悬停时背景变红色</div>
```

## 🎨 设计令牌

### 尺寸令牌
- 支持 0-100px 的像素值
- 示例：`p-0`, `p-10`, `p-50`, `p-100`

### 颜色令牌
- `white`, `black`, `gray`, `red`, `blue`, `green`
- 示例：`c-red`, `bgC-blue`

### 行高令牌
- `x0` → 0
- `x1` → 1
- `x1-1` → 1.1
- `x1-2` → 1.2
- `x2` → 2

### 媒体查询断点
- `sm` → 640px
- `md` → 768px
- `lg` → 1024px
- `xl` → 1280px

## ⚙️ 配置说明

### 扫描配置
在 `src/config.js` 中可以配置：

```javascript
export const content = {
    paths: ["demo"],           // 扫描路径
    extensions: [              // 支持的文件扩展名
        "html", "js", "jsx", "vue", "svelte", "ts", "tsx"
    ],
    ignoredDirectories: [       // 忽略的目录
        "dist", "node_modules", ".git"
    ]
};
```

### 自定义配置
你可以通过修改 `config.js` 来自定义：
- 设计令牌值
- CSS 属性映射
- 媒体查询断点
- 扫描路径和文件类型

## 🔧 开发指南

### 核心模块

1. **scanClasses.js** - 类名扫描器
   - 递归扫描指定目录的文件
   - 提取所有 class 和 className 属性中的类名
   - 支持多种类名写法

2. **generateCss.js** - CSS 生成器
   - 解析类名变体（伪类、媒体查询）
   - 匹配 CSS 属性映射
   - 生成最终的 CSS 规则

3. **config.js** - 配置管理
   - 设计令牌定义
   - CSS 属性映射表
   - 扫描配置

4. **build.js** - 构建脚本
   - 协调整个构建流程
   - 输出 CSS 文件
   - 错误处理和警告

### 扩展功能

#### 添加新的 CSS 属性
```javascript
// 在 config.js 中添加
export const cssPrefixEnum = {
    // 现有属性...
    w: ["width"],           // 宽度
    h: ["height"],          // 高度
    d: ["display"]          // 显示属性
};
```

#### 添加新的设计令牌
```javascript
// 在 config.js 中添加
export const spacingScale = {
    'xs': '4px',
    'sm': '8px',
    'md': '16px',
    'lg': '24px',
    'xl': '32px'
};
```


## 📚 技术收获

- **Node.js 文件系统操作**：文件读取、目录遍历、路径处理
- **正则表达式应用**：复杂文本匹配和类名解析
- **CSS 工程化**：原子化 CSS 原理和规则生成
- **模块化编程**：ES Modules 和配置驱动设计
- **构建工具设计**：扫描-生成-输出的完整流程

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

### 代码规范
- 使用 ES6+ 语法
- 添加适当的注释
- 保持代码风格一致

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢 Tailwind CSS 团队提供了优秀的设计理念，这个项目是为了学习和理解其工作原理而创建的简化版本。

---

**注意**: 这是一个学习项目，不建议在生产环境中使用。如需完整的 Tailwind CSS 功能，请使用官方版本。
