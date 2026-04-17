// Vue 只负责控制层状态与提示，不直接接管 canvas 内部数据结构。
var app = new Vue({
    el: '.wrapper',
    data: {
        canvasEl: null,
        ctx: null,
        nodes: [], // 需要渲染的节点数据
        speed: 1, // 初始速度
        nodeNum: 200, // 需要渲染的初始化节点数量


        maxDistance: 100, // 节点连线阈值
        cellSize: 100, // 网格大小默认和连线阈值保持一致
        grid: new Map(), // 网格容器key = "col,row"，value = 粒子数组,
        directions: [  // 定义“邻居格子方向”
            [0, 0],   // 自己 
            [1, 0],   // 右
            [-1, 0],  // 左
            [0, 1],   // 下
            [0, -1],  // 上
            [1, 1],   // 右下
            [1, -1],  // 右上
            [-1, 1],  // 左下
            [-1, -1], // 左上
        ],
        mousePos: {
            x: null,
            y: null
        },// 鼠标位置
    },
    created() {
        this.$nextTick(() => {
            this.canvasEl = document.getElementById("canvas");
            this.ctx = this.canvasEl.getContext("2d");
            this.init()
            this.buildGrid();
            console.log(this.grid.entries())
            window.requestAnimationFrame(this.star)
        })
    },
    mounted() {
    },
    watch: {
    },
    methods: {
        // 初始化数据
        init() {
            this.resizeCanvas()
            window.addEventListener('resize', this.resizeCanvas);
            this.createNodes();
        },
        // 设置canvas宽高
        resizeCanvas() {
            // 获取设备的像素比，默认为 1
            const dpr = window.devicePixelRatio || 1;
            // 获取窗口的 CSS 尺寸
            const displayWidth = document.body.clientWidth;
            const displayHeight = document.body.clientHeight;
            // 设置 Canvas 的实际渲染尺寸（物理像素）这是解决模糊问题的关键
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
        },
        // 创建节点
        createNodes() {
            this.nodes = Array.from({ length: this.nodeNum }, (_, index) => ({
                id: index + 1,
                x: Math.random() * this.canvasEl.width,
                y: Math.random() * this.canvasEl.height,
                vx: (Math.random() * 2 - 1) * this.speed,
                vy: (Math.random() * 2 - 1) * this.speed,
                radius: Math.random() * 3 + 1
            }))
        },
        // 节点运动
        nodeMove() {
            this.nodes.forEach((item, index) => {
                item.x += item.vx;
                item.y += item.vy;
                // 边界判断回弹
                const clamp = (value, min, max) => {
                    return Math.min(Math.max(value, min), max)
                }
                const r = item.radius || 0;
                const w = this.canvasEl.width;
                const h = this.canvasEl.height;
                // x轴判断
                // 1. 检测是否撞墙（左 或 右）
                const hitLeft = item.x - r <= 0;
                const hitRight = item.x + r >= w;
                if (hitLeft || hitRight) {
                    item.vx *= -1;
                    item.x = clamp(item.x, r, w - r);
                }
                // y轴判断
                const hitTop = item.y - r <= 0;
                const hitBottom = item.y + r >= h;
                if (hitTop || hitBottom) {
                    item.vy *= -1;
                    item.y = clamp(item.y, r, h - r);
                }
            })
        },

        // 映射坐标到对应的网格
        getCellKey(x, y) {
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            // 返回字符串作为 key，比如 "1,0"
            return `${col},${row}`
        },
        // 创建网格
        buildGrid() {
            this.grid.clear();
            for (const node of this.nodes) {
                const key = this.getCellKey(node.x, node.y)
                // 如果这个格子还不存在，就创建一个数组
                if (!this.grid.has(key)) {
                    this.grid.set(key, [])
                }
                // 把粒子放进这个格子
                this.grid.get(key).push(node)
            }
        },
        // 根据网格分区绘制连接线
        drawLines() {
            const maxDistSq = this.maxDistance * this.maxDistance // 提前算好，避免开根号
            this.buildGrid();
            for (const [key, cellParticles] of this.grid.entries()) {
                // key = "col,row"，拆出来
                const [col, row] = key.split(',').map(Number);
                // 遍历“当前格子 + 周围8个格子”
                for (const [dxCell, dyCell] of this.directions) {
                    const neighborKey = `${col + dxCell},${row + dyCell}`
                    const neighborParticles = this.grid.get(neighborKey)
                    if (!neighborParticles) continue
                    for (const p1 of cellParticles) {
                        for (const p2 of neighborParticles) {
                            // 不和自己连线
                            if (p1 === p2) continue

                            // 避免重复连线（A→B 和 B→A）
                            if (p1.id >= p2.id) continue

                            // 计算距离（平方）
                            const dx = p1.x - p2.x
                            const dy = p1.y - p2.y
                            const distSq = dx * dx + dy * dy

                            // 如果距离小于阈值 → 画线
                            if (distSq < maxDistSq) {
                                // 透明度随距离变化（更好看）
                                const alpha = 1 - Math.sqrt(distSq) / this.maxDistance
                                this.ctx.beginPath()
                                this.ctx.moveTo(p1.x, p1.y)
                                this.ctx.lineTo(p2.x, p2.y)
                                this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`
                                this.ctx.stroke()
                            }
                        }
                    }
                }
            }
        },

        // 渲染函数
        rander() {
            // 绘制纯黑色背景画布
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            // 绘制节点
            this.nodes.forEach((item, index) => {
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(item.x, item.y, item.radius, 0, 2 * Math.PI);
                this.ctx.fill();
            });
            this.ctx.globalAlpha = 1.0;
        },


        // 动画开始
        star() {
            this.rander();
            this.nodeMove();
            this.drawLines();
            window.requestAnimationFrame(this.star)
        }
    }
})