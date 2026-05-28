<template>
  <main class="config-shell">
    <!--
      顶部操作区。

      四个按钮沿用配置页既有逻辑：
      保存配置、打开动画、全部使用默认资源、清除配置。
    -->
    <header class="config-header">
      <div>
        <p class="eyebrow">Local Setup</p>
        <h1>心动时刻程序配置</h1>
      </div>
      <div class="header-actions">
        <button class="primary-button" id="saveConfig" type="button" disabled>保存配置</button>
        <button class="secondary-button" id="openAnimationTop" type="button">打开动画</button>
        <button class="ghost-button" id="useDefault" type="button">全部使用默认资源（演示效果）</button>
        <button class="danger-button" id="clearConfig" type="button">清除配置</button>
      </div>
    </header>

    <!-- 配置状态提示条。configPage.ts 会根据上传、保存、清除等动作更新这里的文案和状态样式。 -->
    <section class="notice" id="statusMessage">
      首次使用请上传 45 张照片；音乐、标题、最终文案和歌词不填会使用默认配置。
    </section>

    <section class="config-layout">
      <!--
        左侧照片配置区。

        旧业务要求照片必须刚好 45 张才能保存；缩略图、删除按钮和上传进度
        都由 configPage.ts 通过这些固定 id 接管。
      -->
      <section class="panel photo-panel">
        <div class="panel-header">
          <div>
            <h2>照片</h2>
            <p>将按文件名自然排序后保存为 1 到 45 的展示顺序。</p>
          </div>
          <strong id="photoCount">0 / 45</strong>
        </div>

        <label class="upload-zone" for="photoInput">
          <span>选择 45 张照片</span>
          <small>支持 JPG、PNG、WEBP 等图片格式</small>
        </label>
        <input id="photoInput" type="file" accept="image/*" multiple>

        <div class="upload-progress">
          <div class="progress-label">
            <span>照片上传进度</span>
            <strong id="photoProgressText">0%</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="photoProgressBar"></div>
          </div>
        </div>

        <button class="small-button" id="clearPhotos" type="button">清空已选照片</button>

        <div class="photo-preview" id="photoPreview" aria-live="polite"></div>
      </section>

      <!--
        右侧内容配置区。

        这里收集照片墙标题、最终文案、展示次数、音乐和歌词。
        除照片以外，其余字段都允许留空，动画页会回落到默认配置。
      -->
      <section class="panel text-panel">
        <div class="panel-header">
          <div>
            <h2>展示内容配置</h2>
            <p>设置照片墙标题、最终文案、背景音乐和同步歌词。</p>
          </div>
        </div>

        <label class="field-label" for="photoWallTitle">右侧照片墙标题</label>
        <input class="text-input" id="photoWallTitle" type="text" maxlength="40" placeholder="默认：可可爱爱的我们">

        <label class="field-label" for="proposalMessageText">最终文案</label>
        <textarea class="lyrics-input proposal-message-input" id="proposalMessageText" maxlength="120" spellcheck="false" placeholder="默认：&#10;XXX女士&#10;你愿意嫁给&#10;XXX先生吗？"></textarea>
        <p class="field-help">每一行会作为最终文案的一行显示；留空时使用项目默认文案。</p>

        <label class="field-label" for="photosBeforeMessage">显示几张照片后显示最终文案</label>
        <input class="text-input number-input" id="photosBeforeMessage" type="number" min="1" max="45" step="1" value="10">
        <p class="field-help">默认 10 次；数值越大，右侧照片墙随机放大的照片会展示得越久。</p>

        <!-- 背景音乐配置。音频只允许保留一个文件，再次选择会替换当前自定义音乐。 -->
        <div class="panel-section music-section">
          <div class="section-heading">
            <h3>背景音乐</h3>
            <p>上传后会替换默认音乐；不上传则继续使用项目自带音乐。</p>
          </div>

          <label class="upload-zone compact" for="musicInput">
            <span>选择背景音乐</span>
            <small>支持 MP3、WAV、M4A 等音频格式</small>
          </label>
          <input id="musicInput" type="file" accept="audio/*">

          <div class="upload-progress">
            <div class="progress-label">
              <span>音频上传进度</span>
              <strong id="musicProgressText">0 / 1</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="musicProgressBar"></div>
            </div>
          </div>

          <div class="music-summary" id="musicSummary">未选择音乐，将使用默认音乐。</div>
          <button class="small-button" id="clearMusic" type="button" disabled>移除自定义音乐</button>
        </div>

        <!--
          歌词配置。

          默认不显示自定义输入区；开启开关后，用户可以手动输入歌词，
          也可以上传 LRC 文件。保存时 configPage.ts 会统一解析为时间轴。
        -->
        <div class="panel-section lyrics-section">
          <div class="section-heading">
            <h3>歌词时间轴</h3>
            <p>不填写时使用默认歌词；开启后可以填写或上传自定义歌词。</p>
          </div>

          <label class="switch-field" for="showLyricsToggle">
            <span class="switch-copy">
              <strong>自定义歌词</strong>
              <small>开启后保存你填写或上传的歌词；留空时继续使用默认歌词。</small>
            </span>
            <input class="switch-input" id="showLyricsToggle" type="checkbox">
            <span class="switch-track" aria-hidden="true">
              <span class="switch-thumb"></span>
            </span>
          </label>

          <div class="lyrics-editor" id="lyricsEditor" hidden>
            <div class="lyrics-source-tabs" role="radiogroup" aria-label="歌词来源">
              <label class="lyrics-source-option">
                <input type="radio" name="lyricsSource" value="manual" checked>
                <span>手动填写</span>
              </label>
              <label class="lyrics-source-option">
                <input type="radio" name="lyricsSource" value="file">
                <span>上传 LRC</span>
              </label>
            </div>

            <div class="lyrics-manual-panel" id="lyricsManualPanel">
              <textarea class="lyrics-input" id="lyricsInput" aria-label="歌词时间轴" spellcheck="false" placeholder="[00:11] I still hear your voice when you sleep next to me | 当你睡在我身边，我仍能听见你的声音&#10;[00:20] I still feel your touch in my dreams | 我仍能在梦里感觉到你的触碰"></textarea>
              <p class="field-help">格式：<code>[分钟:秒]</code> 原文 <code>|</code> 翻译；兼容 <code>[00:00.000]</code> 这类 LRC 时间戳。</p>
            </div>

            <div class="lyrics-file-panel" id="lyricsFilePanel" hidden>
              <label class="upload-zone compact" for="lyricsFileInput">
                <span>选择 LRC 文件</span>
                <small>支持 .lrc 或文本歌词文件</small>
              </label>
              <input id="lyricsFileInput" type="file" accept=".lrc,text/plain">
              <div class="lyrics-file-summary" id="lyricsFileSummary">未选择 LRC 文件。</div>
              <button class="small-button" id="clearLyricsFile" type="button" disabled>移除 LRC 文件</button>
            </div>
          </div>
        </div>
      </section>
    </section>

    <!-- 原创声明，保持独立展示，不参与配置数据保存。 -->
    <footer class="config-footer">
      <strong>原创声明</strong>
      <p>本项目由个人开发者独立完成，仅用于学习交流和技术实践。</p>
      <p>原创不易，转载请注明作者及来源，禁止恶意搬运、抄袭或用于商业用途。项目中如涉及第三方资源，版权归原作者所有，仅作学习研究使用。如有侵权，请联系删除。</p>
      <p class="developer-note">开发者：大葱鸭 / QQ：605756936 / 版本号：v0.0.1</p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeMount, onBeforeUnmount, onMounted } from 'vue';
import { initConfigPage } from '../configPage';
import '../styles/config.css';

onBeforeMount(() => {
  // 配置页样式依赖 body.config-route 作用域；切换路由时同时清掉动画页作用域。
  document.title = '程序配置 - 心动时刻';
  document.body.classList.add('config-route');
  document.body.classList.remove('animation-route');
});

onMounted(async () => {
  // 等待 Vue 模板渲染完成，再让配置页脚本通过 id 查询并绑定事件。
  await nextTick();
  initConfigPage();
});

onBeforeUnmount(() => {
  // 离开配置页时移除 body 作用域，避免影响动画页。
  document.body.classList.remove('config-route');
});
</script>
