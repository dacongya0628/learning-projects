var Fire = function (x, y, img, ctx, canvasInfo, index) {
    // console.log(y);
    this.img = img;
    this.x = x;
    this.y = y;
    this.ctx = ctx;
    this.canvasInfo = canvasInfo;
    this.ySpeed = 10;
    this.timer = null;
    this.index = index;

    this.init();
}

Fire.prototype = {
    init() {
        this.timer = new Timer.TimeProcess();
        this.timer.add(this.upDateFire, null, this);
        this.timer.start();
    },
    drawFire() {
        //drawImage (图片对象，相对图片的裁剪起始坐标，图片对象的宽高，显示在画布上的坐标，裁剪出来的图片宽高)
        this.ctx.drawImage(this.img, 34, 0, 182, 182, this.x, this.y, 20, 40);
    },
    move(y) {
        this.y = y;
        for (var i = 0; i < Main.enemyArr.length; i++) {
            this.killEnemy(Main.enemyArr[i], i);
        }
    },
    killEnemy(enemy, index) {
        if (this.y <= enemy.y + 20 && this.y >= enemy.y && this.x >= enemy.x && this.x <= enemy.x + 30) {
            enemy.del();

            this.del();
            Main.enemyArr.splice(index, 1);
            Main.fireArr.splice(this.index, 1);
            Main.killNum += 1;
            Common.$(".killNum")[0].innerText = Main.killNum;

            if (Main.killNum > 0 && Main.killNum % 100 == 0) {
                addNum += 1;
            }

            console.log(addNum);
        }
    },
    del() {
        this.timer.stop();
    },
    setNone() {
        this.ctx.globalAlpha = 0;
    },
    stopMove() {
        this.timer.stop();
    },
    size() {
        var frame = new Frame(this.x, this.y, 20, 40, 182, 182);
        return frame;
    },
    upDateFire() {
        let y = this.y;
        y -= this.ySpeed;
        if (y <= 0) {
            y = 0;
            this.timer.stop();
        }
        if (y > 0) {
            this.move(y);
            this.drawFire();
        }
    }
}