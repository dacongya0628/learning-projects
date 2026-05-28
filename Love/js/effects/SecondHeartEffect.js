import { ANIMATION_TIMING_CONFIG, SECOND_HEART_EFFECT_CONFIG } from '../config/config.js';
import { getHeartPath } from '../utils/heartPath.js';

/**
 * 第二颗爱心效果。
 *
 * 它和主爱心共用绘制思路，但初始缩放更小、旋转方向相反，并在调整阶段带一点
 * 垂直偏移。两颗爱心配合形成后续给照片墙让位的双心构图。
 */
class SecondHeartEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scale = SECOND_HEART_EFFECT_CONFIG.SCALE.BASE;
        this.baseScale = SECOND_HEART_EFFECT_CONFIG.SCALE.BASE;
        this.targetHorizontalOffset = -window.innerWidth * SECOND_HEART_EFFECT_CONFIG.OFFSET.TARGET_HORIZONTAL;
        this.time = 0;
        this.lastBeat = 0;
        this.opacity = 0;
        this.nextBeatTime = this.getRandomBeatInterval();
        this.currentBeatStrength = 0;
        this.isVisible = false;
        this.offsetX = 0;  // 水平偏移量
        this.offsetY = 0;   // 垂直偏移量
        this.rotation = 0;
        this.offset = 0;
        this.isAdjusting = false;
        this.adjustStartTime = 0;
        this.isHorizontalOffset = false;
        this.offsetStartTime = 0;
        this.horizontalOffset = 0;
        this.init();
    }

    // 开始整体向左平移，和主爱心保持同步。
    startHorizontalOffset() {
        this.isHorizontalOffset = true;
        this.offsetStartTime = Date.now();
    }

    // 根据缓动进度计算当前横向偏移。
    updateHorizontalOffset() {
        if (!this.isHorizontalOffset) return;

        const elapsed = Date.now() - this.offsetStartTime;
        const duration = ANIMATION_TIMING_CONFIG.SECOND_HEART.HORIZONTAL_OFFSET_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = this.easeInOutCubic(progress);

        this.horizontalOffset = this.targetHorizontalOffset * easeProgress;
    }

    // 初始化 Canvas 并监听窗口变化。
    init() {
        this.setupCanvas();
        window.addEventListener('resize', () => this.resize());
    }

    // 延迟显示第二颗爱心，让它比主爱心略晚出现。
    start() {
        setTimeout(() => {
            this.isVisible = true;
            this.fadeIn();
            this.animate();
        }, ANIMATION_TIMING_CONFIG.SECOND_HEART.START_DELAY);
    }

    // 开始旋转、水平和垂直位置调整。
    startAdjustment() {
        this.isAdjusting = true;
        this.adjustStartTime = Date.now();
    }

    // 创建第二颗爱心使用的全屏 Canvas。
    setupCanvas() {
        this.canvas.id = 'secondHeartCanvas';
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

    // 随机生成下一次心跳间隔。
    getRandomBeatInterval() {
        const minInterval = SECOND_HEART_EFFECT_CONFIG.BEAT.MIN_INTERVAL;
        const maxInterval = SECOND_HEART_EFFECT_CONFIG.BEAT.MAX_INTERVAL;
        return Math.random() * (maxInterval - minInterval) + minInterval;
    }

    // 透明度淡入。
    fadeIn() {
        const fadeInterval = setInterval(() => {
            this.opacity += SECOND_HEART_EFFECT_CONFIG.OPACITY.FADE_IN_INCREMENT;
            if (this.opacity >= 1) {
                clearInterval(fadeInterval);
                this.opacity = 1;
            }
        }, ANIMATION_TIMING_CONFIG.SECOND_HEART.FADE_INTERVAL_BASE * SECOND_HEART_EFFECT_CONFIG.OPACITY.FADE_IN_INCREMENT);
    }
    // 添加线性插值函数
    // 线性插值工具。
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
    // 主动画循环：更新心跳并绘制。
    animate() {
        if (!this.isVisible) return;
        this.time++;
        this.updateBeat();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    // 更新心跳强度和缩放，让第二颗爱心跟随节奏跳动。
    updateBeat() {
        if (this.time >= this.lastBeat + this.nextBeatTime) {
            this.lastBeat = this.time;
            this.nextBeatTime = this.getRandomBeatInterval();
            this.currentBeatStrength = SECOND_HEART_EFFECT_CONFIG.BEAT.STRENGTH;
            this.isBeat = true;
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
            const progress = Math.min(elapsed / ANIMATION_TIMING_CONFIG.SECOND_HEART.ADJUSTMENT_DURATION, 1);
            const easeProgress = this.easeInOutCubic(progress);

            this.rotation = easeProgress * (Math.PI / 12);
            this.offset = easeProgress * 100;
            this.offsetY = easeProgress * 30
        }

        this.ctx.translate(
            this.canvas.width * 0.5 + this.offset + this.horizontalOffset,
            this.canvas.height * 0.5 + this.offsetY
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

    // 绘制心跳余波。
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

    // 绘制第二颗爱心主体。
    drawMainHeart() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 100;

        this.ctx.save();
        this.ctx.scale(scale, scale);

        const gradient = this.ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
        SECOND_HEART_EFFECT_CONFIG.GRADIENT.COLORS.forEach(({ stop, color }) => {
            gradient.addColorStop(stop, `rgba(${color.join(',')}, ${this.opacity})`);
        });

        this.ctx.shadowColor = `rgba(${SECOND_HEART_EFFECT_CONFIG.SHADOW.COLOR.join(',')}, ${this.opacity * (this.isBeat ? 0.8 : 0.6)})`;
        this.ctx.shadowBlur = (this.isBeat ? SECOND_HEART_EFFECT_CONFIG.SHADOW.BLUR_BEAT : SECOND_HEART_EFFECT_CONFIG.SHADOW.BLUR_NORMAL) / scale;
        this.ctx.shadowOffsetX = SECOND_HEART_EFFECT_CONFIG.SHADOW.OFFSET_X / scale;
        this.ctx.shadowOffsetY = SECOND_HEART_EFFECT_CONFIG.SHADOW.OFFSET_Y / scale;

        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = `rgba(176, 16, 48, ${this.opacity})`;
        this.ctx.lineWidth = 3 / scale;
        this.ctx.fill(getHeartPath());
        this.ctx.stroke(getHeartPath());
        this.ctx.restore();
    }

    // 绘制第二颗爱心高光。
    drawHighlight() {
        const scale = Math.min(this.canvas.width, this.canvas.height) / 100;

        this.ctx.save();
        this.ctx.scale(scale, scale);

        const highlightGradient = this.ctx.createRadialGradient(-4, -4, 0, -4, -4, 6);
        SECOND_HEART_EFFECT_CONFIG.HIGHLIGHT_GRADIENT.COLORS.forEach(({ stop, color, opacity }) => {
            highlightGradient.addColorStop(stop, `rgba(${color.join(',')}, ${this.opacity * opacity})`);
        });

        this.ctx.fillStyle = highlightGradient;
        this.ctx.fill(getHeartPath());
        this.ctx.restore();
    }
}

export const secondHeart = new SecondHeartEffect();
