// 立即执行函数-为全局提供便捷的方法
var Common = function () {
    // 提供便捷的元素选择
    // 支持 #id、.class、tag 三种选择方式
    function $(attr) {
        let prefix = attr.charAt(0);
        let value = attr.slice(1);

        switch (prefix) {
            case '#':
                return document.getElementById(value);
            case '.':
                return document.getElementsByClassName(value);
            default:
                return document.getElementsByTagName(attr);
        }
    }

    // 批量加载图片，完成后按原顺序回调
    function preloadImages(imgUrls) {
        return Promise.allSettled(imgUrls.map((url, index) => {
            return new Promise((resolve, reject) => {
                const Img = new Image();
                Img.onload = () => { resolve({ Img, index }) }
                Img.onerror = () => { reject({ src: url, index }) }
                Img.src = url;
            })
        })).then(res => {
            const imgs = [];
            const errors = [];
            res.forEach(r => {
                if (r.status === 'fulfilled') {
                    imgs[r.value.index] = r.value.Img;
                } else {
                    errors.push(r.reason);
                }
            });
            return {
                imgs: imgs.filter(Boolean), // 过滤掉加载失败的空位
                errors
            };
        })
    }
    // 异步初始化图片，加载完成后回调
    async function initImgs(urls, cb) {
        const { imgs } = await preloadImages(urls);
        cb && cb(imgs);
    }

    return {
        $,
        initImgs
    }
}()

// 提供全局的图片动画帧
// 参数：sx/sy 源图裁剪起点，sw/sh 裁剪宽高，dx/dy 目标位置，dw/dh 目标尺寸
var Frame = function (sx,sy,sw,sh,dx,dy,dw,dh) {
    this.sx = sx;
    this.sy = sy;
    this.sw = sw;
    this.sh = sh;
    this.dx = dx;
    this.dy = dy;
    this.dw = dw;
    this.dh = dh;
}
