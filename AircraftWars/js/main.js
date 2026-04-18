var Main = {
    canvasEl: null, // canvas 元素
    ctx: null, // 2D 绘图上下文
    viewportWidth: 0, // 逻辑坐标系宽度，单位为 CSS 像素
    viewportHeight: 0, // 逻辑坐标系高度，单位为 CSS 像素
    dpr: 1, // 当前设备像素比
    imgs: [], // 游戏所需要的图片数据
    plane: null, // 游戏中的飞机实例
    bullets: [], // 子弹
    enemys: [], // 敌机
    enemyInterval: 300, // 敌机间隔时间
    lastEnemyTime: 0, // 上一次生成时间
    enemyBullets: [], // 敌机子弹
    explosions: [], // 爆炸的数组
    init() {
        this.canvasEl = Common.$("#canvas")
        this.ctx = this.canvasEl.getContext("2d");
        this.resizeCanvas();
        this.initImages();


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
        this.canvasEl.width = Math.round(displayWidth * dpr);
        this.canvasEl.height = Math.round(displayHeight * dpr);
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
        this.plane.drawPlane();
    },
    // 更新战机子弹
    updatePlaneBullets(controller, time) {
        const bullet = this.plane.update(controller, time)
        if (bullet) {
            this.bullets.push(bullet);
        }
    },
    // 初始化敌机
    autoAddEnemy(time) {
        if (time - this.lastEnemyTime > this.enemyInterval) {
            const enemy = new Enemy(this.imgs[1], this.imgs[3], this.viewportWidth, this.viewportHeight, this.ctx);
            this.enemys.push(enemy)
            this.enemyInterval = 200 + Math.random() * 800;
            this.lastEnemyTime = time;
        }
    },
    // 敌机出动
    updateEnemy(time) {
        this.enemys = this.enemys.filter(e => !e.isDead);
        this.enemys.forEach(item => {
            const bullet = item.update(time)
            if (bullet) {
                this.enemyBullets.push(bullet)
            }
            item.draw();
        })
    },
    // 子弹发射(更新子弹轨迹)
    updateBulletsByList(list) {
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
    // 更新爆炸
    updateExplosions() {
        this.explosions = this.explosions.filter(e => !e.isDone);
        this.explosions.forEach(e => {
            e.update();
            e.draw();
        });
    },
    // 碰撞检测方法
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
                    this.explosions.push(
                        new Explosion(
                            this.imgs[4], // 你的爆炸图
                            enemy.x,
                            enemy.y + 15,
                            this.ctx
                        )
                    );
                }
            })
        })
    },
    // H5端手指触控
    touchmove(ev) {
        const touch = ev.touches[0]

        const x = touch.clientX
        const y = touch.clientY

        console.log(x, y)
        this.plane.updateByTouchMove(x, y)
    },
    // 开始游戏
    gameStar() {
        const controller = new Controller();
        controller.initEvents()
        Common.$(".startBtn")[0].style.display = "none";
        this.initPlane()
        const timer = new Timer();
        timer.add((time) => {
            this.clearRect()

            this.updatePlaneBullets(controller, time);
            this.autoAddEnemy(time);
            this.updateEnemy(time);
            // 碰撞检测
            this.bulletEnemyCollide();
            // 绘制战机
            this.plane.drawPlane()
            // 绘制子弹
            this.updateBulletsByList('bullets')
            this.updateBulletsByList('enemyBullets')
            // 爆炸
            this.updateExplosions()
        })

        timer.start()


    }
}

Main.init();