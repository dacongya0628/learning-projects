// 游戏主控模块（单例对象）
// 职责：初始化画布、加载资源、启动游戏循环、碰撞调度
var Main = {
    canvasEl: null, // canvas 元素
    ctx: null, // 2D 绘图上下文
    viewportWidth: 0, // 逻辑坐标系宽度，单位为 CSS 像素
    viewportHeight: 0, // 逻辑坐标系高度，单位为 CSS 像素
    dpr: 1, // 当前设备像素比
    imgs: [], // 游戏所需要的图片数据
    plane: null, // 游戏中的飞机实例
    bullets: [], // 玩家子弹列表
    enemys: [], // 敌机列表
    enemyInterval: 300, // 敌机生成间隔时间（毫秒）
    lastEnemyTime: 0, // 上一次生成敌机的时间
    enemyBullets: [], // 敌机子弹列表
    explosions: [], // 爆炸特效列表
    killCount: 0, // 击杀敌机数量
    timer: null, // 游戏循环定时器（Timer 实例）
    isGameOver: false, // 游戏是否结束
    init() {
        // 获取 canvas 元素和 2D 绘图上下文
        this.canvasEl = Common.$("#canvas")
        this.ctx = this.canvasEl.getContext("2d");
        // 初始化画布尺寸
        this.resizeCanvas();
        // 加载游戏图片资源
        this.initImages();
        // 注册触摸移动事件（移动端控制）
        this.canvasEl.addEventListener('touchmove', (ev) => {
            this.touchmove(ev)
        })
    },
    // 设置 canvas 宽高，逻辑坐标保持 CSS 像素，物理像素交给 DPR
    resizeCanvas() {
        const displayWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const displayHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        this.viewportWidth = displayWidth;
        this.viewportHeight = displayHeight;
        this.dpr = dpr;
        // 物理像素 = CSS 像素 × DPR
        this.canvasEl.width = Math.round(displayWidth * dpr);
        this.canvasEl.height = Math.round(displayHeight * dpr);
        // 统一缩放，后续绘制代码无需关心 DPR
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return {
            width: displayWidth,
            height: displayHeight,
        };
    },
    // 清除画布
    clearRect() {
        this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight)
        this.ctx.globalAlpha = 1.0;
    },
    // 初始化游戏需要的图片数据
    initImages() {
        const imgUrls = ["images/plane.png", "images/diren.png", "images/fire.png", "images/fire2.png", 'images/baozha.png']
        const callback = (res) => {
            this.imgs = res;
        }
        Common.initImgs(imgUrls, callback)
    },
    // 初始化战机
    initPlane() {
        this.plane = new Plane(this.imgs[0], this.imgs[2], this.viewportWidth, this.viewportHeight, this.ctx,);
        this.plane.draw();
    },
    // 更新战机子弹
    updatePlaneBullets(controller, time) {
        const bullet = this.plane.update(controller, time, this.killCount)
        if (bullet) {
            this.bullets.push(bullet);
        }
    },
    // 自动生成敌机（按随机间隔，随击杀数动态加速）
    autoAddEnemy(time) {
        if (time - this.lastEnemyTime > this.enemyInterval) {
            const enemy = new Enemy(this.imgs[1], this.imgs[3], this.viewportWidth, this.viewportHeight, this.ctx);
            this.enemys.push(enemy)
            // 根据击杀数计算难度系数（每击杀 100 架提升一个难度等级）
            // 难度等级越高，敌机生成越快
            const difficultyLevel = Math.floor(this.killCount / 100);
            // 基础间隔范围：200ms ~ 1000ms
            // 每升一级，下限减 30ms，上限减 80ms（但下限不低于 50ms）
            const minInterval = Math.max(50, 200 - difficultyLevel * 30);
            const maxInterval = Math.max(minInterval + 100, 1000 - difficultyLevel * 80);
            this.enemyInterval = minInterval + Math.random() * (maxInterval - minInterval);
            this.lastEnemyTime = time;
        }
    },
    // 更新所有敌机（移动、射击、绘制）
    updateEnemy(time) {
        // 过滤已死亡的敌机
        this.enemys = this.enemys.filter(e => !e.isDead);
        this.enemys.forEach(item => {
            const bullet = item.update(time)
            if (bullet) {
                this.enemyBullets.push(bullet)
            }
            item.draw();
        })
    },
    // 更新子弹列表（移动 + 绘制 + 边界过滤）
    updateBulletsByList(list) {
        // 过滤已删除或超出边界的子弹
        this[list] = this[list].filter(b => {
            if (b.isDel) return false;
            if (b.y < -50 || b.y > this.viewportHeight + 50) {
                return false;
            }
            return true;
        });
        this[list].forEach(item => {
            item.update();
            item.draw();
        })
    },
    // 更新爆炸特效
    updateExplosions() {
        // 过滤已完成的爆炸
        this.explosions = this.explosions.filter(e => !e.isDone);
        this.explosions.forEach(e => {
            e.update();
            e.draw();
        });
    },
    // 绘制击杀计数（右上角）
    drawScore(ctx) {
        const ctx2 = this.ctx;
        const padding = 10;
        const fontSize = 13;
        const text = `💥 击杀 ${this.killCount}`;
        ctx2.font = `bold ${fontSize}px Arial, "Microsoft YaHei", sans-serif`;
        const textWidth = ctx2.measureText(text).width;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = 18;
        const boxX = this.viewportWidth - boxWidth - 16;
        const boxY = 14;

        // 半透明背景
        ctx2.save();
        ctx2.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx2.shadowBlur = 8;
        ctx2.shadowOffsetY = 2;
        ctx2.fillStyle = 'rgba(0, 0, 0, 0.45)';
        this.drawRoundRect(ctx2, boxX, boxY, boxWidth, boxHeight, 9);
        ctx2.fill();
        ctx2.restore();

        // 边框光效
        ctx2.save();
        ctx2.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx2.lineWidth = 1;
        this.drawRoundRect(ctx2, boxX, boxY, boxWidth, boxHeight, 9);
        ctx2.stroke();
        ctx2.restore();

        // 文字
        ctx2.save();
        ctx2.fillStyle = '#fff';
        ctx2.font = `bold ${fontSize}px Arial, "Microsoft YaHei", sans-serif`;
        ctx2.textBaseline = 'middle';
        ctx2.textAlign = 'left';
        ctx2.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx2.shadowBlur = 3;
        ctx2.fillText(text, boxX + padding, boxY + boxHeight / 2);
        ctx2.restore();
    },

    // 绘制圆角矩形路径（Canvas 工具方法）
    drawRoundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },
    // 碰撞检测方法（AABB 矩形碰撞）
    isCollide(r1, r2) {
        return !(
            r1.x + r1.width < r2.x ||
            r1.x > r2.x + r2.width ||
            r1.y + r1.height < r2.y ||
            r1.y > r2.y + r2.height
        );
    },
    // 子弹和敌机的碰撞检测
    bulletEnemyCollide() {
        this.bullets.forEach(bullet => {
            this.enemys.forEach(enemy => {
                if (this.isCollide(bullet.getRect(), enemy.getRect())) {
                    bullet.isDel = true;
                    enemy.isDead = true;
                    this.killCount += 1;
                    // 生成爆炸特效
                    this.explosions.push(
                        new Explosion(
                            this.imgs[4], // 爆炸贴图
                            enemy.x,
                            enemy.y + 15,
                            this.ctx
                        )
                    );
                }
            })
        })
    },
    // 敌机子弹和战机的碰撞检测
    enemyBulletsPlaneCollide() {
        let hit = false
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i]
            if (!hit && this.isCollide(this.plane.getRect(), bullet.getRect())) {
                this.plane.loseHp()
                // 删除已碰撞的子弹
                this.enemyBullets.splice(i, 1)
                hit = true
            }
        }
    },
    // H5端手指触控
    touchmove(ev) {
        const touch = ev.touches[0]
        const x = touch.clientX
        const y = touch.clientY
        this.plane.updateByTouchMove(x, y)
    },
    // 开始游戏
    gameStar() {
        // 重置游戏状态
        this.isGameOver = false;
        this.killCount = 0;
        this.bullets = [];
        this.enemys = [];
        this.enemyBullets = [];
        this.explosions = [];
        this.lastEnemyTime = 0;
        this.enemyInterval = 300;

        const controller = new Controller();
        controller.initEvents()
        // 隐藏首页 UI（标题 + 按钮）
        const homeUi = document.querySelector('.home-ui');
        if (homeUi) homeUi.style.display = 'none';
        // 隐藏操作提示
        const gameHint = document.querySelector('.game-hint');
        if (gameHint) gameHint.style.display = 'none';
        // 隐藏游戏结束弹窗
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) overlay.style.display = 'none';

        this.initPlane()
        this.timer = new Timer();
        // 注册游戏主循环（每一帧执行一次）
        this.timer.add((time) => {
            // 游戏结束则停止更新
            if (this.isGameOver) return;

            this.clearRect()
            this.updatePlaneBullets(controller, time);
            this.autoAddEnemy(time);
            this.updateEnemy(time);
            // 碰撞检测
            this.bulletEnemyCollide();
            this.enemyBulletsPlaneCollide();
            // 绘制战机
            this.plane.draw()
            // 绘制子弹
            this.updateBulletsByList('bullets')
            this.updateBulletsByList('enemyBullets')
            // 爆炸
            this.updateExplosions()
            this.drawScore();

            // 检测游戏结束（HP 归零）
            if (this.plane.hp.isDead()) {
                this.isGameOver = true;
                this.showGameOver();
            }
        })

        this.timer.start()
    },

    // 显示游戏结束弹窗
    showGameOver() {
        // 停止游戏循环
        if (this.timer) {
            this.timer.stop();
        }
        // 更新击杀数
        const scoreEl = document.getElementById('finalKillCount');
        if (scoreEl) scoreEl.textContent = this.killCount;
        // 显示弹窗
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) overlay.style.display = 'flex';
    },

    // 重新开始游戏
    restartGame() {
        this.gameStar();
    },

    // 返回首页
    exitToHome() {
        // 隐藏弹窗
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) overlay.style.display = 'none';
        // 显示首页 UI
        const homeUi = document.querySelector('.home-ui');
        if (homeUi) homeUi.style.display = 'flex';
        // 显示操作提示
        const gameHint = document.querySelector('.game-hint');
        if (gameHint) gameHint.style.display = 'block';
        // 清空画布
        this.clearRect();
    }
}

Main.init();
