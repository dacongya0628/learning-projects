import { resourceLoader } from './resourceLoader.js';
import { backgroundMusic } from './effects/BackgroundMusicEffect.js';
import { fallingHearts } from './effects/FallingHeartsEffect.js';
import { heartRate } from './effects/HeartRateEffect.js';
import { heart } from './effects/HeartEffect.js';
import { secondHeart } from './effects/SecondHeartEffect.js';
import { ecgEffect } from './effects/ECGEffect.js';
import { newPhotoWall } from './effects/NewPhotoWall.js';
import { ANIMATION_TIMING_CONFIG } from './config/config.js';
import './effects/ProposalMessageEffect.js';

/**
 * 应用入口和剧情编排器。
 *
 * 这个类不负责具体绘制，而是负责：
 * 1. 响应开始按钮。
 * 2. 显示加载进度。
 * 3. 预加载字体、音乐、图片和照片墙缩略图。
 * 4. 提前隐藏构建照片墙并做渲染预热。
 * 5. 按时间顺序启动背景爱心、心率、双爱心、心电图、照片墙和最终文字。
 */
class App {
    constructor() {
        this.startButton = document.querySelector('.start-button');
        this.loadingContainer = document.querySelector('.loading-container');
        this.loadingProgress = document.querySelector('.loading-progress');
        this.loadingText = document.querySelector('.loading-text');
        this.loadingSubtext = document.querySelector('.loading-subtext');
        this.photoWall = null;

        this.bindEvents();
    }

    /**
     * 绑定用户点击入口。
     *
     * 浏览器通常要求音频播放由用户手势触发，所以所有加载和播放都从按钮点击开始。
     */
    bindEvents() {
        this.startButton.addEventListener('click', () => this.init());
    }

    /**
     * 启动整个页面流程。
     *
     * 资源加载完成后先创建隐藏照片墙，并等待照片墙准备和渲染预热完成；
     * 这样后续照片墙真正出现时不需要临时创建 45 张图，整体会更流畅。
     */
    async init() {
        try {
            this.startButton.classList.add('fade-out');
            this.showLoadingContainer();

            await resourceLoader.prepareUserConfig();
            const resources = resourceLoader.getResourceCount();
            let loadedCount = 0;

            // onProgress 每完成一个资源触发一次，进度是“完成数量进度”，不是字节进度。
            resourceLoader.onProgress = () => {
                loadedCount++;
                this.updateProgress(loadedCount, resources);
            };

            await resourceLoader.loadAll();
            this.photoWall = new newPhotoWall({
                hidden: true,
                autoStart: false
            });
            await this.photoWall.waitUntilReady();
            await this.photoWall.warmUpRender();
            await this.fadeOutLoadingContainer({
                loadingFadeOut: ANIMATION_TIMING_CONFIG.LOADING.FADE_OUT,
                readyMessageDuration: ANIMATION_TIMING_CONFIG.LOADING.READY_MESSAGE_DURATION
            });
            backgroundMusic.start();
            this.startAnimations();
        } catch (error) {
            console.error('初始化失败:', error);
            this.loadingText.textContent = '加载失败，请刷新重试';
            if (this.loadingSubtext) {
                this.loadingSubtext.textContent = '资源加载失败';
            }
        }
    }

    /**
     * 用 Promise 包装 setTimeout，让剧情编排可以用 async/await 顺序书写。
     */
    startWithDelay(callback, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                callback();
                resolve();
            }, delay);
        });
    }

    /**
     * 按剧情顺序启动所有动画。
     *
     * 时间线大致为：飘落爱心 -> 心率文字 -> 主爱心 -> 第二颗爱心 ->
     * 心电图 -> 双心调整与左移 -> 右侧照片墙出现。
     */
    async startAnimations() {
        fallingHearts.start();

        await this.startWithDelay(() => heartRate.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HEART_RATE_START_DELAY);
        await this.startWithDelay(() => heart.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.MAIN_HEART_START_DELAY);
        await this.startWithDelay(() => secondHeart.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.SECOND_HEART_START_DELAY);
        // 等两颗爱心都完全淡入后，再进入心电图和照片墙阶段。
        const checkInterval = setInterval(async () => {
            if (heart.opacity >= 1 && secondHeart.opacity >= 1) {
                clearInterval(checkInterval);
                await this.startWithDelay(() => ecgEffect.start(heart), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.ECG_START_DELAY);
                await this.startWithDelay(async () => {
                    heart.startAdjustment();
                    secondHeart.startAdjustment();
                    
                    heartRate.setMainHeart(heart);
                }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HEART_ADJUSTMENT_DELAY)
                await this.startWithDelay(async () => {
                    heart.startHorizontalOffset();
                    secondHeart.startHorizontalOffset();
                    ecgEffect.startHorizontalOffset();
                    heartRate.startHorizontalOffset();
                }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HORIZONTAL_OFFSET_DELAY);
                await this.startWithDelay(() => {
                    if (this.photoWall) {
                        this.photoWall.showAndStart();
                    } else {
                        this.photoWall = new newPhotoWall();
                    }
                }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.PHOTO_WALL_SHOW_DELAY);
            }
        }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.READY_CHECK_INTERVAL);
    }

    /**
     * 更新加载条。
     *
     * percentage 按已完成资源数量计算：字体、音乐、每张图片各算一个资源。
     */
    updateProgress(current, total) {
        const percentage = Math.round((current / total) * 100);
        this.loadingProgress.style.width = `${percentage}%`;
        this.loadingText.textContent = `准备开始我们的故事... ${percentage}%`;
        if (this.loadingSubtext) {
            this.loadingSubtext.textContent = '资源加载中';
        }
        // 调整字体大小
        this.loadingText.style.fontSize = '1.5em';
        this.loadingText.style.lineHeight = '1.5';
    }

    /**
     * 显示加载容器。
     */
    showLoadingContainer() {
        this.loadingContainer.style.display = 'block';
        // 先设置位置
        this.loadingContainer.style.position = 'fixed';
        this.loadingContainer.style.top = '50%';
        this.loadingContainer.style.left = '50%';
        // 然后设置transform
        this.loadingContainer.style.transform = 'translate(-50%, -50%) scale(3)';
        this.loadingContainer.style.transformOrigin = 'center center';

        requestAnimationFrame(() => {
            this.loadingContainer.style.opacity = '1';
        });
    }

    /**
     * 资源和照片墙预热完成后，让加载容器淡出。
     */
    fadeOutLoadingContainer(timing) {
        return new Promise(resolve => {
            this.loadingProgress.style.width = '100%';
            this.loadingText.textContent = '准备就绪，即将开始...';
            if (this.loadingSubtext) {
                this.loadingSubtext.textContent = '资源加载完成';
            }

            setTimeout(() => {
                this.loadingContainer.style.transition = `opacity ${timing.loadingFadeOut}ms ease`;
                this.loadingContainer.style.opacity = '0';

                setTimeout(() => {
                    this.loadingContainer.style.display = 'none';
                    resolve();
                }, timing.loadingFadeOut);
            }, timing.readyMessageDuration);
        });
    }
}

new App();
