// @ts-nocheck
import { ANIMATION_TIMING_CONFIG, HEART_EFFECT_CONFIG } from '../config/config';
import { getHeartPath } from '../utils/heartPath';

/**
 * 主爱心效果。
 *
 * 负责绘制屏幕中央的主要跳动爱心。它会先淡入，然后根据随机心跳间隔产生缩放、
 * 余波和阴影变化；后续流程里还会旋转、偏移，并把当前心率提供给心率文字和心电图。
 */
class HeartEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
        this.baseScale = 1;
        this.time = 0;
        this.lastBeat = 0;
        this.opacity = 0;
        this.nextBeatTime = this.getRandomBeatInterval();
        this.currentBeatStrength = 0;
        this.isBeat = false;
        this.isVisible = false;
        this.rotation = 0;
        this.offset = 0;
        this.isAdjusting = false;
        this.adjustStartTime = 0;
        this.isHorizontalOffset = false;
        this.offsetStartTime = 0;
        this.horizontalOffset = 0;
        this.targetHorizontalOffset = -window.innerWidth * HEART_EFFECT_CONFIG.OFFSET.TARGET_HORIZONTAL;
        this.init();
    }

    // 开始整体向左平移，为右侧照片墙留出空间。
    startHorizontalOffset() {
        this.isHorizontalOffset = true;
        this.offsetStartTime = Date.now();
    }

    // 按缓动曲线计算当前横向偏移量。
    updateHorizontalOffset() {
        if (!this.isHorizontalOffset) return;

        const elapsed = Date.now() - this.offsetStartTime;
        const duration = ANIMATION_TIMING_CONFIG.HEART.HORIZONTAL_OFFSET_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = this.easeInOutCubic(progress);

        this.horizontalOffset = this.targetHorizontalOffset * easeProgress;
    }

    // 初始化 Canvas 并监听窗口变化。
    init() {
        this.setupCanvas();
        window.addEventListener('resize', () => this.resize());
    }

    // 延迟显示主爱心，让它按整体剧情节奏出现。
    start() {
        // 延迟显示爱心
        setTimeout(() => {
            this.isVisible = true;
            this.fadeIn();
            this.animate();
        }, ANIMATION_TIMING_CONFIG.HEART.START_DELAY);
    }

    // 开始旋转和位置调整，使两颗爱心后续分开形成构图。
    startAdjustment() {
        this.isAdjusting = true;
        this.adjustStartTime = Date.now();
    }

    // 主动画循环：更新心跳状态并重绘爱心。
    animate() {
        if (!this.isVisible) return;

        this.time++;
        this.updateBeat();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    // 添加线性插值函数
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    // 创建主爱心使用的全屏 Canvas。
    setupCanvas() {
        this.canvas.id = 'heartCanvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
        document.body.appendChild(this.canvas);
        this.resize();
    }

    // 同步 Canvas 尺寸。
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 随机生成下一次心跳间隔，让跳动更自然。
    getRandomBeatInterval() {
        const minInterval = HEART_EFFECT_CONFIG.BEAT.MIN_INTERVAL;
        const maxInterval = HEART_EFFECT_CONFIG.BEAT.MAX_INTERVAL;
        return Math.random() * (maxInterval - minInterval) + minInterval;
    }


    // 爱心透明度淡入。
    fadeIn() {
        const fadeInterval = setInterval(() => {
            this.opacity += HEART_EFFECT_CONFIG.OPACITY.FADE_IN_INCREMENT;
            if (this.opacity >= 1) {
                clearInterval(fadeInterval);
                this.opacity = 1;
            }
        }, ANIMATION_TIMING_CONFIG.HEART.FADE_INTERVAL_BASE * HEART_EFFECT_CONFIG.OPACITY.FADE_IN_INCREMENT);
    }

    // 更新心跳状态、缩放强度和实时心率。
    updateBeat() {
        if (this.time >= this.lastBeat + this.nextBeatTime) {
            this.lastBeat = this.time;
            this.nextBeatTime = this.getRandomBeatInterval();
            this.currentBeatStrength = 0.3;
            this.isBeat = true;
            // 记录心跳时间
            this.lastBeatTime = Date.now();
            // 计算实时心率
            this.currentHeartRate = Math.round(60000 / (this.lastBeatTime - (this.previousBeatTime || this.lastBeatTime)));
            this.previousBeatTime = this.lastBeatTime;
        } else {
            this.isBeat = false;
        }

        this.currentBeatStrength *= 0.92;
        const naturalMovement = Math.sin(this.time * 0.02) * 0.02;
        this.scale = this.baseScale + this.currentBeatStrength + naturalMovement;
    }

    // 添加缓动函数
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // 绘制完整一帧：偏移、旋转、缩放、余波、主体和高光。
    draw() {
        // 更新水平偏移
        this.updateHorizontalOffset();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        // 更新旋转和位置
        if (this.isAdjusting) {
            const elapsed = Date.now() - this.adjustStartTime;
            const progress = Math.min(elapsed / ANIMATION_TIMING_CONFIG.HEART.ADJUSTMENT_DURATION, 1);
            const easeProgress = this.easeInOutCubic(progress);

            this.rotation = easeProgress * (-Math.PI / 12);
            this.offset = easeProgress * -100;

            if (progress === 1) this.isAdjusting = false;
        }

        this.ctx.translate(
            this.canvas.width * 0.5 + this.offset + this.horizontalOffset,
            this.canvas.height * 0.5
        );
        this.ctx.rotate(this.rotation);
        this.ctx.scale(this.scale, this.scale);

        // 绘制余波效果
        if (this.isBeat || this.currentBeatStrength > 0.1) {
            this.drawWaveEffect();
        }

        // 绘制主体
        this.drawMainHeart();

        // 绘制高光
        this.drawHighlight();

        this.ctx.restore();
    }

    // 绘制心跳时的两层余波。
    drawWaveEffect() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 100;
        const waveOpacity = this.currentBeatStrength * this.opacity * 0.6;

        this.ctx.globalCompositeOperation = 'soft-light';

        // 外层余波
        this.ctx.save();
        this.ctx.scale(scale * (1 + this.currentBeatStrength * 0.2), scale * (1 + this.currentBeatStrength * 0.2));
        this.ctx.fillStyle = `rgba(255, 0, 0, ${waveOpacity * 0.2})`;
        this.ctx.fill(getHeartPath());
        this.ctx.restore();

        // 内层余波
        this.ctx.save();
        this.ctx.scale(scale * (1 + this.currentBeatStrength * 0.1), scale * (1 + this.currentBeatStrength * 0.1));
        this.ctx.fillStyle = `rgba(255, 0, 0, ${waveOpacity * 0.3})`;
        this.ctx.fill(getHeartPath());
        this.ctx.restore();

        this.ctx.globalCompositeOperation = 'source-over';
    }

    // 绘制主爱心主体，包括渐变、阴影和描边。
    drawMainHeart() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 100;

        this.ctx.save();
        this.ctx.scale(scale, scale);

        // 创建渐变
        const gradient = this.ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
        [
            { stop: 0, color: [255, 58, 74] },
            { stop: 0.3, color: [255, 30, 58] },
            { stop: 0.6, color: [220, 20, 60] },
            { stop: 1, color: [176, 16, 48] }
        ].forEach(({ stop, color }) => {
            gradient.addColorStop(stop, `rgba(${color.join(',')}, ${this.opacity})`);
        });

        // 设置阴影
        this.ctx.shadowColor = `rgba(${HEART_EFFECT_CONFIG.SHADOW.COLOR.join(',')}, ${this.opacity * (this.isBeat ? 0.8 : 0.6)})`;
        this.ctx.shadowBlur = (this.isBeat ? HEART_EFFECT_CONFIG.SHADOW.BLUR_BEAT : HEART_EFFECT_CONFIG.SHADOW.BLUR_NORMAL) / scale;
        this.ctx.shadowOffsetX = HEART_EFFECT_CONFIG.SHADOW.OFFSET_X / scale;
        this.ctx.shadowOffsetY = HEART_EFFECT_CONFIG.SHADOW.OFFSET_Y / scale;

        // 绘制心形
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = `rgba(176, 16, 48, ${this.opacity})`;
        this.ctx.lineWidth = 3 / scale;
        this.ctx.fill(getHeartPath());
        this.ctx.stroke(getHeartPath());
        this.ctx.restore();
    }

    // 绘制爱心高光。
    drawHighlight() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 100;

        this.ctx.save();
        this.ctx.scale(scale, scale);

        const highlightGradient = this.ctx.createRadialGradient(-4, -4, 0, -4, -4, 6);
        highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.4})`);
        highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.opacity * 0.1})`);
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        this.ctx.fillStyle = highlightGradient;
        this.ctx.fill(getHeartPath());
        this.ctx.restore();
    }

    // 将当前心跳间隔换算成每分钟心率。
    getCurrentHeartRate() {
        if (!this.isVisible) return null;

        const currentInterval = this.nextBeatTime;
        const baseRate = HEART_EFFECT_CONFIG.HEART_RATE.BASE;
        const maxRate = HEART_EFFECT_CONFIG.HEART_RATE.MAX;

        const currentRate = Math.round(60 / (currentInterval / 60));

        return Math.min(Math.max(currentRate, baseRate), maxRate);
    }
}

export const heart = new HeartEffect();


