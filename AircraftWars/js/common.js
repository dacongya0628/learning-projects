//公共方法

var Common = function () {
    // 获取元素
    function $(str) {
        var s = str.charAt(0);
        var name = str.substr(1);
        switch (s) {
            case '#':
                return document.getElementById(name)
                break;
            case '.':
                return document.getElementsByClassName(name)
                break;
            default:
                return document.getElementsByTagName(name)
                break;
        }
    }

    function initImgs(urlArr, cb) {
        var count = 0;
        var imgs = [];
        for (var i = 0; i < urlArr.length; i++) {
            var img = new Image();
            img.onload = function () {
                this.onload = null;
                imgs.push(this);
                count += 1;
                img = null;
                if (count >= urlArr.length) {
                    imgs.sort(function (a, b) {
                        return a.index - b.index;
                    });
                    cb && cb(imgs);
                }
            }
            img.index = i;
            img.src = urlArr[i];
        }
    }

    var exports = {
        $,
        initImgs
    };
    return exports;
}();


// 帧信息定义 （物体在画布中的坐标，物体在画布上的大小，物体的实际大小）
var Frame = function (x, y, w, h, dw, dh) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.dw = dw;
    this.dh = dh;
}



var KeyController = function () {

    var Controller = function (x, y) {
        this.t = false;
        this.l = false;
        this.r = false;
        this.b = false;
        this.x = x;
        this.y = y;
    }

    Controller.prototype = {
        tDown() {
            this.t = true;
        },
        tUp() {
            this.t = false;
        },
        lDwon() {
            this.l = true;
        },
        lUp() {
            this.l = false;
        },
        rDown() {
            this.r = true;
        },
        rUp() {
            this.r = false;
        },
        bDown() {
            this.b = true;
        },
        bUp() {
            this.b = false;
        },

        init() {
            if (this.l) {
                this.x -= 3;
            }
            if (this.r) {
                this.x += 3;
            }
        }
    }

    var exports = {
        Controller: Controller
    };
    return exports;

}();



// 定义游戏时间类
var Timer = function () {
    var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function (cb) {
            setTimeout(cb, 1000 / 60)
        };

    var TimeProcess = function () {
        this.list = [];
        this.isStart = false;
    }

    TimeProcess.prototype = {
        add: function (cb, param, context) {
            this.list.push({
                cb: cb,
                param: param,
                context: context
            });
        },
        start: function () {
            this.isStart = true;
            var self = this;
            requestAnimationFrame(function () {
                var item = null,
                    p = [];
                for (var i = 0; i < self.list.length; i++) {
                    item = self.list[i];
                    item.cb.apply(item.context, item.param);
                }
                if (self.isStart) requestAnimationFrame(arguments.callee);
            });
        },
        stop: function () {
            this.isStart = false;
        }
    }

    var exports = {
        TimeProcess: TimeProcess
    };
    return exports;
}();