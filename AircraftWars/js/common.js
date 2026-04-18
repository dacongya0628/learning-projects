// 立即执行函数-为全局提供便捷的方法
var Common = function () {
    // 提供便捷的元素选择
    function $(attr) {
        let prefix = attr.charAt(0);
        let value = attr.slice(1);
        console.log(prefix, value);

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
                imgs: imgs.filter(Boolean),
                errors
            };
        })
    }
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