var Main = {
    // 画布大小
    canvasInfo: {
        canvasW: 0,
        canvasH: 0,
    },
    //canvas 上下文
    ctx: null,
    // 战机
    plane: null,

    timer: null,

    // 游戏道具图片
    imgs: [],
    // 游戏得分
    fraction: 0,

    enemyArr: [],
    fireArr: [],
    killNum: 0,
    escapeNum: 0,

    // 数据初始化方法
    init() {
        this.timer = new Timer.TimeProcess();
        this.timer.add(this.isOver, null, this);
        this.timer.add(this.clearRect, null, this);
        this.timer.start();

        // 获取画布
        var canvas = Common.$("#canvas");

        canvas.height =
            window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight;
        canvas.width =
            window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;

        Main.ctx = canvas.getContext("2d");
        Main.canvasInfo.canvasH = canvas.offsetHeight;
        Main.canvasInfo.canvasW = canvas.offsetWidth;

        // 1.初始化战机动画数据
        Common.initImgs(
            ["images/plane.png", "images/fire.png", "images/diren.png"],
            (imgs) => {
                Main.imgs = imgs;
                // 初始化战机
                this.plane = new Plane(
                    Main.canvasInfo.canvasW / 2 - 16,
                    Main.canvasInfo.canvasH - 50,
                    Main.imgs[0],
                    Main.ctx,
                    Main.canvasInfo
                );
                this.plane.drawPlane();
            }
        );
    },
    // 清除画布上的战机
    clearRect() {
        Main.ctx.clearRect(0, 0, Main.canvasInfo.canvasW, Main.canvasInfo.canvasH);
        Main.ctx.globalAlpha = 1.0;
    },

    start() {
        Common.$(".startBtn")[0].style.display = "none";
        Common.$(".btmBox")[0].style.display = "none";
        Common.$(".cover")[0].style.display = "block";
        Common.$(".killBox")[0].style.display = "block";
        Common.$(".escapeBox")[0].style.display = "block";
        Common.$(".cover")[0].addEventListener(
            "touchstart",
            (ev) => {
                let x = ev.touches[0].clientX - 15;
                let y = ev.touches[0].clientY - 18;

                this.plane.move(x, y);
            },
            false
        );
        Common.$(".cover")[0].addEventListener(
            "touchmove",
            (ev) => {
                let x = ev.touches[0].clientX - 15;
                let y = ev.touches[0].clientY - 18;

                this.plane.move(x, y);
            },
            false
        );
        this.plane.init();
    },

    isOver() {
        if (this.escapeNum >= 3) {

            this.plane.stop();
            this.fireArr.forEach((fire) => {
                fire.del();
            })
            this.enemyArr.forEach((enemy) => {
                enemy.del();
            })
            this.fireArr = [];
            this.enemyArr = [];
            this.timer.stop();

            Common.$(".overBox")[0].style.display = "block";
            Common.$(".overTxt")[0].innerText= "敌机逃跑 3 架，摧毁了您的基地";
        }
    },

    toAgain() {
        location.reload();
    }
};

Main.init();
