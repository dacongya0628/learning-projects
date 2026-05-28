<template>
  <!--
    启动按钮。

    保留 index.html 原有交互入口：用户必须先点击按钮，
    浏览器才允许后续播放背景音乐。
  -->
  <button class="start-button" type="button">心动时刻</button>

  <!--
    启动加载层。

    resourceLoader 会在点击后预加载字体、音乐、45 张照片和照片墙缩略图。
    这个容器负责展示进度，加载完成后由 AnimationController 淡出。
  -->
  <div class="loading-container">
    <div class="loading-hearts">
      <span class="heart">♥</span>
      <span class="heart">♥</span>
      <span class="heart">♥</span>
    </div>
    <div class="loading-bar">
      <div class="loading-progress"></div>
    </div>
    <div class="loading-text">准备中... 0%</div>
    <div class="loading-subtext">资源加载中</div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { AnimationController } from '../animation/AnimationController';
import '../styles/style.css';

// 控制器实例只在动画页存在期间保留，离开路由时会调用 destroy() 做基础清理。
let controller: AnimationController | null = null;

onBeforeMount(() => {
  // 动画页样式依赖 body.animation-route 作用域，必须在页面挂载前加上。
  document.title = '❤️💖💕💍💍💍';
  document.body.classList.add('animation-route');
  document.body.classList.remove('config-route');
});

onMounted(async () => {
  // 等待模板里的按钮和加载层真实进入 DOM，再创建旧动画逻辑的控制器。
  await nextTick();
  controller = new AnimationController();
});

onBeforeUnmount(() => {
  // 用户从动画页返回配置页时，解绑入口事件并停止可停止的循环/音乐。
  controller?.destroy();
  controller = null;
  document.body.classList.remove('animation-route');
});
</script>
