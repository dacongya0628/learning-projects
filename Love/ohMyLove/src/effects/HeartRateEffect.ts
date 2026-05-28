// @ts-nocheck
import { ANIMATION_TIMING_CONFIG, HEART_RATE_CONFIG } from '../config/config';

/**
 * 心动频率文字效果。
 *
 * 前期用随机目标值模拟心率波动，主爱心出现后优先跟随主爱心的真实跳动节奏。
 * 后半段会和爱心、心电图一起向左偏移，为右侧照片墙让出视觉空间。
 */
class HeartRateEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.opacity = HEART_RATE_CONFIG.INITIAL.OPACITY;
        this.isActive = false;
        this.currentRate = HEART_RATE_CONFIG.INITIAL.RATE;
        this.position = { ...HEART_RATE_CONFIG.INITIAL.POSITION };
        this.fontSize = HEART_RATE_CONFIG.INITIAL.FONT_SIZE;
        this.rateUpdateInterval = ANIMATION_TIMING_CONFIG.HEART_RATE.RATE_UPDATE_INTERVAL;
        this.targetRate = HEART_RATE_CONFIG.INITIAL.RATE;
        this.isMoving = false;
        this.moveStartTime = 0;
        this.lastRateUpdateTime = Date.now();
        this.isHorizontalOffset = false;
        this.offsetStartTime = 0;
        this.horizontalOffset = 0;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / HEART_RATE_CONFIG.ANIMATION.FPS;
        this.init();
        this.mainHeart = null;
    }

    // 开始整体向左平移。
    startHorizontalOffset() {
        this.isHorizontalOffset = true;
        this.offsetStartTime = Date.now();
    }

    // 根据启动时间计算当前横向偏移量。
    updateHorizontalOffset() {
        if (!this.isHorizontalOffset) return;

        const elapsed = Date.now() - this.offsetStartTime;
        const duration = ANIMATION_TIMING_CONFIG.HEART_RATE.HORIZONTAL_OFFSET_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = this.easeInOutCubic(progress);

        const targetOffset = window.innerWidth * HEART_RATE_CONFIG.ANIMATION.TARGET_OFFSET;
        this.horizontalOffset = targetOffset * easeProgress;
    }

    // 绑定主爱心，用于读取主爱心的实时心率。
    setMainHeart(heart) {
        this.mainHeart = heart;
    }

    // 初始化 Canvas、预热字体，并监听窗口变化。
    init() {
        this.setupCanvas();
        document.fonts.load(`60px KeAi`);
        window.addEventListener('resize', () => this.resize());
    }

    // 创建用于绘制心率文字的全屏透明 Canvas。
    setupCanvas() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '3';  // 修改为更高的层级，确保在爱心飘落效果之上
        this.resize();
        document.body.appendChild(this.canvas);
    }

    // 同步 Canvas 尺寸。
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 启动心率文字动画，并按配置延迟让文字移动到页面下方。
    start() {
        if (!this.isActive) {
            this.isActive = true;
            this.fadeIn();
            this.animate();

            // 按配置延迟后开始移动动画。
            setTimeout(() => {
                this.startMoving();
            }, ANIMATION_TIMING_CONFIG.HEART_RATE.START_MOVE_DELAY);
        }
    }

    // 标记开始从中心位置移动到底部。
    startMoving() {
        this.isMoving = true;
        this.moveStartTime = Date.now();
    }

    // 计算心率文字从中心到下方的过渡位置和字号。
    updatePosition() {
        if (!this.isMoving) return;

        const elapsed = Date.now() - this.moveStartTime;
        const duration = ANIMATION_TIMING_CONFIG.HEART_RATE.MOVE_DURATION;
        const progress = Math.min(elapsed / duration, 1);

        // 使用缓动函数使动画更平滑
        const easeProgress = this.easeInOutCubic(progress);

        // 更新位置
        this.position.y = this.lerp(0.5, 0.8, easeProgress); // 从中间移动到底部

        // 更新字体大小
        this.fontSize = this.lerp(
            60,
            30, // 最终字体大小
            easeProgress
        );

        if (progress === 1) {
            this.isMoving = false;
        }
    }

    // 缓动函数
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // 线性插值函数
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    // 主动画循环：限帧、清屏、更新位置，并绘制当前心率文字。
    animate(timestamp = 0) {
        if (!this.isActive) return;

        if (timestamp - this.lastFrameTime < this.frameInterval) {
            requestAnimationFrame(timestamp => this.animate(timestamp));
            return;
        }
        this.lastFrameTime = timestamp;

        this.updateHorizontalOffset();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.updatePosition();

        const heartX = this.canvas.width * this.position.x + this.horizontalOffset;
        const heartY = this.canvas.height * this.position.y;

        // 使用主心形的颜色
        let color = '176, 16, 48';  // 默认颜色

        // 绘制心跳频率文本
        this.ctx.font = `${this.fontSize}px KeAi`;
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = `rgba(${color}, ${this.opacity})`;
        this.ctx.fillText(
            `心动频率：${this.calculateHeartRate()} 次/分钟`,
            heartX,
            heartY
        );

        requestAnimationFrame(timestamp => this.animate(timestamp));
    }


    // 停止心率动画循环。
    stop() {
        this.isActive = false;
    }

    // 透明度淡入。
    fadeIn() {
        const fadeInterval = setInterval(() => {
            this.opacity += ANIMATION_TIMING_CONFIG.HEART_RATE.FADE_STEP;
            if (this.opacity >= 1) {
                clearInterval(fadeInterval);
                this.opacity = 1;
            }
        }, ANIMATION_TIMING_CONFIG.HEART_RATE.FADE_INTERVAL_BASE * ANIMATION_TIMING_CONFIG.HEART_RATE.FADE_STEP);
    }

    // 计算当前显示的心率：主爱心可用时跟随主爱心，否则模拟随机波动。
    calculateHeartRate() {
        // 使用主心形的心跳频率
        if (this.mainHeart && this.mainHeart.isVisible) {
            const currentRate = this.mainHeart.getCurrentHeartRate();
            if (currentRate) {
                return Math.round(currentRate);
            }
        }

        // 在爱心出现前，模拟真实心跳变化
        const currentTime = Date.now();
        if (currentTime - this.lastRateUpdateTime > this.rateUpdateInterval) {
            // 生成新的目标心率
            const baseRate = HEART_RATE_CONFIG.RATE.BASE;
            const maxVariation = HEART_RATE_CONFIG.RATE.MAX_VARIATION;
            this.targetRate = baseRate + (Math.random() * 2 - 1) * maxVariation;
            this.lastRateUpdateTime = currentTime;
        }

        // 平滑过渡到目标心率
        const transitionSpeed = HEART_RATE_CONFIG.ANIMATION.TRANSITION_SPEED;
        this.currentRate += (this.targetRate - this.currentRate) * transitionSpeed;

        // 确保心率在合理范围内
        const finalRate = Math.min(Math.max(
            Math.round(this.currentRate),
            HEART_RATE_CONFIG.RATE.MIN
        ), HEART_RATE_CONFIG.RATE.MAX);

        return finalRate;
    }

    // 将十六进制颜色转换为 Canvas rgba 需要的 r,g,b 字符串。
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            HEART_RATE_CONFIG.COLOR.DEFAULT;
    }
}

export const heartRate = new HeartRateEffect();


