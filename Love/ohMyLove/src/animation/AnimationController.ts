// @ts-nocheck
import { resourceLoader } from '../resourceLoader';
import { backgroundMusic } from '../effects/BackgroundMusicEffect';
import { fallingHearts } from '../effects/FallingHeartsEffect';
import { heartRate } from '../effects/HeartRateEffect';
import { heart } from '../effects/HeartEffect';
import { secondHeart } from '../effects/SecondHeartEffect';
import { ecgEffect } from '../effects/ECGEffect';
import { newPhotoWall as NewPhotoWall } from '../effects/NewPhotoWall';
import { ANIMATION_TIMING_CONFIG } from '../config/config';
import '../effects/ProposalMessageEffect';

/**
 * 动画页总控制器。
 *
 * 原始入口脚本会在 index.html 加载后直接 new App()。Vue 组件需要等
 * AnimationView 挂载完成后再查找按钮和加载 DOM，所以这里把旧入口逻辑
 * 包成可实例化、可解绑的控制器，但内部剧情节奏和资源预热流程保持原样。
 */
export class AnimationController {
  constructor() {
    // 这些 DOM 都来自 AnimationView.vue 的模板；必须等组件 mounted 后才能查询。
    this.startButton = document.querySelector('.start-button');
    this.loadingContainer = document.querySelector('.loading-container');
    this.loadingProgress = document.querySelector('.loading-progress');
    this.loadingText = document.querySelector('.loading-text');
    this.loadingSubtext = document.querySelector('.loading-subtext');

    // photoWall 会在资源预加载完成后提前创建，但先保持透明隐藏。
    this.photoWall = null;

    // 防止用户连续点击开始按钮导致资源加载和动画循环重复启动。
    this.hasStarted = false;

    // 记录由控制器创建的 timer，路由离开时可以统一清理。
    // 各个效果模块内部自己的动画循环仍保持原有逻辑。
    this.timers = new Set();
    this.intervals = new Set();

    // 使用稳定函数引用，destroy() 时才能准确 removeEventListener。
    this.handleStart = () => this.init();
    this.bindEvents();
  }

  /**
   * 绑定用户点击入口。
   *
   * 音乐播放必须由用户手势触发，所以资源加载、音乐播放和所有动画都从这个按钮开始。
   */
  bindEvents() {
    if (!this.startButton) {
      throw new Error('Animation start button was not found.');
    }

    this.startButton.addEventListener('click', this.handleStart);
  }

  /**
   * 启动完整动画流程。
   *
   * 资源加载完成后，会先创建隐藏状态的 3D 照片墙，并等待照片墙 ready 与渲染预热完成。
   * 这样剧情真正走到照片墙节点时，只需要淡入和启动随机选择，不再临时创建 45 个照片节点。
   */
  async init() {
    if (this.hasStarted) {
      return;
    }

    this.hasStarted = true;

    try {
      this.startButton.classList.add('fade-out');
      this.showLoadingContainer();

      await resourceLoader.prepareUserConfig();
      const resources = resourceLoader.getResourceCount();
      let loadedCount = 0;

      // 进度按“资源完成数量”计算：字体、音乐、每张图片各算一个完成项。
      resourceLoader.onProgress = () => {
        loadedCount++;
        this.updateProgress(loadedCount, resources);
      };

      await resourceLoader.loadAll();

      this.photoWall = new NewPhotoWall({
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
      console.error('初始化失败', error);
      this.loadingText.textContent = '加载失败，请刷新重试';
      if (this.loadingSubtext) {
        this.loadingSubtext.textContent = '资源加载失败';
      }
      this.hasStarted = false;
    }
  }

  /**
   * Promise 化的 setTimeout，便于按剧情顺序编排动画节点。
   */
  startWithDelay(callback, delay) {
    return new Promise(resolve => {
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        callback();
        resolve();
      }, delay);

      this.timers.add(timer);
    });
  }

  /**
   * 按既定剧情顺序启动所有动画：
   * 背景爱心 -> 心率文字 -> 主爱心 -> 第二颗爱心 -> 心电图 ->
   * 双心构图调整 -> 整体左移 -> 右侧照片墙淡入并开始随机展示。
   */
  async startAnimations() {
    fallingHearts.start();

    await this.startWithDelay(() => heartRate.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HEART_RATE_START_DELAY);
    await this.startWithDelay(() => heart.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.MAIN_HEART_START_DELAY);
    await this.startWithDelay(() => secondHeart.start(), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.SECOND_HEART_START_DELAY);

    const checkInterval = window.setInterval(async () => {
      if (heart.opacity >= 1 && secondHeart.opacity >= 1) {
        window.clearInterval(checkInterval);
        this.intervals.delete(checkInterval);

        await this.startWithDelay(() => ecgEffect.start(heart), ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.ECG_START_DELAY);
        await this.startWithDelay(() => {
          heart.startAdjustment();
          secondHeart.startAdjustment();
          heartRate.setMainHeart(heart);
        }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HEART_ADJUSTMENT_DELAY);
        await this.startWithDelay(() => {
          heart.startHorizontalOffset();
          secondHeart.startHorizontalOffset();
          ecgEffect.startHorizontalOffset();
          heartRate.startHorizontalOffset();
        }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.HORIZONTAL_OFFSET_DELAY);
        await this.startWithDelay(() => {
          if (this.photoWall) {
            this.photoWall.showAndStart();
          } else {
            this.photoWall = new NewPhotoWall();
          }
        }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.PHOTO_WALL_SHOW_DELAY);
      }
    }, ANIMATION_TIMING_CONFIG.MAIN_SEQUENCE.READY_CHECK_INTERVAL);

    this.intervals.add(checkInterval);
  }

  /**
   * 更新加载条和加载文案。
   */
  updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    this.loadingProgress.style.width = `${percentage}%`;
    this.loadingText.textContent = `准备开始我们的故事... ${percentage}%`;
    if (this.loadingSubtext) {
      this.loadingSubtext.textContent = '资源加载中';
    }
    this.loadingText.style.fontSize = '1.5em';
    this.loadingText.style.lineHeight = '1.5';
  }

  /**
   * 显示居中的加载容器。
   */
  showLoadingContainer() {
    this.loadingContainer.style.display = 'block';
    this.loadingContainer.style.position = 'fixed';
    this.loadingContainer.style.top = '50%';
    this.loadingContainer.style.left = '50%';
    this.loadingContainer.style.transform = 'translate(-50%, -50%) scale(3)';
    this.loadingContainer.style.transformOrigin = 'center center';

    requestAnimationFrame(() => {
      this.loadingContainer.style.opacity = '1';
    });
  }

  /**
   * 资源和照片墙预热完成后淡出加载层。
   */
  fadeOutLoadingContainer(timing) {
    return new Promise(resolve => {
      this.loadingProgress.style.width = '100%';
      this.loadingText.textContent = '准备就绪，即将开始...';
      if (this.loadingSubtext) {
        this.loadingSubtext.textContent = '资源加载完成';
      }

      const readyTimer = window.setTimeout(() => {
        this.timers.delete(readyTimer);
        this.loadingContainer.style.transition = `opacity ${timing.loadingFadeOut}ms ease`;
        this.loadingContainer.style.opacity = '0';

        const fadeTimer = window.setTimeout(() => {
          this.timers.delete(fadeTimer);
          this.loadingContainer.style.display = 'none';
          resolve();
        }, timing.loadingFadeOut);

        this.timers.add(fadeTimer);
      }, timing.readyMessageDuration);

      this.timers.add(readyTimer);
    });
  }

  /**
   * Vue 路由离开动画页时解绑入口和停止可停止的循环。
   */
  destroy() {
    this.startButton?.removeEventListener('click', this.handleStart);
    this.timers.forEach(timer => window.clearTimeout(timer));
    this.intervals.forEach(interval => window.clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
    fallingHearts.stop();
    backgroundMusic.pause();
  }
}
