/**
 * Timer：基于 requestAnimationFrame 的帧循环任务调度器
 * 功能：
 * 1. 每一帧执行任务（类似游戏循环）
 * 2. 支持添加任务
 * 3. 支持删除任务
 * 4. 支持启动 / 停止
 */
class Timer {
    constructor() {
        // 获取 requestAnimationFrame（带兼容处理）
        this.requestAnimationFrame = this.initAnimationFrame();

        // 任务列表（每一帧都会执行这里面的函数）
        this.list = [];

        // 控制循环是否继续
        this.isStart = false;

        // 自增ID，用于给每个任务唯一标识（删除用）
        this._id = 0;
    }

    /**
     * 初始化 requestAnimationFrame
     * 优先使用浏览器原生方法，否则降级为 setTimeout（模拟60fps）
     */
    initAnimationFrame() {
        return (window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            function (cb) {
                setTimeout(cb, 1000 / 60); // 约等于每秒60帧
            }).bind(window);
    }

    /**
     * 添加任务
     * @param {Function} cb - 要执行的函数
     * @param {Array} param - 参数数组（用于 apply）
     * @param {Object} context - 函数执行时的 this
     * @returns {number} 任务ID（用于后续删除）
     */
    add(cb, param = [], context = null) {
        const id = this._id++;

        this.list.push({
            id,        // 唯一标识
            cb,        // 回调函数
            param,     // 参数数组
            context    // this 指向
        });

        return id;
    }

    /**
     * 删除任务
     * @param {number} id - 任务ID
     */
    remove(id) {
        // 通过过滤移除指定任务
        this.list = this.list.filter(item => item.id !== id);
    }

    /**
     * 启动循环
     * 原理：
     * requestAnimationFrame 只执行一次
     * 所以需要在回调里再次调用自己形成循环
     */
    start() {
        this.isStart = true;

        // 定义循环函数（每一帧执行一次）
        const loop = (time) => {
            // 遍历所有任务并执行
            this.list.forEach(item => {
                item.cb.apply(item.context, [time, ...item.param]);
            });

            // 如果仍在运行，则继续下一帧
            if (this.isStart) {
                this.requestAnimationFrame(loop);
            }
        };

        // 启动第一帧
        this.requestAnimationFrame(loop);
    }

    /**
     * 停止循环
     * 原理：下一帧不会继续递归调用
     */
    stop() {
        this.isStart = false;
    }
}