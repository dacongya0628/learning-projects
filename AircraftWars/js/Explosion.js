// 爆炸类
class Explosion {
    constructor(img, x, y, ctx) {
        this.img = img;
        this.x = x;
        this.y = y;
        this.ctx = ctx;
        // 存活时间（当前帧数）
        this.life = 0;
        // 最大持续帧数
        this.maxLife = 10;
        // 爆炸图片大小
        this.size = 35;
        // 是否已完成动画
        this.isDone = false;
    }

    // 更新爆炸状态
    update() {
        this.life++;
        this.size += 1.5; // 逐渐放大
        if (this.life >= this.maxLife) {
            this.isDone = true;
        }
    }

    // 绘制爆炸
    draw() {
        // 透明度随生命衰减（淡出效果）
        this.ctx.globalAlpha = 1 - this.life / this.maxLife;

        this.ctx.drawImage(
            this.img,
            this.x,
            this.y,
            this.size,
            this.size
        );

        this.ctx.globalAlpha = 1; // ⚠️ 记得恢复
    }
}
