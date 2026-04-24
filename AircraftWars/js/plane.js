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
        this.speed = 5;
        // 子弹发射间隔时间（毫秒）
        this.shootInterval = 300;
        // 上一次发射时间
        this.lastShootTime = 0
        // 血条
        this.hp = new HpBar(100);
        // ===== 无敌状态 =====
        this.invincible = false;       // 是否无敌
        this.invincibleDuration = 3000; // 无敌持续时间（毫秒）
        this.invincibleStartTime = 0;   // 无敌开始时间
    }

    // 战机在画布上的信息
    frame() {
        var frame = new Frame(0, 0, 97, 97, this.x, this.y, 30, 30);
        return frame;
    }
    // 绘制战机
    draw() {
        // ===== 无敌闪烁：透明度交替变化 =====
        if (this.invincible) {
            // 每 100ms 切换一次显隐（闪烁效果）
            const elapsed = performance.now() - this.invincibleStartTime;
            const visible = Math.floor(elapsed / 100) % 2 === 0;
            if (!visible) {
                this.ctx.globalAlpha = 0.2;
            }
        }

        const { sx, sy, sw, sh, dx, dy, dw, dh } = this.frame()
        this.ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);

        // 恢复透明度
        if (this.invincible) {
            this.ctx.globalAlpha = 1.0;
        }

        // 绘制血条 - 左侧
        const barWidth = Math.min(160, this.viewportWidth * 0.35);
        const barHeight = 18;
        const barX = 16;
        const barY = 14;
        // HP 标签（血条左侧）
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        this.ctx.font = 'bold 12px Arial, "Microsoft YaHei", sans-serif';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'left';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText('HP', barX, barY + barHeight / 2);
        this.ctx.restore();
        // 绘制血条（HP 标签右侧）
        this.hp.draw(this.ctx, barX + 30, barY, barWidth, barHeight);
    }
    /**
     * 战机位置更新
    * 每一帧更新位置（核心逻辑）
    * 应该在 requestAnimationFrame 循环中持续调用
    */
    /**
     * 战机位置更新
     * @param {Controller} controller - 控制器实例
     * @param {number} time - 当前时间戳
     * @param {number} killCount - 当前击杀数（用于动态调整射速）
     */
    update(controller, time, killCount = 0) {
        this.hp.update();
        // ===== 更新无敌状态 =====
        if (this.invincible) {
            if (time - this.invincibleStartTime >= this.invincibleDuration) {
                this.invincible = false; // 3 秒后解除无敌
            }
        }

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

        // 边界限制（Clamp，防止飞出屏幕）注意：必须减去自身宽高，否则会"露一半"
        this.x = Math.max(0, Math.min(this.x, this.viewportWidth - 30));
        this.y = Math.max(0, Math.min(this.y, this.viewportHeight - 30));

        // 根据击杀数动态计算射击间隔（每击杀 100 架，间隔减少 20ms，最低 100ms）
        const difficultyLevel = Math.floor(killCount / 100);
        const dynamicInterval = Math.max(100, this.shootInterval - difficultyLevel * 20);

        // 自动射击
        if (time - this.lastShootTime > dynamicInterval) {
            this.lastShootTime = time;
            return this.addBullets();
        }
        return null
    }
    // 跟随手指移动（移动端）
    updateByTouchMove(x, y) {
        this.x = x - 15;
        this.y = y - 15;
    }
    // 获取坐标以及大小信息 - 用于碰撞检测
    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: 30,
            height: 30
        }
    }
    // 生成子弹
    addBullets() {
        const bullet = new Bullet(this.bulletImg, this.x, this.y, -10, this.viewportWidth, this.viewportHeight, this.ctx)
        return bullet;
    }
    // 扣血（触发无敌）
    loseHp(value = 10) {
        if (this.invincible) return; // 无敌期间不扣血
        this.hp.damage(value)
        // 触发无敌
        this.invincible = true;
        this.invincibleStartTime = performance.now(); // 用 performance.now() 与 rAF 时间戳一致
    }
}
