var addNum = 1;
var Enemy = function (x, img, ctx, canvasInfo, index) {
    this.img = img;
    this.x = x;
    this.y = 0;
    this.ctx = ctx;
    this.canvasInfo = canvasInfo;
    this.ySpeed = Math.random() * addNum + 1;
    this.timer = null;
    this.index = index;

    this.init();
}

Enemy.prototype = {
    init() {
        this.timer = new Timer.TimeProcess();
        this.timer.add(this.upDateEnemy, null, this);
        this.timer.start();
    },
    drawEnemy() {
        //drawImage (图片对象，相对图片的裁剪起始坐标，图片对象的宽高，显示在画布上的坐标，裁剪出来的图片宽高)
        this.ctx.drawImage(this.img, 0, 0, 109, 78, this.x, this.y, 36.3, 26);
    },
    move(y) {
        this.y = y;
    },
    size() {
        var frame = new Frame(this.x, this.y, 36.3, 26, 109, 78);
        return frame;
    },
    del() {
        this.timer.stop();
    },
    upDateEnemy() {
        let y = this.y;
        y += this.ySpeed;
        if (y <= 0) {
            y = 0;
        }
        if (y > 0 && y <= this.canvasInfo.canvasH - 30) {
            this.move(y);
            this.drawEnemy();
        } else {
            Main.escapeNum += 1;
            Common.$(".escapeNum")[0].innerText = Main.escapeNum;
            this.timer.stop();
            Main.enemyArr.splice(this.index, 1);
        }
    }
}