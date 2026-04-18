// 爆炸类
class Explosion {
    constructor(img, x, y, ctx) {
        this.img = img;
        this.x = x;
        this.y = y;
        this.ctx = ctx;
        // 存活时间
        this.life = 0;
        // 持续帧数（自己调）
        this.maxLife = 10;
        // 图片大小
        this.size = 35;
        this.isDone = false;
    }

    update() {
        this.life++;
        this.size += 1.5;
        if (this.life >= this.maxLife) {
            this.isDone = true;
        }
    }

    draw() {
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