// @ts-nocheck
import { resourceLoader } from '../resourceLoader';
import { ANIMATION_TIMING_CONFIG } from '../config/config';

/**
 * 背景音乐和歌词同步效果。
 *
 * 音频资源由 resourceLoader 在启动阶段预加载，真正开始动画后再播放。
 * 这里负责接管已加载的 Audio 对象、做音量淡入，并根据 currentTime 显示对应歌词。
 */
class BackgroundMusicEffect {
    constructor() {
        this.audio = new Audio();
        this.audio.src = './music/everyTimeWeTouch.mp3';  // 修正音
        this.audio.loop = true;
        this.audio.autoplay = true;
        this.audio.muted = true;
        this.isPlaying = false;
        this.volume = 0;
        this.shouldShowLyrics = false;
        this.lyricSyncTimer = null;

        // 创建歌词容器
        this.createLyricsContainer();

        // 创建歌词数据
        this.lyrics = [
            { time: 11, text: "I still hear your voice when you sleep next to me", zn: "当你睡在我身边 我仍可以听见你的声音" },
            { time: 20, text: "I still feel your touch in my dreams", zn: "当我沉浸睡梦中 我仍可以感觉你的抚摸" },
            { time: 29, text: "Forgive me my weakness", zn: "请原谅我的懦弱" },
            { time: 34, text: "But I don't know why", zn: "即使我不知道原因" },
            { time: 39, text: "Without you it's hard to survive", zn: "没有你我难以生存" },
            { time: 48, text: "Cause everytime we touch", zn: "因为当你抚摸我时" },
            { time: 50, text: "I get this feeling", zn: "我都会有这种感觉" },
            { time: 52, text: "And every time we kiss", zn: "每当我们亲吻时" },
            { time: 54, text: "I swear I can fly", zn: "我发誓感觉到漫步云端" },
            { time: 58, text: "Can't you feel my heart beat fast?", zn: "难道你不能感觉到我快速的心跳？" },
            { time: 61, text: "I want this to last", zn: "我希望它能延续不断" },
            { time: 63, text: "Need you by my side", zn: "需要你在我身边" },
            { time: 67, text: "Cause everytime we touch", zn: "因为当你抚摸我时" },
            { time: 69, text: "I feel the static", zn: "我感觉到无尽平静" },
            { time: 72, text: "and everytime we kiss", zn: "每当我们亲吻时" },
            { time: 74, text: "I reach for the sky", zn: "我感觉我翱翔至蓝天" },
            { time: 77, text: "Can't you hear my heart beat so?", zn: "难道你听不到我心跳？" },
            { time: 80, text: "I can't let you go", zn: "我不能让你离开我" },
            { time: 83, text: "Want you in my life", zn: "我要你存在于我生命里" },
            { time: 87, text: "Your arms are my castle", zn: "你的臂膀宛如我的城堡" },
            { time: 92, text: "Your heart is my sky", zn: "你的心宛如白云蓝天" },
            { time: 97, text: "They wipe away tears that I cry", zn: "它们擦去了我流下的眼泪" },
            { time: 106, text: "The good and the bad times", zn: "好与坏" },
            { time: 111, text: "We've been through them all", zn: "我们共同度过" },
            { time: 116, text: "You make me rise when I fall", zn: "当我坠落 你让我重生" },
            { time: 125, text: "Cause everytime we touch", zn: "因为当你抚摸我时" },
            { time: 127, text: "I get this feeling", zn: "我都会有这种感觉" },
            { time: 129, text: "And everytime we kiss", zn: "每当我们亲吻时" },
            { time: 131, text: "I swear I can fly", zn: "我发誓感觉到漫步云端" },
            { time: 134, text: "Can't you feel my heart beat fast?", zn: "难道你不能感觉到我快速的心跳？" },
            { time: 138, text: "I want this to last", zn: "我希望它能延续不断" },
            { time: 140, text: "Need you by my side", zn: "需要你在我身边" },
            { time: 144, text: "Cause everytime we touch", zn: "因为当你抚摸我时" },
            { time: 146, text: "I feel the static", zn: "我感觉到无尽平静" },
            { time: 148, text: "And everytime we kiss", zn: "每当我们亲吻时" },
            { time: 151, text: "I reach for the sky", zn: "我感觉我翱翔至蓝天" },
            { time: 154, text: "Can't you hear my heart beat so?", zn: "难道你听不到我心跳？" },
            { time: 157, text: "I can't let you go", zn: "我不能让你离开我" },
            { time: 160, text: "Want you in my life", zn: "我要你存在于我生命里" }
        ];
        this.defaultLyrics = this.lyrics;

        // 添加音频加载事件监听
        this.audio.addEventListener('error', (e) => {
            console.error('音频加载失败:', e);
            this.retryPlay();
        });
    }

    /**
     * 创建固定在底部的歌词容器。
     *
     * 容器默认透明，只有匹配到当前歌词时才显示；pointer-events 为 none，
     * 防止歌词层挡住页面上的其他交互。
     */
    createLyricsContainer() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '50%';
        container.style.bottom = '100px';  // 调整位置，避免与其他元素重叠
        container.style.transform = 'translateX(-50%)';
        container.style.color = '#fff';
        container.style.textAlign = 'center';
        container.style.fontSize = '24px';
        container.style.fontFamily = 'KeAi';
        container.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        container.style.zIndex = '998';
        container.style.transition = ANIMATION_TIMING_CONFIG.MUSIC.LYRICS_TRANSITION;
        container.style.opacity = '0';
        container.style.lineHeight = '1.5';
        container.style.pointerEvents = 'none';  // 防止干扰交互

        document.body.appendChild(container);
        this.lyricsContainer = container;
    }

    /**
     * 开始播放音乐。
     *
     * 优先使用 resourceLoader 预加载好的音频，避免这里重新请求文件。
     * 如果浏览器因为自动播放策略拒绝播放，会进入 startPlayback 的重试流程。
     */
    start() {
        const userConfig = resourceLoader.getUserConfig();
        const userLyrics = userConfig?.showLyrics && Array.isArray(userConfig.lyrics) ? userConfig.lyrics : [];

        if (userLyrics.length > 0) {
            this.lyrics = userLyrics;
        } else {
            this.lyrics = this.defaultLyrics;
        }
        this.shouldShowLyrics = this.lyrics.length > 0;

        const loadedAudio = resourceLoader.getResource('audio', 'everyTimeWeTouch');
        if (loadedAudio && loadedAudio !== this.audio) {
            this.audio.pause();
            this.audio = loadedAudio;
            this.audio.loop = true;
            this.audio.volume = 0;
        }

        // 移除 muted 状态
        this.audio.muted = false;
        
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this.fadeIn();
                this.startLyricSync();
            }).catch(error => {
                console.error('播放失败，尝试重新播放:', error);
                // 使用 startPlayback 作为备选方案
                this.startPlayback();
            });
        }
    }

    /**
     * 播放失败时的兜底重试。
     *
     * 某些浏览器在音频状态还没准备好时会拒绝 play()，这里按配置间隔重试，
     * 直到播放成功。
     */
    startPlayback() {
        const playAttempt = () => {
            this.audio.muted = false;  // 确保不是静音
            this.audio.play().then(() => {
                this.isPlaying = true;
                this.fadeIn();
                this.startLyricSync();
            }).catch(() => {
                setTimeout(playAttempt, ANIMATION_TIMING_CONFIG.MUSIC.PLAY_RETRY_DELAY);
            });
        };

        playAttempt();
    }

    /**
     * 音频加载错误后的重新加载入口。
     */
    retryPlay() {
        setTimeout(() => {
            this.audio.load();
            this.start();
        }, ANIMATION_TIMING_CONFIG.MUSIC.RETRY_LOAD_DELAY);
    }

    /**
     * 音量淡入，避免音乐突然响起。
     */
    fadeIn() {
        this.audio.volume = 0;  // 从0开始
        let volume = 0;
        const fadeInterval = setInterval(() => {
            if (volume < 1) {
                volume += 0.02;  // 稍微加快淡入速度
                this.audio.volume = Number(volume.toFixed(2));
            } else {
                clearInterval(fadeInterval);
            }
        }, ANIMATION_TIMING_CONFIG.MUSIC.FADE_INTERVAL);
    }

    /**
     * 歌词来自本地配置输入，显示前做一次 HTML 转义，避免特殊字符破坏页面结构。
     */
    escapeLyricText(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    /**
     * 停止歌词同步，并隐藏歌词容器。
     */
    stopLyricSync() {
        if (this.lyricSyncTimer) {
            clearInterval(this.lyricSyncTimer);
            this.lyricSyncTimer = null;
        }

        this.lyricsContainer.style.opacity = '0';
    }

    /**
     * 按音乐播放时间同步歌词。
     *
     * 按配置间隔查找当前应该显示的歌词。歌词数据按时间顺序排列，
     * 当前句的结束时间由下一句的开始时间决定。
     */
    startLyricSync() {
        if (!this.shouldShowLyrics || this.lyrics.length === 0) {
            this.stopLyricSync();
            return;
        }

        this.stopLyricSync();
        this.lyricSyncTimer = setInterval(() => {
            if (this.isPlaying) {
                const currentTime = this.audio.currentTime;
                const currentLyric = this.lyrics.find((lyric, index) => {
                    const nextLyric = this.lyrics[index + 1];
                    return currentTime >= lyric.time &&
                        (!nextLyric || currentTime < nextLyric.time);
                });

                if (currentLyric) {
                    const translatedLine = currentLyric.zn
                        ? `<div style="font-size: 20px; opacity: 0.9;">${this.escapeLyricText(currentLyric.zn)}</div>`
                        : '';

                    this.lyricsContainer.innerHTML = `
                        <div style="margin-bottom: 10px;">${this.escapeLyricText(currentLyric.text)}</div>
                        ${translatedLine}
                    `;
                    this.lyricsContainer.style.opacity = '1';
                } else {
                    this.lyricsContainer.style.opacity = '0';
                }
            }
        }, ANIMATION_TIMING_CONFIG.MUSIC.LYRIC_SYNC_INTERVAL);
    }

    /**
     * 暂停音乐，并隐藏歌词。
     */
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.stopLyricSync();
    }
}

export const backgroundMusic = new BackgroundMusicEffect();


