import { ANIMATION_TIMING_CONFIG, ECG_EFFECT_CONFIG } from '../config/config.js';

/**
 * 心电图效果。
 *
 * 心电图依赖主爱心实例：主爱心跳动越强，波形振幅越明显；主爱心心率变化时，
 * 心电图峰值间隔也会同步变化。为了避免页面一打开就空跑 RAF，动画只在 start()
 * 后启动，stop() 会取消下一帧。
 */
class ECGEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.time = 0;
        this.lastPeak = 0;
        this.opacity = 0;
        this.peakInterval = ANIMATION_TIMING_CONFIG.ECG.INITIAL_PEAK_INTERVAL;
        this.baseY = 0;
        this.heartRef = null;
        this.isActive = false;
        this.lastBeatTime = 0;
        this.currentBeatStrength = 0;
        this.waveWidth = ECG_EFFECT_CONFIG.WAVE.WIDTH;
        this.offsetY = ECG_EFFECT_CONFIG.WAVE.OFFSET_Y;
        this.targetHorizontalOffset = -window.innerWidth * ECG_EFFECT_CONFIG.OFFSET.TARGET_HORIZONTAL;
        this.isHorizontalOffset = false;
        this.offsetStartTime = 0;
        this.horizontalOffset = 0;
        this.targetHorizontalOffset = -window.innerWidth * 0.25; // 目标偏移量
        this.animationFrameId = null;

        this.init();
    }

    // 开始心电图整体横向偏移，和两颗爱心一起给照片墙让位。
    startHorizontalOffset() {
        this.isHorizontalOffset = true;
        this.offsetStartTime = Date.now();
    }

    // 按时间进度计算当前偏移量。
    updateHorizontalOffset() {
        if (!this.isHorizontalOffset) return;

        const elapsed = Date.now() - this.offsetStartTime;
        const duration = ANIMATION_TIMING_CONFIG.ECG.HORIZONTAL_OFFSET_DURATION;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = this.easeInOutCubic(progress);

        this.horizontalOffset = this.targetHorizontalOffset * easeProgress;
    }

    // 根据一个周期内的 progress 生成 P、QRS、T 等近似心电波形。
    generateECGPoint = (x, progress) => {
        if (!this.isActive) return 0;

        if (this.heartRef) {
            this.currentBeatStrength = this.heartRef.isBeat ? 1 : this.heartRef.currentBeatStrength;
        }

        const baseAmplitude = ECG_EFFECT_CONFIG.AMPLITUDE.BASE;
        const amplitude = baseAmplitude * (1 + this.currentBeatStrength * ECG_EFFECT_CONFIG.AMPLITUDE.BEAT_MULTIPLIER);

        // 波形生成
        if (progress < 0.1) {  // P波
            return Math.sin(progress * Math.PI * 10) * amplitude * 0.3;
        } else if (progress < 0.2) {  // PR段
            return Math.sin(progress * Math.PI * 2) * amplitude * 0.05;
        } else if (progress < 0.3) {  // QRS波群
            if (progress < 0.25) {  // Q波
                return -amplitude * 0.3;
            } else if (progress < 0.27) {  // R波
                return amplitude * (this.heartRef && this.heartRef.isBeat ? 1.5 : 1);
            } else {  // S波
                return -amplitude * 0.4;
            }
        } else if (progress < 0.4) {  // ST段
            return Math.sin(progress * Math.PI * 2) * amplitude * 0.05;
        } else if (progress < 0.5) {  // T波
            return Math.sin((progress - 0.4) * Math.PI * 10) * amplitude * 0.4;
        } else {  // 基线波动
            return Math.sin(progress * Math.PI * 2) * amplitude * 0.05;
        }
    }

    // 主动画循环：推进波形点、同步主爱心心率，并请求下一帧。
    animate = () => {
        if (!this.isActive || !this.heartRef) {
            this.animationFrameId = null;
            return;
        }

        this.time++;

        // 使用主心形的心跳频率更新心电图
        const heartRate = this.heartRef.getCurrentHeartRate();
        if (heartRate) {
            const baseFrames = ECG_EFFECT_CONFIG.PEAK_INTERVAL.BASE_FRAMES;
            const speedFactor = Math.min(
                ECG_EFFECT_CONFIG.PEAK_INTERVAL.SPEED_FACTOR_MAX,
                Math.max(ECG_EFFECT_CONFIG.PEAK_INTERVAL.SPEED_FACTOR_MIN, 80 / heartRate)
            );
            this.peakInterval = Math.round(baseFrames * speedFactor);
        }

        const heartX = this.canvas.width / 2;
        const heartY = this.canvas.height / 2;
        const scale = Math.min(this.canvas.width, this.canvas.height) / 80;
        const heartHeight = scale * 30;
        this.baseY = heartY - heartHeight / 2 - 80;

        // 检测心跳状态
        if (this.heartRef.isBeat && Date.now() - this.lastBeatTime > ANIMATION_TIMING_CONFIG.ECG.BEAT_DEBOUNCE) {
            this.lastBeatTime = Date.now();
            this.currentBeatStrength = 1;
        } else {
            this.currentBeatStrength *= 0.95;
        }

        // 初始化点
        if (this.points.length === 0) {
            const startX = heartX - (this.waveWidth / 2);
            for (let i = 0; i < this.waveWidth; i++) {
                const x = startX + i;
                const progress = (i % this.peakInterval) / this.peakInterval;
                const y = this.baseY - this.generateECGPoint(x, progress);
                this.points.push({ x, y });
            }
        } else {
            // 所有点向左移动一个像素
            this.points.forEach(point => point.x--);

            // 添加新点到右侧
            const x = heartX + (this.waveWidth / 2);
            const progress = ((this.time % this.peakInterval) / this.peakInterval);
            const y = this.baseY - this.generateECGPoint(x, progress);
            this.points.push({ x, y });

            // 移除超出左侧的点
            if (this.points[0].x < heartX - (this.waveWidth / 2)) {
                this.points.shift();
            }
        }

        this.drawECG();
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    // 绘制当前心电图基线和波形。
    drawECG() {
        this.updateHorizontalOffset();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 计算新的波形显示区域
        const heartX = this.canvas.width / 2 + this.horizontalOffset;
        const startX = heartX - (this.waveWidth / 2);
        const endX = heartX + (this.waveWidth / 2);

        // 绘制基线
        this.ctx.strokeStyle = `rgba(255, 0, 0, ${this.opacity * 0.2})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, this.baseY);
        this.ctx.lineTo(endX, this.baseY);
        this.ctx.stroke();

        // 绘制心电图波形
        this.ctx.strokeStyle = `rgba(255, 0, 0, ${this.opacity})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const x = point.x + this.horizontalOffset;
            if (i === 0) {
                this.ctx.moveTo(x, point.y);
            } else {
                this.ctx.lineTo(x, point.y);
            }
        }
        this.ctx.stroke();
    }

    // 添加缓动函数
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // 创建全屏透明 Canvas，并监听窗口尺寸变化。
    init() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '2';
        this.canvas.style.opacity = '0';  // 初始设置为不可见
        document.body.appendChild(this.canvas);

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // 启动心电图，并保存主爱心引用作为波形强度和心率来源。
    start(heartInstance) {
        this.heartRef = heartInstance;
        this.isActive = true;
        this.fadeIn();
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.animate);
        }
    }

    // 停止心电图动画并取消未执行的 requestAnimationFrame。
    stop() {
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // 让 Canvas 和波形透明度逐步进入。
    fadeIn() {
        this.canvas.style.transition = ANIMATION_TIMING_CONFIG.ECG.CANVAS_FADE_TRANSITION;
        this.canvas.style.opacity = '1';
        const fadeInterval = setInterval(() => {
            this.opacity += ECG_EFFECT_CONFIG.OPACITY.FADE_IN_INCREMENT;
            if (this.opacity >= 1) {
                clearInterval(fadeInterval);
                this.opacity = 1;
            }
        }, ANIMATION_TIMING_CONFIG.ECG.FADE_IN_INTERVAL);
    }

    // 重新设置 Canvas 尺寸；尺寸变化后清空 points，让波形按新尺寸重建。
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.points = [];
    }
}

export const ecgEffect = new ECGEffect();
