// 战机类
class Plane {
    constructor(img, bulletImg, viewportWidth, viewportHeight, ctx) {
        // 窗口大小
        this.viewportHeight = viewportHeight;
        this.viewportWidth = viewportWidth;
        // 显示的坐标
        this.x = viewportWidth / 2 - 30;
        this.y = viewportHeight - 30;
        // 战机对应的图片对象
        this.img = img;
        // 子弹图片
        this.bulletImg = bulletImg
        // canvas上下文对象
        this.ctx = ctx;
        // 战机移动速度
        this.speed = 3;
        // 子弹间隔时间
        this.shootInterval = 300;
        // 上一次发射时间
        this.lastShootTime = 0
    }

    // 战机在画布上的信息
    planeFrame() {
        var frame = new Frame(0, 0, 97, 97, this.x, this.y, 30, 30);
        return frame;
    }
    // 绘制战机
    drawPlane() {
        const { sx, sy, sw, sh, dx, dy, dw, dh } = this.planeFrame()
        this.ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    /**
     * 战机位置更新
    * 每一帧更新位置（核心逻辑）
    * 应该在 requestAnimationFrame 循环中持续调用
    */
    update(controller, time) {
        let dx = 0; // x 方向位移
        let dy = 0; // y 方向位移
        // 根据按键状态计算方向
        if (controller.keys.left) dx -= 1;
        if (controller.keys.right) dx += 1;
        if (controller.keys.top) dy -= 1;
        if (controller.keys.bottom) dy += 1;

        // ⭐ 关键点：防止斜向移动更快
        // 如果同时按两个方向（比如 ↑ + →）
        // dx=1, dy=-1，此时长度是 √2，需要归一化
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy); // 向量长度
            dx /= len; // 归一化
            dy /= len;
        }
        // 应用速度，更新位置
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // 边界限制（Clamp，防止飞出屏幕）注意：必须减去自身宽高，否则会“露一半”
        this.x = Math.max(0, Math.min(this.x, this.viewportWidth - 30));
        this.y = Math.max(0, Math.min(this.y, this.viewportHeight - 30));

        if (time - this.lastShootTime > this.shootInterval) {
            this.lastShootTime = time;
            return this.shoot();
        }
        return null
    }
    // 跟随手指移动
    updateByTouchMove(x, y) {
        this.x = x - 15;
        this.y = y - 15;
    }
    // 射击
    shoot() {
        const bullet = new Bullet(this.bulletImg, this.x, this.y, -10, this.viewportWidth, this.viewportHeight, this.ctx)
        return bullet;
    }

}