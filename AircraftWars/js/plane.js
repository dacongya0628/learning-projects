// 定义一个战机
var Plane = function (x, y, img, ctx, canvasInfo) {
    // 显示的坐标
    this.x = x;
    this.y = y;

    // 战机对应的图片对象
    this.img = img;

    // canvas上下文对象
    this.ctx = ctx;

    // 画布信息
    this.canvasInfo = canvasInfo;

    // 战机的血量
    this.life = 100;

    // 每次回复的血量
    this.lifeAdd = 1;

    //战机是否被摧毁
    this.isDead = false;

    // 每个方向的移动距离
    this.xSpeed = 0;
    this.ySpeed = 0;

    // 当前按键的值
    this.keyCode = 0;

    this.fires = [];

    this.timer = null;

    // 初始化方法
    // this.init();
};

var fireTimer = null;
var enemyTiemr = null;
Plane.prototype = {
    // 重构初始化方法 - 初始化战机
    init() {
        this.initEvent();
        this.timer = new Timer.TimeProcess();
        this.timer.add(this.upDatePlane, null, this);
        this.timer.start();
        this.createFire();
    },
    // 战机在画布上的信息
    size() {
        var frame = new Frame(this.x, this.y, 32, 32, 97, 97);
        return frame;
    },
    // 绘制战机
    drawPlane() {
        //drawImage (图片对象，相对图片的裁剪起始坐标，图片对象的宽高，显示在画布上的坐标，裁剪出来的图片宽高)
        this.ctx.drawImage(this.img, 0, 0, 97, 97, this.x, this.y, 32, 32);
    },
    // 移动战机
    move(x, y) {
        this.x = x;
        this.y = y;
    },

    // 控制战机
    // 初始化键盘监听事件
    initEvent: function () {
        //初始化事件
        Common.$("#canvasBox").onkeydown = function (e) {
            this.keyDown(e);
        }.bind(this);
        Common.$("#canvasBox").onkeyup = function (e) {
            this.keyUp(e);
        }.bind(this);
    },
    keyDown(ev) {
        this.keyCode = ev.keyCode;
        if (ev.keyCode == 39) {
            this.xSpeed = 5;
        }
        if (ev.keyCode == 37) {
            this.xSpeed = -5;
        }
        if (ev.keyCode == 38) {
            this.ySpeed = -5;
        }
        if (ev.keyCode == 40) {
            this.ySpeed = 5;
        }

        ev.preventDefault();
    },
    keyUp(ev) {
        // console.log('----键盘弹起----',ev);
        if (ev.keyCode == 39 || ev.keyCode == 37) {
            this.xSpeed = 0;
        }
        if (ev.keyCode == 38 || ev.keyCode == 40) {
            this.ySpeed = 0;
        }

        ev.preventDefault();
    },
    createFire() {
        fireTimer = setInterval(() => {
            let index = 0;
            Main.fireArr.push(
                new Fire(
                    this.size().x + 13,
                    this.size().y - 13,
                    Main.imgs[1],
                    this.ctx,
                    this.canvasInfo,
                    index
                )
            );
            index += 1;
        }, 50);
        enemyTiemr = setInterval(() => {
            let index2 = 0;
            Main.enemyArr.push(
                new Enemy(
                    Math.random() * (this.canvasInfo.canvasW - 74) + 36.2,
                    Main.imgs[2],
                    this.ctx,
                    this.canvasInfo,
                    index2
                )
            );
            index2 += 1;
        }, 150);
    },
    upDatePlane() {
        let x = this.x;
        let y = this.y;
        x += this.xSpeed;
        y += this.ySpeed;

        if (x <= 0) {
            x = 0;
        }
        if (x + this.size().w >= this.canvasInfo.canvasW) {
            x = this.canvasInfo.canvasW - this.size().w;
        }
        if (y <= 0) {
            y = 0;
        }
        if (y >= this.canvasInfo.canvasH - this.size().h) {
            y = this.canvasInfo.canvasH - this.size().h;
        }
        this.move(x, y);
        this.drawPlane();
    },
    stop() {
        this.timer.stop();
        clearInterval(fireTimer);
        clearInterval(enemyTiemr);
    }
};
