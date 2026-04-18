// 敌人类
class Enemy {
    constructor(img, bulletImg, viewportWidth, viewportHeight, ctx) {
        // 窗口大小
        this.viewportHeight = viewportHeight;
        this.viewportWidth = viewportWidth;
        // 显示的坐标
        this.x = Math.random() * (viewportWidth - 30);
        this.y = -301;
        // 敌机对应的图片对象
        this.img = img;
        // 敌机子弹图片
        this.bulletImg = bulletImg
        // canvas上下文对象
        this.ctx = ctx;
        // 敌机移动速度
        this.speed = 3;
        // 子弹间隔时间
        this.shootInterval = 1000;
        // 上一次发射时间
        this.lastShootTime = 0
        // 是否死亡
        this.isDead = false;
    }

    // 敌机在画布上的信息
    frame() {
        var frame = new Frame(0, 0, 108, 80, this.x, this.y, 40.5, 30);
        return frame;
    }
    // 绘制敌机
    draw() {
        const { sx, sy, sw, sh, dx, dy, dw, dh } = this.frame()
        this.ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    /**
     * 敌机位置更新
    * 每一帧更新位置（核心逻辑）
    * 应该在 requestAnimationFrame 循环中持续调用
    */
    update(time) {
        this.y += this.speed;
        if (this.y + 30 > this.viewportHeight) {
            this.isDead = true;
        }

        if (time - this.lastShootTime > this.shootInterval) {
            this.lastShootTime = time;
            return this.shoot();
        }

        return null
    }

    // 射击
    shoot() {
        const bullet = new Bullet(this.bulletImg, this.x + 5.25, this.y + 60, 10, this.viewportWidth, this.viewportHeight, this.ctx)
        return bullet;
    }

    // 获取坐标以及大小信息 - 用于碰撞检测
    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: 40.5,
            height: 30
        }
    }
}