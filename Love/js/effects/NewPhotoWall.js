import { resourceLoader } from "../resourceLoader.js";
import { newPixelatedPreview } from "./NewPixelatedPreview.js";
import { PHOTO_WALL_CONFIG, PHOTO_WALL_TIMING_CONFIG, RESOURCE_CONFIG } from '../config/config.js';

/**
 * 右侧 3D 照片墙。
 *
 * 这个模块负责：
 * 1. 按心形模板创建 45 张照片的 grid 布局。
 * 2. 保留原始 translateZ / rotateX / rotateY / scale 视觉效果。
 * 3. 使用启动阶段生成的缩略图作为墙面小图，降低首次显示卡顿。
 * 4. 支持先隐藏构建和渲染预热，到剧情节点时再显示并开始随机选择。
 * 5. 随机选中照片后触发像素化预览，完成指定次数后派发最终事件。
 */
class NewPhotoWall {
    constructor(options = {}) {
        // hidden/autoStart 用于支持“启动阶段提前构建，剧情节点再显示”的流程。
        this.options = {
            hidden: false,
            autoStart: true,
            startDelay: PHOTO_WALL_TIMING_CONFIG.START_DELAY,
            fadeDuration: PHOTO_WALL_TIMING_CONFIG.FADE_DURATION,
            ...options
        };
        this.isSelecting = false;
        this.pixelatedPreview = newPixelatedPreview;
        this.centerDisplayCount = 0;
        this.maxCenterDisplay = this.getConfiguredMaxCenterDisplay();
        this.animationTimer = null;
        this.photosReady = false;
        this.selectionStarted = false;
        this.startRequested = false;
        this.readyPromise = new Promise(resolve => {
            this.resolveReady = resolve;
        });

        this.createContainer();
        if (this.options.hidden) {
            this.setVisible(false);
        }
        this.loadPhotos();
    }

    /**
     * 读取配置页保存的“显示几张照片后出现最终文案”。
     *
     * 没有自定义配置时继续使用默认 10 次；这里做范围限制，避免误填 0 或很大的数
     * 让最终文案过早出现或迟迟不出现。
     */
    getConfiguredMaxCenterDisplay() {
        const fallback = PHOTO_WALL_CONFIG.MAX_CENTER_DISPLAY;
        const configuredCount = Number.parseInt(resourceLoader.getUserConfig()?.photosBeforeMessage, 10);
        if (!Number.isFinite(configuredCount)) {
            return fallback;
        }

        return Math.min(Math.max(configuredCount, 1), RESOURCE_CONFIG.IMAGES.totalCount);
    }

    /**
     * 控制照片墙可见性。
     *
     * 这里故意不用 display: none，因为 display:none 会让浏览器跳过布局和绘制，
     * 到真正显示时仍然可能卡顿。使用 opacity:0 可以让元素提前进入渲染树。
     */
    setVisible(isVisible) {
        const opacity = isVisible ? '1' : '0';
        const pointerEvents = isVisible ? '' : 'none';
        if (this.titleContainer) {
            this.titleContainer.style.opacity = opacity;
            this.titleContainer.style.pointerEvents = pointerEvents;
        }
        if (this.container) {
            this.container.style.opacity = opacity;
            this.container.style.pointerEvents = pointerEvents;
        }
    }

    /**
     * 显示照片墙，并请求开始随机选择。
     */
    showAndStart() {
        this.setVisible(true);
        this.requestStart();
    }

    /**
     * 预热渲染。
     *
     * 在加载页阶段读取布局信息，并等待两帧，给浏览器提前完成 layout/paint/composite
     * 的机会，减少照片墙真正出现时的首帧压力。
     */
    warmUpRender() {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                this.titleContainer?.getBoundingClientRect();
                this.container?.getBoundingClientRect();
                this.grid?.getBoundingClientRect();
                requestAnimationFrame(resolve);
            });
        });
    }

    /**
     * 返回照片墙准备完成的 Promise。
     */
    waitUntilReady() {
        return this.readyPromise;
    }

    /**
     * 请求开始随机选择。
     *
     * 如果照片还没加载完，会先记录 startRequested，等 maybeStart 标记 ready 后再启动。
     * selectionStarted 防止外部重复调用导致多个随机选择循环叠加。
     */
    requestStart(delay) {
        const startDelay = typeof delay === 'number' ? delay : this.options.startDelay;
        if (this.selectionStarted) {
            return;
        }

        this.startRequested = true;
        if (!this.photosReady) {
            return;
        }

        this.selectionStarted = true;
        setTimeout(() => {
            this.startRandomSelection();
        }, startDelay);
    }

    /**
     * 旧的初始化入口，目前主流程直接通过 constructor 初始化。
     */
    initGallery() {
        this.createContainer();
        this.loadPhotos();
        this.bindEvents();
    }

    /**
     * 开始配置次数的“随机选择 + 中心像素化展示”流程。
     *
     * 每次 pixelatedPreviewComplete 事件回来后才进入下一次，避免动画互相重叠。
     */
    startRandomSelection() {
        const runSelection = async () => {
            if (!this.isSelecting) {
                this.isSelecting = true;
                await this.randomHighlight();
            }
        };

        runSelection();

        document.addEventListener('pixelatedPreviewComplete', () => {
            setTimeout(() => {
                this.isSelecting = false;
                this.centerDisplayCount++;

                if (this.centerDisplayCount < this.maxCenterDisplay) {
                    runSelection();
                } else {
                    this.continueRandomSelection();
                    setTimeout(() => {
                        document.dispatchEvent(new CustomEvent('centralDisplayCompleted', {
                            detail: {
                                count: this.centerDisplayCount,
                                targetCount: this.maxCenterDisplay
                            }
                        }));
                    }, PHOTO_WALL_TIMING_CONFIG.FINAL_MESSAGE_EVENT_DELAY);
                }
            }, PHOTO_WALL_TIMING_CONFIG.CENTER_DISPLAY_SETTLE_DELAY);
        });
    }

    /**
     * 中心展示结束后，继续让照片墙保持随机高亮动效。
     */
    continueRandomSelection() {
        const photos = Array.from(this.grid.children).filter(photo =>
            photo.style.visibility !== 'hidden'
        );

        const randomSelect = () => {
            if (!this.isSelecting && photos.length > 0) {
                this.isSelecting = true;

                const selector = this.createSelector();
                this.grid.appendChild(selector);

                let jumps = 0;
                const maxJumps = PHOTO_WALL_TIMING_CONFIG.CONTINUOUS_SELECTION.MAX_JUMPS;
                const finalPhoto = photos[Math.floor(Math.random() * photos.length)];

                const jumpInterval = setInterval(() => {
                    if (jumps >= maxJumps) {
                        clearInterval(jumpInterval);
                        if (selector.parentNode === this.grid) {
                            this.grid.removeChild(selector);
                        }

                        finalPhoto.style.transition = PHOTO_WALL_TIMING_CONFIG.CONTINUOUS_SELECTION.SELECTED_TRANSITION;
                        finalPhoto.style.transform = `
                            translateZ(150px)
                            scale(1.2)
                        `;
                        finalPhoto.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.4)';

                        clearTimeout(this.animationTimer);
                        this.animationTimer = setTimeout(() => {
                            const rowIndex = Math.floor(Array.from(this.grid.children).indexOf(finalPhoto) / 9);
                            const colIndex = Array.from(this.grid.children).indexOf(finalPhoto) % 9;

                            finalPhoto.style.transform = `
                                translateZ(${rowIndex * 20 + Math.random() * 50}px)
                                translateY(${Math.random() * 30 - 15}px)
                                translateX(${Math.random() * 30 - 15}px)
                                rotateX(${-rowIndex * 3 + Math.random() * 10 - 5}deg)
                                rotateY(${(colIndex - 4) * 4 + Math.random() * 10 - 5}deg)
                                scale(${0.9 + Math.random() * 0.2})
                            `;
                            finalPhoto.style.boxShadow = `
                                ${-5 + colIndex}px ${5 + rowIndex * 2}px ${15 + rowIndex * 2}px rgba(0,0,0,0.4),
                                inset 0 -2px 5px rgba(255,255,255,0.1),
                                0 0 2px rgba(255,255,255,0.1)
                            `;

                            this.isSelecting = false;
                            randomSelect();
                        }, PHOTO_WALL_TIMING_CONFIG.CONTINUOUS_SELECTION.RESTORE_DELAY);
                        return;
                    }

                    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
                    const rect = randomPhoto.getBoundingClientRect();
                    const gridRect = this.grid.getBoundingClientRect();

                    selector.style.left = `${rect.left - gridRect.left}px`;
                    selector.style.top = `${rect.top - gridRect.top}px`;

                    const computedStyle = window.getComputedStyle(randomPhoto);
                    const transform = computedStyle.transform;
                    if (transform && transform !== 'none') {
                        selector.style.transform = randomPhoto.style.transform;
                    } else {
                        selector.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
                    }

                    jumps++;
                }, PHOTO_WALL_TIMING_CONFIG.CONTINUOUS_SELECTION.JUMP_INTERVAL);
            }
        };

        randomSelect();
    }

    /**
     * 创建标题和照片墙容器。
     *
     * 样式大部分来自 PHOTO_WALL_CONFIG，方便视觉参数集中调整。
     */
    createContainer() {
        const fadeTransition = `opacity ${this.options.fadeDuration}ms ease`;
        const titleContainer = document.createElement('div');
        titleContainer.style.position = 'fixed';
        titleContainer.style.right = '5%';
        titleContainer.style.top = 'calc(50% - 420px)';
        titleContainer.style.width = '800px';
        titleContainer.style.zIndex = '998';
        titleContainer.style.transform = 'none';
        titleContainer.style.transition = fadeTransition;
        titleContainer.style.willChange = 'opacity';

        const title = document.createElement('h2');
        const userTitle = resourceLoader.getUserConfig()?.photoWallTitle?.trim();
        title.textContent = userTitle || PHOTO_WALL_CONFIG.TITLE.TEXT;
        title.style.color = PHOTO_WALL_CONFIG.TITLE.COLOR;
        title.style.textAlign = PHOTO_WALL_CONFIG.TITLE.TEXT_ALIGN;
        title.style.margin = PHOTO_WALL_CONFIG.TITLE.MARGIN;
        title.style.fontSize = PHOTO_WALL_CONFIG.TITLE.FONT_SIZE;
        title.style.fontFamily = PHOTO_WALL_CONFIG.TITLE.FONT_FAMILY;
        title.style.textShadow = PHOTO_WALL_CONFIG.TITLE.TEXT_SHADOW;
        title.style.letterSpacing = PHOTO_WALL_CONFIG.TITLE.LETTER_SPACING;

        titleContainer.appendChild(title);
        document.body.appendChild(titleContainer);
        this.titleContainer = titleContainer;

        const container = document.createElement('div');
        container.style.position = PHOTO_WALL_CONFIG.CONTAINER.POSITION;
        container.style.right = PHOTO_WALL_CONFIG.CONTAINER.RIGHT;
        container.style.top = PHOTO_WALL_CONFIG.CONTAINER.TOP;
        container.style.width = PHOTO_WALL_CONFIG.CONTAINER.WIDTH;
        container.style.padding = PHOTO_WALL_CONFIG.CONTAINER.PADDING;
        container.style.backgroundColor = PHOTO_WALL_CONFIG.CONTAINER.BACKGROUND_COLOR;
        container.style.boxShadow = PHOTO_WALL_CONFIG.CONTAINER.BOX_SHADOW;
        container.style.transform = PHOTO_WALL_CONFIG.CONTAINER.TRANSFORM;
        container.style.borderRadius = PHOTO_WALL_CONFIG.CONTAINER.BORDER_RADIUS;
        container.style.zIndex = PHOTO_WALL_CONFIG.CONTAINER.Z_INDEX;
        container.style.maxHeight = PHOTO_WALL_CONFIG.CONTAINER.MAX_HEIGHT;
        container.style.transition = fadeTransition;
        container.style.willChange = 'opacity';

        const grid = document.createElement('div');
        grid.style.display = PHOTO_WALL_CONFIG.GRID.DISPLAY;
        grid.style.gridTemplateColumns = PHOTO_WALL_CONFIG.GRID.TEMPLATE_COLUMNS;
        grid.style.gap = PHOTO_WALL_CONFIG.GRID.GAP;
        grid.style.padding = PHOTO_WALL_CONFIG.GRID.PADDING;
        grid.style.margin = PHOTO_WALL_CONFIG.GRID.MARGIN;
        grid.style.alignItems = PHOTO_WALL_CONFIG.GRID.ALIGN_ITEMS;
        grid.style.justifyItems = PHOTO_WALL_CONFIG.GRID.JUSTIFY_ITEMS;
        grid.style.height = PHOTO_WALL_CONFIG.GRID.HEIGHT;
        grid.style.overflowY = PHOTO_WALL_CONFIG.GRID.OVERFLOW_Y;
        grid.style.transform = PHOTO_WALL_CONFIG.GRID.TRANSFORM;
        grid.style.transformStyle = PHOTO_WALL_CONFIG.GRID.TRANSFORM_STYLE;
        grid.style.perspective = PHOTO_WALL_CONFIG.GRID.PERSPECTIVE;

        container.appendChild(grid);
        document.body.appendChild(container);

        this.container = container;
        this.grid = grid;
    }

    /**
     * 按心形模板创建照片墙。
     *
     * heartTemplate 中 1 表示放照片，0 表示占位隐藏。照片使用缩略图显示，
     * dataset.fullSrc 记录原图地址，点击放大和像素化预览仍使用原图。
     */
    loadPhotos() {
        // 9 列 8 行的心形模板：1 是照片，0 是隐藏占位。
        const heartTemplate = [
            [0, 0, 1, 1, 0, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0, 0]
        ];

        let photoIndex = 1;
        let loadedImages = 0;
        let failedImages = 0;
        const totalImages = RESOURCE_CONFIG.IMAGES.totalCount;

        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.position = 'absolute';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.color = '#fff';
        loadingIndicator.style.fontFamily = 'KeAi';
        loadingIndicator.style.fontSize = '16px';
        this.grid.appendChild(loadingIndicator);

        // 所有照片节点完成加载后，标记照片墙 ready，并按需要启动随机选择。
        const maybeStart = () => {
            const finishedImages = loadedImages + failedImages;
            loadingIndicator.textContent = `加载进度: ${Math.round(finishedImages / totalImages * 100)}%`;

            if (finishedImages === totalImages) {
                loadingIndicator.remove();
                this.photosReady = true;
                if (this.resolveReady) {
                    this.resolveReady();
                    this.resolveReady = null;
                }
                if (this.options.autoStart || this.startRequested) {
                    this.requestStart();
                }
            }
        };

        const images = resourceLoader.loadedResources.images;
        const thumbnails = resourceLoader.loadedResources.imageThumbnails;

        heartTemplate.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const photo = document.createElement('div');
                if (cell === 1 && photoIndex <= totalImages) {
                    const currentPhotoIndex = photoIndex;

                    photo.style.position = 'relative';
                    photo.style.width = '70px';
                    photo.style.height = '70px';
                    photo.style.display = 'flex';
                    photo.style.justifyContent = 'center';
                    photo.style.alignItems = 'center';
                    photo.style.overflow = 'hidden';
                    photo.style.borderRadius = '10px';
                    photo.style.boxShadow = `
                        ${-5 + colIndex}px ${5 + rowIndex * 2}px ${15 + rowIndex * 2}px rgba(0,0,0,0.4),
                        inset 0 -2px 5px rgba(255,255,255,0.1),
                        0 0 2px rgba(255,255,255,0.1)
                    `;
                    photo.style.transform = `
                        translateZ(${rowIndex * 12}px)
                        rotateX(${-rowIndex * 2}deg)
                        rotateY(${(colIndex - 4) * 3}deg)
                    `;

                    const img = document.createElement('img');
                    const loadedImg = images.get(`img${currentPhotoIndex}`);
                    const originalSrc = loadedImg?.src || resourceLoader.getImageUrl(currentPhotoIndex);
                    const wallSrc = thumbnails.get(`img${currentPhotoIndex}`) || originalSrc;
                    let imageHandled = false;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.cursor = 'pointer';
                    img.style.transition = PHOTO_WALL_TIMING_CONFIG.IMAGE.FADE_TRANSITION;
                    img.decoding = 'async';

                    const markLoaded = async () => {
                        if (imageHandled) return;
                        imageHandled = true;
                        await img.decode?.().catch(() => {});
                        loadedImages++;
                        maybeStart();
                    };

                    const markFailed = () => {
                        if (imageHandled) return;
                        imageHandled = true;
                        failedImages++;
                        maybeStart();
                    };

                    img.addEventListener('load', markLoaded, { once: true });
                    img.addEventListener('error', markFailed, { once: true });
                    img.dataset.fullSrc = originalSrc;
                    img.src = wallSrc;

                    if (loadedImg) {
                        queueMicrotask(markLoaded);
                    }

                    // 每张照片保留独立的 3D 随机偏移和旋转，形成原始照片墙的错落感。
                    const randomZ = Math.random() * 50;
                    const randomY = Math.random() * 30 - 15;
                    const randomX = Math.random() * 30 - 15;
                    const randomRotateX = Math.random() * 10 - 5;
                    const randomRotateY = Math.random() * 10 - 5;

                    photo.style.transform = `
                        translateZ(${rowIndex * 20 + randomZ}px)
                        translateY(${randomY}px)
                        translateX(${randomX}px)
                        rotateX(${-rowIndex * 3 + randomRotateX}deg)
                        rotateY(${(colIndex - 4) * 4 + randomRotateY}deg)
                        scale(${0.9 + Math.random() * 0.2})
                    `;

                    // 悬停时把当前照片向镜头方向推出，增强 3D 层次。
                    photo.addEventListener('mouseover', () => {
                        photo.style.transform = `
                            translateZ(${rowIndex * 20 + randomZ + 150}px)
                            translateY(${randomY}px)
                            translateX(${randomX}px)
                            rotateX(${-rowIndex * 3 + randomRotateX}deg)
                            rotateY(${(colIndex - 4) * 4 + randomRotateY}deg)
                            scale(1.4)
                        `;
                        photo.style.boxShadow = `
                            ${-8 + colIndex}px ${25 + rowIndex * 3}px ${40 + rowIndex * 2}px rgba(0,0,0,0.6),
                            inset 0 -3px 8px rgba(255,255,255,0.2),
                            0 0 12px rgba(255,255,255,0.2)
                        `;
                        photo.style.zIndex = '999';
                    });

                    // 鼠标离开后恢复到创建时的随机 3D 姿态。
                    photo.addEventListener('mouseout', () => {
                        photo.style.transform = `
                            translateZ(${rowIndex * 20 + randomZ}px)
                            translateY(${randomY}px)
                            translateX(${randomX}px)
                            rotateX(${-rowIndex * 3 + randomRotateX}deg)
                            rotateY(${(colIndex - 4) * 4 + randomRotateY}deg)
                            scale(${0.9 + Math.random() * 0.2})
                        `;
                        photo.style.boxShadow = `
                            ${-5 + colIndex}px ${5 + rowIndex * 2}px ${15 + rowIndex * 2}px rgba(0,0,0,0.4),
                            inset 0 -2px 5px rgba(255,255,255,0.1),
                            0 0 2px rgba(255,255,255,0.1)
                        `;
                        photo.style.zIndex = 'auto';
                    });

                    img.addEventListener('click', () => {
                        this.showPreview(img.dataset.fullSrc || img.src);
                    });

                    photo.appendChild(img);
                    photoIndex++;
                } else {
                    photo.style.visibility = 'hidden';
                }
                this.grid.appendChild(photo);
            });
        });
    }

    /**
     * 点击照片后的全屏原图预览。
     */
    showPreview(src) {
        const preview = document.createElement('div');
        preview.style.position = 'fixed';
        preview.style.top = '0';
        preview.style.left = '0';
        preview.style.width = '100%';
        preview.style.height = '100%';
        preview.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        preview.style.zIndex = '1000';
        preview.style.display = 'flex';
        preview.style.justifyContent = 'center';
        preview.style.alignItems = 'center';
        preview.style.cursor = 'pointer';

        const img = document.createElement('img');
        img.src = src;
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.objectFit = 'contain';

        preview.appendChild(img);
        preview.addEventListener('click', () => {
            document.body.removeChild(preview);
        });

        document.body.appendChild(preview);
    }

    /**
     * 创建随机选择时跳动的粉色边框。
     */
    createSelector() {
        const selector = document.createElement('div');
        selector.style.position = 'absolute';
        selector.style.width = '70px';
        selector.style.height = '70px';
        selector.style.border = '4px solid #ff4081';
        selector.style.borderRadius = '10px';
        selector.style.boxShadow = '0 0 30px rgba(255, 64, 129, 0.9), inset 0 0 15px rgba(255, 255, 255, 0.7)';
        selector.style.pointerEvents = 'none';
        selector.style.transition = PHOTO_WALL_TIMING_CONFIG.SELECTOR.TRANSITION;
        selector.style.zIndex = '1000';
        selector.style.animation = PHOTO_WALL_TIMING_CONFIG.SELECTOR.ANIMATION;
        selector.style.backgroundColor = 'rgba(255, 64, 129, 0.2)';
        return selector;
    }

    /**
     * 执行一次随机高亮。
     *
     * 边框会先跳动多次，最终选中一张照片；选中照片会放大到前景，
     * 然后触发像素化预览，最后恢复原来的 3D 姿态。
     */
    randomHighlight() {
        const photos = Array.from(this.grid.children).filter(photo =>
            photo.style.visibility !== 'hidden'
        );

        const selector = this.createSelector();
        this.grid.appendChild(selector);

        let jumps = 0;
        const maxJumps = PHOTO_WALL_TIMING_CONFIG.CENTER_SELECTION.MAX_JUMPS;
        const finalPhoto = photos[Math.floor(Math.random() * photos.length)];

        const jumpInterval = setInterval(() => {
            if (jumps >= maxJumps) {
                clearInterval(jumpInterval);
                if (selector.parentNode === this.grid) {
                    this.grid.removeChild(selector);
                }

                finalPhoto.style.transition = PHOTO_WALL_TIMING_CONFIG.CENTER_SELECTION.SELECTED_TRANSITION;
                finalPhoto.style.transform = `
                    translateZ(200px)
                    scale(1.3)
                    rotateX(0deg)
                    rotateY(0deg)
                `;
                finalPhoto.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.6)';
                finalPhoto.style.zIndex = '999';

                setTimeout(() => {
                    const img = finalPhoto.querySelector('img');
                    if (img) {
                        this.pixelatedPreview.showPixelated(img.dataset.fullSrc || img.src);
                    }
                }, PHOTO_WALL_TIMING_CONFIG.CENTER_SELECTION.PIXELATED_PREVIEW_DELAY);

                setTimeout(() => {
                    const rowIndex = Math.floor(Array.from(this.grid.children).indexOf(finalPhoto) / 9);
                    const colIndex = Array.from(this.grid.children).indexOf(finalPhoto) % 9;
                    const randomZ = Math.random() * 50;
                    const randomY = Math.random() * 30 - 15;
                    const randomX = Math.random() * 30 - 15;
                    const randomRotateX = Math.random() * 10 - 5;
                    const randomRotateY = Math.random() * 10 - 5;

                    finalPhoto.style.transform = `
                        translateZ(${rowIndex * 20 + randomZ}px)
                        translateY(${randomY}px)
                        translateX(${randomX}px)
                        rotateX(${-rowIndex * 3 + randomRotateX}deg)
                        rotateY(${(colIndex - 4) * 4 + randomRotateY}deg)
                        scale(${0.9 + Math.random() * 0.2})
                    `;
                    finalPhoto.style.boxShadow = `
                    ${-5 + colIndex}px ${5 + rowIndex * 2}px ${15 + rowIndex * 2}px rgba(0,0,0,0.4),
                    inset 0 -2px 5px rgba(255,255,255,0.1),
                    0 0 2px rgba(255,255,255,0.1)
                    `;
                    finalPhoto.style.zIndex = 'auto';
                }, PHOTO_WALL_TIMING_CONFIG.CENTER_SELECTION.RESTORE_DELAY);
                return;
            }

            const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
            const rect = randomPhoto.getBoundingClientRect();
            const gridRect = this.grid.getBoundingClientRect();

            selector.style.left = `${rect.left - gridRect.left}px`;
            selector.style.top = `${rect.top - gridRect.top}px`;

            const computedStyle = window.getComputedStyle(randomPhoto);
            const transform = computedStyle.transform;
            if (transform && transform !== 'none') {
                selector.style.transform = randomPhoto.style.transform;
            } else {
                selector.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
            }

            jumps++;
        }, PHOTO_WALL_TIMING_CONFIG.CENTER_SELECTION.JUMP_INTERVAL);
    }

    /**
     * 预留的 resize 处理。
     */
    bindEvents() {
        window.addEventListener('resize', () => {
            const container = document.querySelector('.photo-wall-container');
            if (container) {
                container.style.transform = 'translateY(-50%) perspective(2000px) rotateY(-25deg) rotateX(12deg)';
            }
        });
    }
}

export const newPhotoWall = NewPhotoWall;
