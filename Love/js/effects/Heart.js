import { HEART_CONFIG } from '../config/config.js';
import { getHeartPath } from '../utils/heartPath.js';

/**
 * 单颗飘落爱心粒子。
 *
 * FallingHeartsEffect 会创建多颗 Heart 实例。每颗爱心都有自己的速度、
 * 摆动幅度、旋转角度和透明度，因此背景下落时不会显得机械重复。
 */
export class Heart {
    constructor(canvas, x, y) {
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.init();
    }

    /**
     * 为当前爱心生成随机外观和运动参数。
     *
     * reset 时也会重新调用，保证爱心从顶部再次落下时有新的随机状态。
     */
    init() {
        const { SIZE, SPEED, OSCILLATION, ROTATION, OPACITY } = HEART_CONFIG;
        this.size = Math.random() * (SIZE.MAX - SIZE.MIN) + SIZE.MIN;
        this.speed = Math.random() * (SPEED.MAX - SPEED.MIN) + SPEED.MIN;
        this.oscillationSpeed = Math.random() * (OSCILLATION.SPEED_MAX - OSCILLATION.SPEED_MIN) + OSCILLATION.SPEED_MIN;
        this.oscillationAmplitude = Math.random() * (OSCILLATION.AMPLITUDE_MAX - OSCILLATION.AMPLITUDE_MIN) + OSCILLATION.AMPLITUDE_MIN;
        this.angle = Math.random() * (ROTATION.ANGLE_MAX - ROTATION.ANGLE_MIN) + ROTATION.ANGLE_MIN;
        this.rotationSpeed = Math.random() * (ROTATION.SPEED_MAX - ROTATION.SPEED_MIN) + ROTATION.SPEED_MIN;
        this.opacity = Math.random() * (OPACITY.MAX - OPACITY.MIN) + OPACITY.MIN;
    }

    /**
     * 更新粒子位置。
     *
     * y 方向持续下落，x 方向用 sin 做轻微左右摆动；落出屏幕后从顶部重生。
     */
    update() {
        this.y += this.speed;
        this.x += Math.sin(this.y * this.oscillationSpeed) * this.oscillationAmplitude;
        this.angle += this.rotationSpeed;

        if (this.y > this.canvas.height + this.size) {
            this.reset();
        }
    }

    /**
     * 将爱心放回屏幕上方，并重新随机化参数。
     */
    reset() {
        this.y = -this.size;
        this.x = Math.random() * this.canvas.width;
        this.init();
    }

    /**
     * 绘制当前爱心。
     *
     * 这里通过 translate/rotate/scale 把缓存的标准爱心 Path2D 变成不同位置、
     * 不同大小和不同角度的小爱心。
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.scale(this.size / 20, this.size / 20);

        const gradient = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
        gradient.addColorStop(0, `rgba(255, 58, 74, ${this.opacity})`);
        gradient.addColorStop(0.3, `rgba(255, 30, 58, ${this.opacity})`);
        gradient.addColorStop(0.6, `rgba(220, 20, 60, ${this.opacity})`);
        gradient.addColorStop(1, `rgba(176, 16, 48, ${this.opacity})`);

        this.drawHeartShape(ctx, gradient);
        this.drawHighlight(ctx);

        ctx.restore();
    }

    /**
     * 绘制爱心主体，包括阴影、渐变填充和描边。
     */
    drawHeartShape(ctx, gradient) {
        const { SHADOW, STROKE } = HEART_CONFIG;
        ctx.beginPath();
        ctx.shadowColor = `rgba(${SHADOW.COLOR}, ${this.opacity * SHADOW.OPACITY})`;
        ctx.shadowBlur = SHADOW.BLUR;
        ctx.shadowOffsetX = SHADOW.OFFSET_X;
        ctx.shadowOffsetY = SHADOW.OFFSET_Y;

        ctx.fillStyle = gradient;
        ctx.strokeStyle = `rgba(${STROKE.COLOR}, ${this.opacity})`;
        ctx.lineWidth = STROKE.WIDTH;
        ctx.fill(getHeartPath());
        ctx.stroke(getHeartPath());
    }

    /**
     * 绘制左上角高光，让小爱心有一点立体感。
     */
    drawHighlight(ctx) {
        const { HIGHLIGHT_GRADIENT } = HEART_CONFIG;
        ctx.beginPath();
        const highlightGradient = ctx.createRadialGradient(-4, -4, 0, -4, -4, 6);
        
        HIGHLIGHT_GRADIENT.COLORS.forEach(color => {
            highlightGradient.addColorStop(color.stop, `rgba(${color.color}, ${this.opacity * color.opacity})`);
        });

        ctx.fillStyle = highlightGradient;
        ctx.fill(getHeartPath());
    }
}
