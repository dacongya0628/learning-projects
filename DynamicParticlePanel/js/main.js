var app = {
    canvasEl: null, // canvas 元素
    ctx: null, // 2D 绘图上下文
    nodes: [], // 需要渲染的节点数据
    resizeFrame: 0, // resize 节流使用的动画帧 id
    animationFrame: 0, // 主动画循环的动画帧 id
    viewportWidth: 0, // 逻辑坐标系宽度，单位为 CSS 像素
    viewportHeight: 0, // 逻辑坐标系高度，单位为 CSS 像素
    dpr: 1, // 当前设备像素比
    speed: 1, // 初始速度
    nodeNum: 200, // 需要渲染的初始化节点数量
    maxDistance: 100, // 节点连线阈值
    cellSize: 100, // 网格大小默认和连线阈值保持一致
    grid: new Map(), // 网格容器 key = "col,row"，value = 粒子数组
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
    boundOnResize: null, // 绑定 this 后的 resize 处理函数
    boundLoop: null, // 绑定 this 后的主循环函数

    // 初始化画布、事件监听和动画循环
    init: function () {
        this.canvasEl = document.getElementById("canvas");
        this.ctx = this.canvasEl.getContext("2d");
        this.boundOnResize = this.onResize.bind(this);
        this.boundLoop = this.loop.bind(this);

        this.handleResize(true);
        window.addEventListener("resize", this.boundOnResize);
        this.animationFrame = window.requestAnimationFrame(this.boundLoop);
    },

    // 节流窗口变化，避免拖动窗口时频繁重算
    onResize: function () {
        if (this.resizeFrame) {
            window.cancelAnimationFrame(this.resizeFrame);
        }

        this.resizeFrame = window.requestAnimationFrame(() => {
            this.handleResize(false);
            this.resizeFrame = 0;
        });
    },

    // 窗口尺寸变化后同步重算画布和粒子位置
    handleResize: function (resetNodes) {
        const oldWidth = this.viewportWidth;
        const oldHeight = this.viewportHeight;
        const size = this.resizeCanvas();

        if (resetNodes || !this.nodes.length || !oldWidth || !oldHeight) {
            this.createNodes();
        } else {
            this.nodes = this.scaleNodesToViewport(
                this.nodes,
                oldWidth,
                oldHeight,
                size.width,
                size.height
            );
        }

        this.renderFrame();
    },

    // 设置 canvas 宽高，逻辑坐标保持 CSS 像素，物理像素交给 DPR
    resizeCanvas: function () {
        const displayWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const displayHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        this.viewportWidth = displayWidth;
        this.viewportHeight = displayHeight;
        this.dpr = dpr;
        this.canvasEl.width = Math.round(displayWidth * dpr);
        this.canvasEl.height = Math.round(displayHeight * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        return {
            width: displayWidth,
            height: displayHeight,
        };
    },

    // 按照新旧视口比例同步缩放粒子坐标
    scaleNodesToViewport: function (nodes, oldWidth, oldHeight, newWidth, newHeight) {
        if (!oldWidth || !oldHeight) {
            return nodes.slice();
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        return nodes.map((node) => ({
            id: node.id,
            x: node.x * scaleX,
            y: node.y * scaleY,
            vx: node.vx,
            vy: node.vy,
            radius: node.radius,
        }));
    },

    // 创建节点
    createNodes: function () {
        this.nodes = Array.from({ length: this.nodeNum }, (_, index) => ({
            id: index + 1,
            x: Math.random() * this.viewportWidth,
            y: Math.random() * this.viewportHeight,
            vx: (Math.random() * 2 - 1) * this.speed,
            vy: (Math.random() * 2 - 1) * this.speed,
            radius: Math.random() * 3 + 1,
        }));
    },

    // 创建网格
    buildGrid: function () {
        this.grid.clear();
        for (const node of this.nodes) {
            const key = this.getCellKey(node.x, node.y);
            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key).push(node);
        }
    },

    // 映射坐标到对应的网格
    getCellKey: function (x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return `${col},${row}`;
    },

    // 节点运动
    nodeMove: function () {
        const clamp = (value, min, max) => {
            return Math.min(Math.max(value, min), max);
        };

        this.nodes.forEach((item) => {
            item.x += item.vx;
            item.y += item.vy;

            const r = item.radius || 0;
            const w = this.viewportWidth;
            const h = this.viewportHeight;
            const hitLeft = item.x - r <= 0;
            const hitRight = item.x + r >= w;
            const hitTop = item.y - r <= 0;
            const hitBottom = item.y + r >= h;

            if (hitLeft || hitRight) {
                item.vx *= -1;
                item.x = clamp(item.x, r, w - r);
            }

            if (hitTop || hitBottom) {
                item.vy *= -1;
                item.y = clamp(item.y, r, h - r);
            }
        });
    },

    // 绘制当前粒子节点
    drawNodes: function () {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

        this.nodes.forEach((item) => {
            this.ctx.fillStyle = "#fff";
            this.ctx.beginPath();
            this.ctx.arc(item.x, item.y, item.radius, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    },

    // 根据网格分区绘制连接线
    drawLines: function () {
        const maxDistSq = this.maxDistance * this.maxDistance;

        this.buildGrid();
        for (const [key, cellParticles] of this.grid.entries()) {
            const [col, row] = key.split(",").map(Number);

            for (const [dxCell, dyCell] of this.directions) {
                const neighborKey = `${col + dxCell},${row + dyCell}`;
                const neighborParticles = this.grid.get(neighborKey);

                if (!neighborParticles) {
                    continue;
                }

                for (const p1 of cellParticles) {
                    for (const p2 of neighborParticles) {
                        if (p1 === p2 || p1.id >= p2.id) {
                            continue;
                        }

                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < maxDistSq) {
                            const alpha = 1 - Math.sqrt(distSq) / this.maxDistance;
                            this.ctx.beginPath();
                            this.ctx.moveTo(p1.x, p1.y);
                            this.ctx.lineTo(p2.x, p2.y);
                            this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
                            this.ctx.stroke();
                        }
                    }
                }
            }
        }
    },

    // 渲染整帧，节点与连线都基于同一份坐标
    renderFrame: function () {
        this.drawNodes();
        this.drawLines();
    },

    // 动画主循环：先更新状态，再绘制整帧
    loop: function () {
        this.nodeMove();
        this.renderFrame();
        this.animationFrame = window.requestAnimationFrame(this.boundLoop);
    },
};

app.init();
