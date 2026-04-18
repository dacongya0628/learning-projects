// 子弹类
class Bullet {
    constructor(img, x, y,speed = 10, viewportWidth, viewportHeight, ctx) {
        this.ctx = ctx
        this.viewportHeight = viewportHeight;
        this.viewportWidth = viewportWidth;
        this.x = x;
        this.y = y - 30;
        this.img = img
        this.speed = speed;
        this.isDel = false;
    }

    // 战机在画布上的信息
    bulletFrame() {
        var frame = new Frame(0, 0, 128, 128, this.x, this.y, 30, 30);
        return frame;
    }
    // 绘制子弹
    draw() {
        const { sx, sy, sw, sh, dx, dy, dw, dh } = this.bulletFrame()
        this.ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    // 子弹更新
    update() {
        this.y += this.speed;
    }

    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: 40.5,
            height: 30
        }
    }
}