import { ANIMATION_TIMING_CONFIG, PIXELATED_PREVIEW_CONFIG } from '../config/config.js';

/**
 * 随机选中照片后的像素化预览效果。
 *
 * 当照片墙随机选中一张照片时，这个模块会把原图缩放到屏幕中央，
 * 切成多个方块，并让方块从屏幕下方沿贝塞尔曲线飞入，最后再散开淡出。
 */
class NewPixelatedPreview {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.pixelSize = PIXELATED_PREVIEW_CONFIG.PIXEL_SIZE;
        this.setupCanvas();
    }

    /**
     * 创建覆盖全屏的预览 Canvas。
     */
    setupCanvas() {
        this.canvas.style.position = PIXELATED_PREVIEW_CONFIG.CANVAS.POSITION;
        this.canvas.style.top = PIXELATED_PREVIEW_CONFIG.CANVAS.TOP;
        this.canvas.style.left = PIXELATED_PREVIEW_CONFIG.CANVAS.LEFT;
        this.canvas.style.width = PIXELATED_PREVIEW_CONFIG.CANVAS.WIDTH;
        this.canvas.style.height = PIXELATED_PREVIEW_CONFIG.CANVAS.HEIGHT;
        this.canvas.style.zIndex = PIXELATED_PREVIEW_CONFIG.CANVAS.Z_INDEX;
        this.canvas.style.pointerEvents = PIXELATED_PREVIEW_CONFIG.CANVAS.POINTER_EVENTS;
        this.canvas.style.opacity = PIXELATED_PREVIEW_CONFIG.CANVAS.OPACITY;
        this.canvas.style.transition = ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.CANVAS_TRANSITION;
        document.body.appendChild(this.canvas);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 同步 Canvas 尺寸。
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * 二阶贝塞尔曲线插值。
     *
     * 用于让像素块从随机起点飞到目标位置时带有自然弧线，而不是直线移动。
     */
    getBezierPoint(t, p0, p1, p2) {
        const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
        const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
        return { x, y };
    }

    /**
     * 绘制单个像素块。
     *
     * 每个 block 保存了源图裁剪区域和当前动画状态；这里负责把它按当前坐标、
     * 旋转和缩放绘制到主 Canvas 上。
     */
    drawBlock(sourceCanvas, block, alpha = 1) {
        const scale = block.scale ?? 1;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.translate(
            Math.round(block.currentX) + block.width / 2,
            Math.round(block.currentY) + block.height / 2
        );
        this.ctx.rotate(block.rotation || 0);
        this.ctx.scale(scale, scale);
        this.ctx.drawImage(
            sourceCanvas,
            block.sourceX,
            block.sourceY,
            block.width,
            block.height,
            -block.width / 2,
            -block.height / 2,
            block.width,
            block.height
        );
        this.ctx.restore();
    }

    /**
     * 展示像素化预览。
     *
     * imgSrc 使用原图路径，保证中央预览清晰；照片墙小图虽然使用缩略图，
     * 但选中后的展示仍然读取原图。
     */
    async showPixelated(imgSrc) {
        const img = new Image();
        img.src = imgSrc;
        await new Promise(resolve => img.onload = resolve);

        const scale = Math.min(
            (this.canvas.width * 0.8) / img.width,
            (this.canvas.height * 0.64) / img.height
        );

        const scaledWidth = Math.floor(img.width * scale);
        const scaledHeight = Math.floor(img.height * scale);
        const x = Math.floor((this.canvas.width - scaledWidth) / 2);
        const y = Math.floor((this.canvas.height - scaledHeight) / 2);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // tempCanvas 保存缩放后的完整照片，后续所有像素块都从这里裁剪。
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        const gridSize = PIXELATED_PREVIEW_CONFIG.GRID_SIZE;
        const cols = Math.floor(scaledWidth / gridSize);
        const rows = Math.floor(scaledHeight / gridSize);

        // gridBlocks 是动画的核心数据结构：每个对象代表一个会飞入、散开的照片块。
        const gridBlocks = [];
        const groups = PIXELATED_PREVIEW_CONFIG.ANIMATION.GROUPS;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const startX = x + j * gridSize;
                const startY = y + i * gridSize;
                const width = Math.min(gridSize, scaledWidth - j * gridSize);
                const height = Math.min(gridSize, scaledHeight - i * gridSize);
                const sourceX = j * gridSize;
                const sourceY = i * gridSize;

                const startingX = Math.random() * this.canvas.width;
                const startingY = this.canvas.height + Math.random() * 200;

                const controlPoint = {
                    x: startingX + (Math.random() - 0.5) * ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.CONTROL_POINT_X_RANGE,
                    y: startingY - 200 - Math.random() * 200
                };

                const group = Math.floor(Math.random() * groups);
                const baseDelay = group * ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.BASE_DELAY;
                const duration = ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.DURATION_MIN + Math.random() * (ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.DURATION_MAX - ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.DURATION_MIN);

                gridBlocks.push({
                    startX, startY, width, height, sourceX, sourceY,
                    currentX: startingX,
                    currentY: startingY,
                    startPoint: { x: startingX, y: startingY },
                    controlPoint,
                    endPoint: { x: startX, y: startY },
                    delay: baseDelay + Math.random() * ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.RANDOM_BLOCK_DELAY_RANGE,
                    duration,
                    startTime: null,
                    arrived: false
                });
            }
        }

        this.canvas.style.opacity = '1';
        let animationStartTime = null;

        // 回弹缓动，让方块抵达目标位置时更有弹性。
        const easeOutBack = t => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };

        const animate = (timestamp) => {
            if (!animationStartTime) animationStartTime = timestamp;
            const elapsedTime = timestamp - animationStartTime;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            let allArrived = true;

            gridBlocks.forEach(block => {
                if (!block.startTime && elapsedTime >= block.delay) {
                    block.startTime = timestamp;
                }

                if (block.startTime) {
                    const blockElapsed = timestamp - block.startTime;
                    const progress = Math.min(blockElapsed / block.duration, 1);
                    const easeProgress = easeOutBack(progress);

                    if (progress < 1) {
                        const point = this.getBezierPoint(
                            easeProgress,
                            block.startPoint,
                            block.controlPoint,
                            block.endPoint
                        );
                        block.currentX = point.x;
                        block.currentY = point.y;
                        allArrived = false;
                    } else if (!block.arrived) {
                        block.currentX = block.endPoint.x;
                        block.currentY = block.endPoint.y;
                        block.arrived = true;
                    }

                    this.drawBlock(tempCanvas, block);
                } else {
                    allArrived = false;
                }
            });

            if (!allArrived) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);

        // 照片完整停留一段时间后，所有方块开始旋转、散开并淡出。
        setTimeout(() => {
            let fadeStartTime = null;
            const fadeDuration = ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.FADE_DURATION;
            const fadeBlocks = gridBlocks.slice();

            // 指数缓动让散开的前半段更明显，后半段自然收尾。
            const easeOutExpo = t => {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            };

            const fadeAnimate = (timestamp) => {
                if (!fadeStartTime) fadeStartTime = timestamp;
                const elapsed = timestamp - fadeStartTime;

                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                if (elapsed < 50) {
                    fadeBlocks.forEach(block => {
                        if (!block.fadeStartTime) {
                            block.fadeStartTime = timestamp;
                            block.rotation = Math.random() * Math.PI * 2;
                            block.rotationSpeed = (Math.random() - 0.5) * 0.02;
                            block.scale = 1;
                            const angle = Math.random() * Math.PI * 2;
                            const speed = 1 + Math.random() * 2;
                            block.fadeDirection = {
                                x: Math.cos(angle) * speed,
                                y: Math.sin(angle) * speed
                            };
                        }
                    });
                }

                fadeBlocks.forEach(block => {
                    if (block.fadeStartTime) {
                        const blockElapsed = timestamp - block.fadeStartTime;
                        const progress = Math.min(blockElapsed / fadeDuration, 1);
                        const easeProgress = easeOutExpo(progress);

                        block.currentX += block.fadeDirection.x * (1 + easeProgress * 3);
                        block.currentY += block.fadeDirection.y * (1 + easeProgress * 3);
                        block.rotation += block.rotationSpeed;
                        block.scale = 1 - easeProgress * 0.5;

                        this.drawBlock(tempCanvas, block, 1 - easeProgress);
                    }
                });

                if (fadeBlocks.some(block => block.fadeStartTime && (timestamp - block.fadeStartTime) < fadeDuration)) {
                    requestAnimationFrame(fadeAnimate);
                } else {
                    let fadeOutStartTime = timestamp;

                    const fadeOutAnimate = (timestamp) => {
                        const elapsed = timestamp - fadeOutStartTime;
                        const progress = Math.min(elapsed / ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.FADE_OUT_DURATION, 1);
                        const alpha = Math.sin(progress * Math.PI * 4) * (1 - progress);

                        this.canvas.style.opacity = alpha;

                        if (progress < 1) {
                            requestAnimationFrame(fadeOutAnimate);
                        } else {
                            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                            document.dispatchEvent(new CustomEvent('pixelatedPreviewComplete'));
                        }
                    };

                    requestAnimationFrame(fadeOutAnimate);
                }
            };

            requestAnimationFrame(fadeAnimate);
        }, ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW.COMPLETE_HOLD_DELAY);
    }
}

export const newPixelatedPreview = new NewPixelatedPreview();
