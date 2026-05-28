// @ts-nocheck
import { Heart } from './Heart';
import { FALLING_HEARTS_CONFIG } from '../config/config';

/**
 * 背景飘落爱心效果。
 *
 * 这个效果只在开场阶段启动，用一个独立 Canvas 绘制多颗小爱心。
 * 为了降低长期运行成本，动画循环只有 start() 后才开始，stop() 后会停止刷新。
 */
class FallingHeartsEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.hearts = [];
        this.isActive = false;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / FALLING_HEARTS_CONFIG.FPS;
        this.init();
    }

    /**
     * 初始化 Canvas、创建爱心粒子，并监听窗口尺寸变化。
     */
    init() {
        this.setupCanvas();
        this.createHearts();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 创建覆盖全屏的透明 Canvas。
     *
     * pointer-events 设置为 none，避免 Canvas 覆盖按钮或照片墙的交互。
     */
    setupCanvas() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        this.resize();
        document.body.appendChild(this.canvas);
    }

    /**
     * 同步 Canvas 像素尺寸和当前窗口尺寸。
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * 按配置数量创建小爱心粒子。
     *
     * 初始 y 坐标放在屏幕上方，使启动时爱心从上往下自然飘入。
     */
    createHearts() {
        this.hearts = Array.from({ length: FALLING_HEARTS_CONFIG.COUNT }, () => {
            return new Heart(
                this.canvas,
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height - this.canvas.height
            );
        });
    }

    /**
     * 启动动画循环。
     */
    start() {
        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    }

    /**
     * 停止动画循环。
     */
    stop() {
        this.isActive = false;
    }

    /**
     * 每帧清空画布并绘制所有爱心。
     *
     * 这里用 frameInterval 做 FPS 限制，避免背景粒子占用过多主线程时间。
     */
    animate(timestamp = 0) {
        if (!this.isActive) return;

        if (timestamp - this.lastFrameTime < this.frameInterval) {
            requestAnimationFrame(timestamp => this.animate(timestamp));
            return;
        }
        this.lastFrameTime = timestamp;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.hearts.forEach(heart => {
            heart.update();
            heart.draw(this.ctx);
        });

        requestAnimationFrame(timestamp => this.animate(timestamp));
    }
}

// 修改导出方式
export const fallingHearts = new FallingHeartsEffect();


