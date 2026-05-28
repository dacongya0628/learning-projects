import { RESOURCE_CONFIG } from './config/config.js';
import { userConfigStore } from './utils/userConfigStore.js';

/**
 * 资源加载器。
 *
 * 页面开始动画前需要先准备字体、音乐和照片。这里统一管理资源列表、
 * 加载状态和进度回调，避免各个效果模块各自发起加载造成卡顿或时序不一致。
 *
 * 额外注意：照片墙显示的是小尺寸图片，但原图很大。加载图片时会同步生成
 * 一份内存缩略图，右侧 3D 照片墙使用缩略图，点击预览和像素化展示仍然使用原图。
 */
class ResourceLoader {
    constructor() {
        // resources 是“要加载什么”的清单；loadedResources 是“已经加载好什么”的缓存。
        this.resources = {
            fonts: RESOURCE_CONFIG.FONTS,
            images: [],
            audio: RESOURCE_CONFIG.AUDIO
        };

        // 根据配置动态生成 img1、img2 ... img45 的资源项，避免手写 45 条路径。
        for (let i = 0; i < RESOURCE_CONFIG.IMAGES.totalCount; i++) {
            this.resources.images.push({
                name: RESOURCE_CONFIG.IMAGES.namingTemplate.replace('$INDEX', i + 1),
                url: `${RESOURCE_CONFIG.IMAGES.basePath}/${i + 1}.${RESOURCE_CONFIG.IMAGES.extensions}`
            });
        }

        this.loadedResources = {
            fonts: new Map(),
            images: new Map(),
            imageThumbnails: new Map(),
            audio: new Map()
        };
        this.onProgress = null; // 添加进度回调
        this.userConfigPrepared = false;
        this.userConfig = null;
        this.readyMode = null;
        this.objectUrls = [];
    }

    /**
     * 读取 Config.html 保存的用户配置。
     *
     * 如果用户选择了自定义资源，就把 IndexedDB 中保存的 Blob 转成 object URL，
     * 并覆盖默认的图片/音乐资源列表；如果没有配置或配置异常，则继续使用项目自带资源。
     */
    async prepareUserConfig() {
        if (this.userConfigPrepared) {
            return;
        }
        this.userConfigPrepared = true;

        this.readyMode = userConfigStore.getReadyMode();
        if (this.readyMode !== 'custom') {
            this.userConfig = null;
            return;
        }

        try {
            const config = await userConfigStore.getConfig();
            this.userConfig = config || null;
            const images = Array.isArray(config?.images) ? config.images : [];

            if (images.length === RESOURCE_CONFIG.IMAGES.totalCount) {
                this.resources.images = images.map((item, index) => {
                    const url = URL.createObjectURL(item.blob);
                    this.objectUrls.push(url);

                    return {
                        name: RESOURCE_CONFIG.IMAGES.namingTemplate.replace('$INDEX', index + 1),
                        url
                    };
                });
            }

            if (config?.audio?.blob) {
                const url = URL.createObjectURL(config.audio.blob);
                this.objectUrls.push(url);
                this.resources.audio = [
                    {
                        name: 'everyTimeWeTouch',
                        path: url
                    }
                ];
            }
        } catch (error) {
            this.userConfig = null;
            console.warn('Failed to load user config; falling back to bundled resources.', error);
        }
    }

    /**
     * 加载全部启动资源。
     *
     * 返回时字体已经注册到 document.fonts，音乐已可播放，图片已加载并生成缩略图。
     * 进度条的“真实度”来自每个资源完成后触发一次 onProgress，而不是按字节统计。
     */
    async loadAll() {
        try {
            await this.prepareUserConfig();
            console.log('开始加载资源...');

            // 加载字体
            const fontPromises = this.resources.fonts.map(font =>
                this.loadFont(font.name, font.path)
            );

            const imagePromises = RESOURCE_CONFIG.IMAGES.preload
                ? this.resources.images.map(img => this.loadImage(img.name, img.url))
                : [];

            // 加载音频
            const audioPromises = this.resources.audio.map(audio =>
                this.loadAudio(audio.name, audio.path)
            );

            // 等待所有资源加载完成
            await Promise.all([
                ...fontPromises,
                ...imagePromises,
                ...audioPromises
            ]);

            console.log('所有资源加载完成！');
            return this.loadedResources;
        } catch (error) {
            console.error('资源加载失败：', error);
            throw error;
        }
    }

    /**
     * 返回需要计入启动进度条的资源数量。
     *
     * 图片预加载开关关闭时，图片不会计入；当前项目为了照片墙流畅，图片预加载已打开。
     */
    getResourceCount() {
        return this.resources.fonts.length +
            (RESOURCE_CONFIG.IMAGES.preload ? this.resources.images.length : 0) +
            this.resources.audio.length;
    }

    getImageUrl(index) {
        return this.resources.images[index - 1]?.url;
    }

    /**
     * 为照片墙生成内存缩略图。
     *
     * 右侧照片墙实际只显示 70px 卡片，直接使用几 MB 的原图会导致首次绘制和
     * GPU 纹理上传很重。这里按居中裁剪方式生成正方形 JPEG，视觉上等价于
     * CSS 的 object-fit: cover，但渲染成本低很多。
     */
    createImageThumbnail(img) {
        try {
            const size = RESOURCE_CONFIG.IMAGES.thumbnailSize || 180;
            const quality = RESOURCE_CONFIG.IMAGES.thumbnailQuality || 0.9;
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;

            if (!width || !height) {
                return null;
            }

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
                return null;
            }

            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = width;
            let sourceHeight = height;

            // 按正方形居中裁剪，保持照片墙小图和 object-fit: cover 的观感一致。
            if (width > height) {
                sourceWidth = height;
                sourceX = (width - sourceWidth) / 2;
            } else if (height > width) {
                sourceHeight = width;
                sourceY = (height - sourceHeight) / 2;
            }

            ctx.drawImage(
                img,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                size,
                size
            );

            return canvas.toDataURL('image/jpeg', quality);
        } catch (error) {
            console.warn('Failed to create photo wall thumbnail; falling back to original image.', error);
            return null;
        }
    }

    /**
     * 加载并注册自定义字体。
     *
     * 字体必须先加载，否则后续文字动画可能先用默认字体绘制，再发生字体替换抖动。
     */
    async loadFont(name, url) {
        try {
            const fontFace = new FontFace(name, `url(${url})`);
            const loadedFont = await fontFace.load();
            document.fonts.add(loadedFont);
            this.loadedResources.fonts.set(name, loadedFont);
            this.onProgress?.(); // 触发进度回调
            console.log(`字体 ${name} 加载成功`);
        } catch (error) {
            console.error(`字体 ${name} 加载失败:`, error);
            throw error;
        }
    }

    /**
     * 加载单张图片并生成照片墙缩略图。
     *
     * onload 只代表图片资源可用，decode 会进一步等待浏览器完成解码；
     * 缩略图生成完成后才触发进度，确保进度条到 100% 时照片墙素材已经准备好。
     */
    loadImage(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                await img.decode?.().catch(() => {});
                const thumbnail = this.createImageThumbnail(img);

                this.loadedResources.images.set(name, img);
                if (thumbnail) {
                    this.loadedResources.imageThumbnails.set(name, thumbnail);
                }
                this.onProgress?.(); // 触发进度回调
                console.log(`图片 ${name} 加载成功`);
                resolve(img);
            };
            img.onerror = () => {
                const error = new Error(`图片 ${name} 加载失败`);
                console.error(error);
                reject(error);
            };
            img.src = url;
        });
    }

    /**
     * 加载音频资源。
     *
     * 使用 canplaythrough 作为完成信号，表示浏览器认为音频已经足够顺畅播放。
     */
    loadAudio(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.loadedResources.audio.set(name, audio);
                this.onProgress?.(); // 触发进度回调
                console.log(`音频 ${name} 加载成功`);
                resolve(audio);
            };
            audio.onerror = () => {
                const error = new Error(`音频 ${name} 加载失败`);
                console.error(error);
                reject(error);
            };
            audio.src = url;
        });
    }

    /**
     * 从缓存中读取已加载资源。
     *
     * type 可取 fonts、images、imageThumbnails、audio。
     */
    getResource(type, name) {
        return this.loadedResources[type].get(name);
    }

    /**
     * 返回 Config.html 保存的完整用户配置。
     *
     * 动画模块可以通过这里读取不属于资源文件本身的配置，例如照片墙标题和歌词时间轴。
     */
    getUserConfig() {
        return this.userConfig;
    }

    /**
     * 返回当前资源模式：custom 表示使用 Config.html 保存的自定义配置，
     * default 表示用户选择了项目自带默认资源。
     */
    getReadyMode() {
        return this.readyMode;
    }
}

// 导出资源加载器实例
export const resourceLoader = new ResourceLoader();
