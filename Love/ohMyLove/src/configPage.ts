// @ts-nocheck
export function initConfigPage() {
    /*
     * Config.html 的所有逻辑都放在这个立即执行函数里，避免把临时变量挂到 window。
     *
     * 配置页只负责收集和保存用户输入：45 张照片、可选音乐、照片墙标题、
     * 最终文案、歌词和照片展示次数。动画页会在启动时从同一个 IndexedDB
     * 记录中读取这些数据。
     */

    // IndexedDB 和 localStorage 使用的固定键名，动画页的 userConfigStore 也依赖这些值。
    const DB_NAME = 'proposalConfigDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'settings';
    const CONFIG_KEY = 'config';
    const READY_KEY = 'proposalConfigReady';

    // 业务约束：照片必须刚好 45 张；最终文案默认在照片墙展示 10 张后出现。
    const REQUIRED_PHOTO_COUNT = 45;
    const DEFAULT_PHOTOS_BEFORE_MESSAGE = 10;

    /*
     * 页面运行态。
     *
     * 上传的 File 对象先放在内存里，只有点击“保存配置”后才写入 IndexedDB。
     * previewItems 保存 DOM 与 object URL 的对应关系，方便删除照片时只更新必要节点，
     * 避免一次性重建 45 张缩略图导致配置页卡顿。
     */
    const state = {
        photos: [],
        music: null,
        previewItems: new Map(),
        thumbnailQueue: [],
        isThumbnailQueueRunning: false,
        isProcessingPhotos: false,
        lyricsFileText: '',
        lyricsFileName: ''
    };

    // 集中缓存 DOM 引用，后续逻辑只读 elements，避免在多处重复 querySelector。
    const elements = {
        statusMessage: document.getElementById('statusMessage'),
        photoInput: document.getElementById('photoInput'),
        clearPhotos: document.getElementById('clearPhotos'),
        photoProgressText: document.getElementById('photoProgressText'),
        photoProgressBar: document.getElementById('photoProgressBar'),
        musicInput: document.getElementById('musicInput'),
        clearMusic: document.getElementById('clearMusic'),
        musicProgressText: document.getElementById('musicProgressText'),
        musicProgressBar: document.getElementById('musicProgressBar'),
        photoCount: document.getElementById('photoCount'),
        photoPreview: document.getElementById('photoPreview'),
        musicSummary: document.getElementById('musicSummary'),
        photoWallTitle: document.getElementById('photoWallTitle'),
        proposalMessageText: document.getElementById('proposalMessageText'),
        photosBeforeMessage: document.getElementById('photosBeforeMessage'),
        showLyricsToggle: document.getElementById('showLyricsToggle'),
        lyricsEditor: document.getElementById('lyricsEditor'),
        lyricsSourceInputs: Array.from(document.querySelectorAll('input[name="lyricsSource"]')),
        lyricsManualPanel: document.getElementById('lyricsManualPanel'),
        lyricsFilePanel: document.getElementById('lyricsFilePanel'),
        lyricsFileInput: document.getElementById('lyricsFileInput'),
        lyricsFileSummary: document.getElementById('lyricsFileSummary'),
        clearLyricsFile: document.getElementById('clearLyricsFile'),
        lyricsInput: document.getElementById('lyricsInput'),
        saveConfig: document.getElementById('saveConfig'),
        useDefault: document.getElementById('useDefault'),
        clearConfig: document.getElementById('clearConfig'),
        openAnimationTop: document.getElementById('openAnimationTop')
    };

    // 更新顶部状态条；type 会切换成功、警告、错误等视觉状态。
    function setStatus(message, type = '') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `notice ${type}`.trim();
    }

    // 等待浏览器完成下一帧绘制，用于批量上传时让进度和缩略图逐步刷新。
    function waitForNextFrame() {
        return new Promise(resolve => requestAnimationFrame(resolve));
    }

    // 把文件大小格式化成更适合展示的 B / KB / MB / GB。
    function formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    }

    /*
     * 解析 LRC 时间戳。
     *
     * 支持 [mm:ss]、[mm:ss.xxx] 和 [hh:mm:ss.xxx]。返回秒数，失败返回 null，
     * 上层会据此区分“时间格式错误”和“这是元信息标签”。
     */
    function parseLyricTime(value) {
        const parts = value.split(':');
        if (parts.length < 2 || parts.length > 3) return null;

        const seconds = Number(parts.pop());
        const minutes = Number(parts.pop());
        const hours = parts.length === 1 ? Number(parts[0]) : 0;
        if (
            !Number.isFinite(hours) ||
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds) ||
            hours < 0 ||
            minutes < 0 ||
            seconds < 0 ||
            seconds >= 60 ||
            (parts.length === 1 && minutes >= 60)
        ) {
            return null;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    // 常见 LRC 元信息标签，这些行不会显示到动画页歌词区域。
    function isLyricMetadataTag(value) {
        return /^(ar|ti|al|au|by|offset|length|re|ve):/i.test(value.trim());
    }

    // 歌词内容用竖线分隔原文和翻译；没有竖线时只保存原文。
    function splitLyricContent(content) {
        const separatorIndex = content.indexOf('|');
        if (separatorIndex === -1) {
            return {
                text: content.trim(),
                zn: ''
            };
        }

        return {
            text: content.slice(0, separatorIndex).trim(),
            zn: content.slice(separatorIndex + 1).trim()
        };
    }

    /*
     * 把手动输入或上传的 LRC 文本转换成动画页可直接使用的时间轴数组。
     *
     * 一行可以有多个时间戳，例如 [00:10][00:20] 同一句歌词；元信息行会跳过。
     * 如果格式错误，这里直接抛出带行号的错误，让保存按钮能给用户明确反馈。
     */
    function parseLyricsText(text) {
        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        const lyrics = [];
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const tagMatches = Array.from(line.matchAll(/\[([^\]]+)\]/g));
            if (tagMatches.length === 0) {
                throw new Error(`第 ${index + 1} 行格式不正确，需要类似 [00:11] 歌词 | 翻译`);
            }

            const times = tagMatches
                .map(match => parseLyricTime(match[1].trim()))
                .filter(time => time !== null);

            if (times.length === 0) {
                if (tagMatches.every(match => isLyricMetadataTag(match[1]))) {
                    continue;
                }

                throw new Error(`第 ${index + 1} 行时间格式不正确，需要使用 [分钟:秒]`);
            }

            const content = line.replace(/^\s*(?:\[[^\]]+\]\s*)+/, '').trim();
            const { text: lyricText, zn } = splitLyricContent(content);
            if (!lyricText) {
                continue;
            }

            times.forEach(time => {
                lyrics.push({
                    time,
                    text: lyricText,
                    zn
                });
            });
        }

        if (lyrics.length === 0) {
            throw new Error('没有识别到可显示的歌词');
        }

        return lyrics.sort((a, b) => a.time - b.time);
    }

    // 照片进度按“已选择照片数量 / 45”计算，不按文件字节计算。
    function updatePhotoProgress() {
        const percent = Math.round((state.photos.length / REQUIRED_PHOTO_COUNT) * 100);
        elements.photoProgressText.textContent = `${state.photos.length} / ${REQUIRED_PHOTO_COUNT} (${percent}%)`;
        elements.photoProgressBar.style.width = `${percent}%`;
    }

    // 音频一次只保留一个文件，所以进度只有 0/1 和 1/1 两种状态。
    function updateMusicProgress() {
        const hasMusic = Boolean(state.music);
        elements.musicProgressText.textContent = hasMusic ? '1 / 1 (100%)' : '0 / 1 (0%)';
        elements.musicProgressBar.style.width = hasMusic ? '100%' : '0%';
    }

    // 让 1.jpg、2.jpg、10.jpg 按数字顺序排列，避免字符串排序把 10 排到 2 前面。
    function naturalSort(files) {
        return files.sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base'
        }));
    }

    // 文件选择框的 accept 只能提示用户，真正处理前仍然要用 MIME 和扩展名双重判断。
    function isImageFile(file) {
        return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
    }

    // 兼容部分浏览器或本地文件没有标准 MIME 的情况。
    function isAudioFile(file) {
        return file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    }

    // LRC 文件通常是 text/plain，也允许用户上传 .txt 格式的歌词。
    function isLyricFile(file) {
        return file.type.startsWith('text/') || /\.(lrc|txt)$/i.test(file.name);
    }

    /*
     * IndexedDB 读出来的是普通对象 + Blob，这里恢复成 File。
     *
     * 配置页复显时仍然需要 name、type、lastModified 等 File 字段，用于排序、
     * 去重、缩略图生成和保存时保持原始文件信息。
     */
    function recordToFile(record, fallbackName) {
        if (!record?.blob) return null;
        if (record.blob instanceof File) return record.blob;

        return new File([record.blob], record.name || fallbackName, {
            type: record.type || record.blob.type || '',
            lastModified: record.lastModified || Date.now()
        });
    }

    // 用文件名、大小和修改时间组成稳定 key，既能去重，也能找到对应的预览 DOM。
    function getFileKey(file) {
        return `${file.name}|${file.size}|${file.lastModified}`;
    }

    /*
     * 合并新选择的照片。
     *
     * 这里不直接渲染 DOM，只负责数据合并并统计新增、重复和溢出数量。
     * 渲染交给 appendPhotosWithProgress 分帧处理，避免一次选择 45 张时页面假死。
     */
    function appendPhotos(files) {
        const seen = new Set(state.photos.map(getFileKey));
        const merged = [...state.photos];
        let added = 0;
        let duplicated = 0;
        let overflow = 0;

        files.forEach(file => {
            const key = getFileKey(file);
            if (seen.has(key)) {
                duplicated++;
                return;
            }

            if (merged.length >= REQUIRED_PHOTO_COUNT) {
                overflow++;
                return;
            }

            seen.add(key);
            merged.push(file);
            added++;
        });

        state.photos = merged;
        return { added, duplicated, overflow };
    }

    // 逐张追加并等待下一帧，让上传进度和预览列表能边处理边更新。
    async function appendPhotosWithProgress(files) {
        const total = {
            added: 0,
            duplicated: 0,
            overflow: 0
        };

        for (const file of files) {
            const result = appendPhotos([file]);
            total.added += result.added;
            total.duplicated += result.duplicated;
            total.overflow += result.overflow;

            if (result.added > 0 || result.overflow > 0) {
                renderPhotoPreview();
                await waitForNextFrame();
            }
        }

        if (total.added === 0) {
            renderPhotoPreview();
        }

        return total;
    }

    // 页面关闭或重置时释放所有 object URL，避免配置页长期打开造成内存泄漏。
    function clearPreviewItems() {
        state.thumbnailQueue = [];
        state.previewItems.forEach(disposePreviewItem);
        state.previewItems.clear();
        elements.photoPreview.innerHTML = '';
    }

    // 移除单个预览项，同时撤销它持有的缩略图 object URL。
    function disposePreviewItem(item) {
        if (item.thumbnailUrl) {
            URL.revokeObjectURL(item.thumbnailUrl);
            item.thumbnailUrl = null;
        }
        item.element.remove();
    }

    /*
     * 为配置页预览生成 360px 方形缩略图。
     *
     * 预览列表只需要小图，直接把原图塞进 45 个 img 会占用大量解码内存。
     * 这里用 createImageBitmap + canvas 居中裁剪，视觉上等价于 object-fit: cover，
     * 但后续滚动和删除都会轻得多。
     */
    function createThumbnailBlob(file) {
        const size = 360;

        return createImageBitmap(file).then(bitmap => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d', { alpha: false });
            const scale = Math.max(size / bitmap.width, size / bitmap.height);
            const sourceWidth = size / scale;
            const sourceHeight = size / scale;
            const sourceX = (bitmap.width - sourceWidth) / 2;
            const sourceY = (bitmap.height - sourceHeight) / 2;

            ctx.drawImage(
                bitmap,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                size,
                size
            );
            bitmap.close?.();

            return new Promise(resolve => {
                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.88);
            });
        });
    }

    /*
     * 把生成好的缩略图挂到对应预览项上。
     *
     * 缩略图生成是异步的，用户可能在生成期间删掉照片，所以设置 src 前必须重新
     * 从 previewItems 查一次，确认这个预览项仍然存在。
     */
    async function attachThumbnail(file, fileKey) {
        try {
            const blob = await createThumbnailBlob(file);
            const item = state.previewItems.get(fileKey);
            if (!item || !blob) {
                return;
            }

            const thumbnailUrl = URL.createObjectURL(blob);
            if (item.thumbnailUrl) {
                URL.revokeObjectURL(item.thumbnailUrl);
            }

            item.thumbnailUrl = thumbnailUrl;
            item.img.src = thumbnailUrl;
        } catch (error) {
            console.warn('生成配置页缩略图失败，将使用原图预览。', error);
            const item = state.previewItems.get(fileKey);
            if (!item) {
                return;
            }

            const fallbackUrl = URL.createObjectURL(file);
            item.thumbnailUrl = fallbackUrl;
            item.img.src = fallbackUrl;
        }
    }

    // 串行执行缩略图任务，并在每张图之后让出一帧，减少批量上传时的主线程压力。
    async function runThumbnailQueue() {
        if (state.isThumbnailQueueRunning) {
            return;
        }

        state.isThumbnailQueueRunning = true;
        while (state.thumbnailQueue.length > 0) {
            const task = state.thumbnailQueue.shift();
            if (state.previewItems.has(task.fileKey)) {
                await attachThumbnail(task.file, task.fileKey);
            }
            await waitForNextFrame();
        }
        state.isThumbnailQueueRunning = false;
    }

    // 新预览项创建后进入缩略图队列；队列已经运行时只追加任务，不重复启动。
    function queueThumbnail(file, fileKey) {
        state.thumbnailQueue.push({ file, fileKey });
        runThumbnailQueue();
    }

    // 创建单张照片的预览 DOM：图片、序号徽标和右上角删除按钮。
    function createPhotoPreviewItem(file, fileKey) {
        const item = document.createElement('div');
        item.className = 'photo-item is-loading';

        const img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.addEventListener('load', () => {
            item.classList.remove('is-loading');
        });

        const badge = document.createElement('span');
        badge.className = 'photo-index';

        const removeButton = document.createElement('button');
        removeButton.className = 'photo-remove';
        removeButton.type = 'button';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => removePhoto(fileKey));

        item.appendChild(img);
        item.appendChild(badge);
        item.appendChild(removeButton);

        return {
            element: item,
            img,
            badge,
            removeButton,
            thumbnailUrl: null
        };
    }

    /*
     * 同步所有按钮状态。
     *
     * 当前业务要求照片必须刚好 45 张才能保存；处理照片期间禁用保存和删除，
     * 避免缩略图队列和照片数组同时被用户操作打乱。
     */
    function updateButtons() {
        const hasRequiredPhotos = state.photos.length === REQUIRED_PHOTO_COUNT;
        elements.saveConfig.disabled = !hasRequiredPhotos || state.isProcessingPhotos;
        elements.clearPhotos.disabled = state.photos.length === 0 || state.isProcessingPhotos;
        elements.clearMusic.disabled = !state.music;
        elements.clearLyricsFile.disabled = !state.lyricsFileText;
        elements.openAnimationTop.disabled = !localStorage.getItem(READY_KEY);

        state.previewItems.forEach(item => {
            item.removeButton.disabled = state.isProcessingPhotos;
        });
    }

    // 最终文案为空时运行时会回落到 config.js 中的默认文案。
    function getProposalMessageText() {
        return elements.proposalMessageText.value.trim();
    }

    // 归一化“显示几张照片后出现最终文案”，始终限制在 1 到 45 之间。
    function getPhotosBeforeMessage() {
        const rawValue = Number.parseInt(elements.photosBeforeMessage.value, 10);
        if (!Number.isFinite(rawValue)) {
            return DEFAULT_PHOTOS_BEFORE_MESSAGE;
        }

        return Math.min(Math.max(rawValue, 1), REQUIRED_PHOTO_COUNT);
    }

    // 用户输入框失焦时写回归一化后的数字，避免保存隐藏的非法值。
    function syncPhotosBeforeMessageInput() {
        elements.photosBeforeMessage.value = getPhotosBeforeMessage();
    }

    // 把多行最终文案拆成数组；空行不显示。
    function parseProposalMessageText(text) {
        return text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
    }

    // 当前歌词来源：手动填写或上传 LRC 文件。
    function getLyricsSource() {
        return elements.lyricsSourceInputs.find(input => input.checked)?.value || 'manual';
    }

    // 切换歌词来源时只改变 radio 状态，具体面板显隐由 syncLyricsControls 统一处理。
    function setLyricsSource(source) {
        const nextSource = source === 'file' ? 'file' : 'manual';
        elements.lyricsSourceInputs.forEach(input => {
            input.checked = input.value === nextSource;
        });
    }

    // 只返回当前启用来源的歌词文本；开关关闭时代表使用默认歌词。
    function getActiveLyricsText() {
        if (!elements.showLyricsToggle.checked) {
            return '';
        }

        return getLyricsSource() === 'file'
            ? state.lyricsFileText.trim()
            : elements.lyricsInput.value.trim();
    }

    // 展示上传的 LRC 文件名，便于用户确认当前保存的是哪份歌词。
    function updateLyricsFileSummary() {
        elements.lyricsFileSummary.textContent = state.lyricsFileName
            ? `${state.lyricsFileName} · 已读取`
            : '未选择 LRC 文件。';
    }

    // 清掉已读取的 LRC 文本和文件名，但不影响手动填写区域。
    function resetLyricsFile() {
        state.lyricsFileText = '';
        state.lyricsFileName = '';
        elements.lyricsFileInput.value = '';
        updateLyricsFileSummary();
    }

    // 根据“自定义歌词”开关和来源 radio 同步编辑器显隐、输入禁用状态。
    function syncLyricsControls() {
        const showLyrics = elements.showLyricsToggle.checked;
        const source = getLyricsSource();
        elements.lyricsEditor.hidden = !showLyrics;
        elements.lyricsManualPanel.hidden = !showLyrics || source !== 'manual';
        elements.lyricsFilePanel.hidden = !showLyrics || source !== 'file';
        elements.lyricsInput.disabled = !showLyrics || source !== 'manual';
        elements.lyricsFileInput.disabled = !showLyrics || source !== 'file';
    }

    /*
     * 渲染照片预览列表。
     *
     * 这个函数复用已经存在的预览项，只新增缺失项、删除无效项，并用
     * DocumentFragment 一次性替换子节点，避免逐个 appendChild 造成多次布局。
     */
    function renderPhotoPreview() {
        elements.photoCount.textContent = `${state.photos.length} / ${REQUIRED_PHOTO_COUNT}`;
        const activeKeys = new Set(state.photos.map(getFileKey));

        state.previewItems.forEach((item, key) => {
            if (!activeKeys.has(key)) {
                disposePreviewItem(item);
                state.previewItems.delete(key);
            }
        });

        const fragment = document.createDocumentFragment();
        state.photos.forEach((file, index) => {
            const fileKey = getFileKey(file);
            let item = state.previewItems.get(fileKey);

            if (!item) {
                item = createPhotoPreviewItem(file, fileKey);
                state.previewItems.set(fileKey, item);
                queueThumbnail(file, fileKey);
            }

            item.badge.textContent = index + 1;
            item.removeButton.setAttribute('aria-label', `删除第 ${index + 1} 张照片`);
            fragment.appendChild(item.element);
        });

        elements.photoPreview.replaceChildren(fragment);
        updatePhotoProgress();
        updateButtons();
    }

    // 删除照片后只更新序号和进度，不重新生成所有缩略图。
    function updatePhotoLabels() {
        elements.photoCount.textContent = `${state.photos.length} / ${REQUIRED_PHOTO_COUNT}`;
        state.photos.forEach((file, index) => {
            const item = state.previewItems.get(getFileKey(file));
            if (item) {
                item.badge.textContent = index + 1;
                item.removeButton.setAttribute('aria-label', `删除第 ${index + 1} 张照片`);
            }
        });
        updatePhotoProgress();
        updateButtons();
    }

    // 删除指定照片；处理队列运行期间禁止删除，避免异步缩略图回写到已删除节点。
    function removePhoto(fileKey) {
        if (state.isProcessingPhotos) {
            setStatus('图片仍在处理中，请等待进度完成后再删除。', 'warning');
            return;
        }

        const beforeCount = state.photos.length;
        const item = state.previewItems.get(fileKey);
        if (item) {
            disposePreviewItem(item);
            state.previewItems.delete(fileKey);
        }

        state.photos = state.photos.filter(file => getFileKey(file) !== fileKey);
        const removedCount = beforeCount - state.photos.length;
        updatePhotoLabels();
        setStatus(`已删除 ${removedCount} 张照片，当前 ${state.photos.length} / ${REQUIRED_PHOTO_COUNT}，还需要 ${REQUIRED_PHOTO_COUNT - state.photos.length} 张。`, 'warning');
    }

    // 刷新音频摘要和进度条；没有自定义音乐时运行时会使用默认音乐。
    function updateMusicSummary() {
        if (!state.music) {
            elements.musicSummary.textContent = '未选择音乐，将使用默认音乐。';
            updateMusicProgress();
            updateButtons();
            return;
        }

        elements.musicSummary.textContent = `${state.music.name} · ${formatSize(state.music.size)}`;
        updateMusicProgress();
        updateButtons();
    }

    /*
     * 打开配置数据库。
     *
     * IndexedDB 是浏览器里保存本地上传 Blob 的唯一稳定选择；普通网页不能直接把
     * 上传文件写回项目目录，所以照片和音乐必须存在这里。
     */
    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('当前浏览器不支持 IndexedDB，无法保存本地配置。'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 保存整份配置记录，包含照片 Blob、可选音频 Blob 和所有文本配置。
    async function saveRecord(value) {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, CONFIG_KEY);

            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    // 读取已保存配置，配置页复显和动画页加载都使用同一条记录格式。
    async function getRecord() {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(CONFIG_KEY);

            request.onsuccess = () => {
                db.close();
                resolve(request.result || null);
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    // 删除配置记录；localStorage 的 ready 标记会在调用方按场景单独处理。
    async function deleteRecord() {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(CONFIG_KEY);

            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    /*
     * 保存配置入口。
     *
     * 当前规则是：照片必须 45 张；音乐、标题、最终文案、歌词都可选。
     * 可选项为空时只保存空值，动画页会回落到默认配置。
     */
    async function saveConfig() {
        if (state.photos.length !== REQUIRED_PHOTO_COUNT) {
            setStatus(`照片必须上传 ${REQUIRED_PHOTO_COUNT} 张。当前 ${state.photos.length} 张，请补齐后再保存。`, 'warning');
            return;
        }

        const photoWallTitle = elements.photoWallTitle.value.trim();
        const proposalMessageText = getProposalMessageText();
        const proposalMessageLines = proposalMessageText ? parseProposalMessageText(proposalMessageText) : [];
        const photosBeforeMessage = getPhotosBeforeMessage();
        const showLyrics = elements.showLyricsToggle.checked;
        const lyricsSource = showLyrics ? getLyricsSource() : 'manual';
        const lyricsText = showLyrics ? getActiveLyricsText() : '';
        const hasCustomLyrics = showLyrics && Boolean(lyricsText);
        let lyrics = [];

        try {
            lyrics = hasCustomLyrics ? parseLyricsText(lyricsText) : [];
        } catch (error) {
            setStatus(`歌词格式有误：${error.message || error}`, 'error');
            return;
        }

        try {
            setStatus('正在保存配置，图片较大时可能需要一点时间...', 'warning');
            elements.saveConfig.disabled = true;

            await saveRecord({
                images: state.photos.length === REQUIRED_PHOTO_COUNT ? state.photos.map(file => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: file.lastModified,
                    blob: file
                })) : [],
                audio: state.music ? {
                    name: state.music.name,
                    type: state.music.type,
                    size: state.music.size,
                    lastModified: state.music.lastModified,
                    blob: state.music
                } : null,
                photoWallTitle,
                proposalMessageText,
                proposalMessageLines,
                photosBeforeMessage,
                showLyrics: hasCustomLyrics,
                lyricsSource: hasCustomLyrics ? lyricsSource : 'manual',
                lyricsFileName: hasCustomLyrics && lyricsSource === 'file' ? state.lyricsFileName : '',
                lyricsText: hasCustomLyrics ? lyricsText : '',
                lyrics,
                updatedAt: Date.now()
            });

            localStorage.setItem(READY_KEY, 'custom');
            setStatus('配置已保存。未填写的音乐、标题、文案和歌词会使用默认配置。', 'success');
        } catch (error) {
            console.error(error);
            setStatus(`保存失败：${error.message || error}`, 'error');
        } finally {
            updateButtons();
        }
    }

    // 切换到“全部使用默认资源”：删除自定义记录，并用 localStorage 标记默认模式。
    async function useDefaultResources() {
        try {
            await deleteRecord();
        } catch (error) {
            console.warn('清除旧配置失败，将继续使用默认资源标记。', error);
        }

        localStorage.setItem(READY_KEY, 'default');
        state.photos = [];
        state.thumbnailQueue = [];
        state.music = null;
        elements.photoWallTitle.value = '';
        elements.proposalMessageText.value = '';
        elements.photosBeforeMessage.value = DEFAULT_PHOTOS_BEFORE_MESSAGE;
        elements.showLyricsToggle.checked = false;
        elements.lyricsInput.value = '';
        setLyricsSource('manual');
        resetLyricsFile();
        syncLyricsControls();
        renderPhotoPreview();
        updateMusicSummary();
        setStatus('已设置为使用项目默认照片、音乐和内置歌词。', 'success');
        updateButtons();
    }

    // 清除本地配置和启动标记；下次打开 index.html 会重新跳回 Config.html。
    async function clearConfig() {
        try {
            await deleteRecord();
        } catch (error) {
            console.warn('删除 IndexedDB 配置失败，仍会清除启动标记。', error);
        }

        localStorage.removeItem(READY_KEY);
        state.photos = [];
        state.thumbnailQueue = [];
        state.music = null;
        elements.photoWallTitle.value = '';
        elements.proposalMessageText.value = '';
        elements.photosBeforeMessage.value = DEFAULT_PHOTOS_BEFORE_MESSAGE;
        elements.showLyricsToggle.checked = false;
        elements.lyricsInput.value = '';
        setLyricsSource('manual');
        resetLyricsFile();
        syncLyricsControls();
        renderPhotoPreview();
        updateMusicSummary();
        setStatus('本地配置已清除。下次打开动画页会回到配置页。', 'success');
    }

    // 只清空当前页面内存里的照片选择；真正删除 IndexedDB 记录需要点“清除配置”。
    function clearSelectedPhotos() {
        state.photos = [];
        state.thumbnailQueue = [];
        elements.photoInput.value = '';
        renderPhotoPreview();
        setStatus('已清空当前选择的照片，可以重新选择。', 'success');
    }

    // 移除当前选择的自定义音乐，保存后动画页会继续使用默认音乐。
    function clearSelectedMusic() {
        state.music = null;
        elements.musicInput.value = '';
        updateMusicSummary();
        setStatus('已移除自定义音乐，保存后将使用默认音乐。', 'warning');
    }

    // 读取用户上传的 LRC 文件；文件文本先放在内存，保存时再解析并写入 IndexedDB。
    async function handleLyricsFileChange(event) {
        const [file] = Array.from(event.target.files || []).filter(isLyricFile);
        event.target.value = '';

        if (!file) {
            setStatus('没有识别到 LRC 或文本歌词文件，请重新选择。', 'warning');
            return;
        }

        try {
            state.lyricsFileText = await file.text();
            state.lyricsFileName = file.name;
            setLyricsSource('file');
            updateLyricsFileSummary();
            syncLyricsControls();
            updateButtons();
            setStatus(`LRC 文件已读取：${file.name}。保存后会使用上传的歌词。`, 'success');
        } catch (error) {
            console.error(error);
            resetLyricsFile();
            updateButtons();
            setStatus(`读取 LRC 文件失败：${error.message || error}`, 'error');
        }
    }

    // 清除 LRC 文件内容，方便用户重新上传或改用手动填写。
    function clearSelectedLyricsFile() {
        resetLyricsFile();
        updateButtons();
        setStatus('已移除 LRC 文件，可以重新上传或切换为手动填写。', 'warning');
    }

    // 跳转到动画页；动画页会根据 localStorage ready 标记决定是否继续展示。
    function openAnimation() {
        window.location.hash = '#/animation';
    }

    /*
     * 页面加载时复显已保存配置。
     *
     * default 模式只展示默认状态；custom 模式会从 IndexedDB 读出 Blob 并恢复成 File，
     * 这样用户回来后仍能看到照片缩略图、音频名称和歌词来源。
     */
    async function loadExistingConfig() {
        const mode = localStorage.getItem(READY_KEY);
        if (mode === 'default') {
            elements.proposalMessageText.value = '';
            elements.photosBeforeMessage.value = DEFAULT_PHOTOS_BEFORE_MESSAGE;
            elements.showLyricsToggle.checked = false;
            elements.lyricsInput.value = '';
            setLyricsSource('manual');
            resetLyricsFile();
            syncLyricsControls();
            setStatus('当前使用项目默认照片、音乐和内置歌词。', 'success');
            updateButtons();
            return;
        }

        if (mode !== 'custom') {
            elements.photosBeforeMessage.value = DEFAULT_PHOTOS_BEFORE_MESSAGE;
            setLyricsSource('manual');
            resetLyricsFile();
            syncLyricsControls();
            updateButtons();
            return;
        }

        try {
            const config = await getRecord();
            const imageCount = config?.images?.length || 0;
            const audioName = config?.audio?.name || '默认音乐';
            const showLyrics = Boolean(config?.showLyrics);
            const lyricsSource = config?.lyricsSource === 'file' ? 'file' : 'manual';
            elements.photoWallTitle.value = config?.photoWallTitle || '';
            elements.proposalMessageText.value = config?.proposalMessageText || '';
            elements.photosBeforeMessage.value = Number.isFinite(Number(config?.photosBeforeMessage))
                ? Math.min(Math.max(Number.parseInt(config.photosBeforeMessage, 10), 1), REQUIRED_PHOTO_COUNT)
                : DEFAULT_PHOTOS_BEFORE_MESSAGE;
            elements.showLyricsToggle.checked = showLyrics;
            setLyricsSource(showLyrics ? lyricsSource : 'manual');
            elements.lyricsInput.value = showLyrics && lyricsSource === 'manual' ? (config?.lyricsText || '') : '';
            state.lyricsFileText = showLyrics && lyricsSource === 'file' ? (config?.lyricsText || '') : '';
            state.lyricsFileName = showLyrics && lyricsSource === 'file' ? (config?.lyricsFileName || '已保存的 LRC 歌词') : '';
            updateLyricsFileSummary();
            syncLyricsControls();

            if (imageCount > 0) {
                state.photos = config.images
                    .map((item, index) => recordToFile(item, `${index + 1}.jpg`))
                    .filter(Boolean)
                    .slice(0, REQUIRED_PHOTO_COUNT);
                renderPhotoPreview();
            }

            if (config?.audio) {
                state.music = recordToFile(config.audio, config.audio.name || 'music.mp3');
                updateMusicSummary();
            }

            setStatus(`已保存自定义配置：${imageCount} 张照片，音乐：${audioName}。`, 'success');
        } catch (error) {
            console.warn(error);
            setStatus('读取已有配置失败，可以重新上传并保存。', 'warning');
        } finally {
            updateButtons();
        }
    }

    /*
     * 绑定照片选择。
     *
     * 多选后会自然排序、逐张追加、逐帧更新进度。选择框 value 清空是为了允许
     * 用户再次选择同一批文件时也能触发 change 事件。
     */
    elements.photoInput.addEventListener('change', async event => {
        const files = naturalSort(Array.from(event.target.files || []).filter(isImageFile));
        event.target.value = '';

        if (files.length === 0) {
            setStatus('没有识别到图片文件，请重新选择。', 'warning');
            return;
        }

        state.isProcessingPhotos = true;
        elements.photoInput.disabled = true;
        updateButtons();
        setStatus(`正在处理 ${files.length} 张图片...`, 'warning');

        try {
            const result = await appendPhotosWithProgress(files);

            if (state.photos.length < REQUIRED_PHOTO_COUNT) {
                setStatus(`已追加 ${result.added} 张图片，当前 ${state.photos.length} / ${REQUIRED_PHOTO_COUNT}。`, 'warning');
            } else if (result.overflow > 0) {
                setStatus(`已满 ${REQUIRED_PHOTO_COUNT} 张，额外 ${result.overflow} 张没有加入。`, 'warning');
            } else if (result.duplicated > 0) {
                setStatus(`已忽略 ${result.duplicated} 张重复图片，当前照片数量已满足要求。`, 'success');
            } else {
                setStatus('照片已选择，保存后动画页会使用这些照片。', 'success');
            }
        } finally {
            state.isProcessingPhotos = false;
            elements.photoInput.disabled = false;
            updateButtons();
        }
    });

    // 音频只保留一个文件，再次选择会替换当前自定义音乐。
    elements.musicInput.addEventListener('change', event => {
        const [file] = Array.from(event.target.files || []).filter(isAudioFile);
        state.music = file || null;
        event.target.value = '';
        updateMusicSummary();
        setStatus(state.music ? '背景音乐已选择。再次选择会替换当前音乐。' : '未选择音乐，将继续使用默认音乐。', state.music ? 'success' : 'warning');
    });

    // 顶部和面板按钮。
    elements.saveConfig.addEventListener('click', saveConfig);
    elements.clearPhotos.addEventListener('click', clearSelectedPhotos);
    elements.clearMusic.addEventListener('click', clearSelectedMusic);

    // 文本配置只影响保存按钮状态；空值会由动画页回落到默认配置。
    elements.photoWallTitle.addEventListener('input', updateButtons);
    elements.proposalMessageText.addEventListener('input', updateButtons);
    elements.photosBeforeMessage.addEventListener('input', updateButtons);
    elements.photosBeforeMessage.addEventListener('blur', () => {
        syncPhotosBeforeMessageInput();
        updateButtons();
    });

    // 歌词编辑区的显隐和来源切换。
    elements.showLyricsToggle.addEventListener('change', () => {
        syncLyricsControls();
        updateButtons();
    });
    elements.lyricsSourceInputs.forEach(input => {
        input.addEventListener('change', () => {
            syncLyricsControls();
            updateButtons();
        });
    });
    elements.lyricsFileInput.addEventListener('change', handleLyricsFileChange);
    elements.clearLyricsFile.addEventListener('click', clearSelectedLyricsFile);
    elements.lyricsInput.addEventListener('input', updateButtons);
    elements.useDefault.addEventListener('click', useDefaultResources);
    elements.clearConfig.addEventListener('click', clearConfig);
    elements.openAnimationTop.addEventListener('click', openAnimation);

    // 离开配置页时释放缩略图 URL；否则浏览器会继续持有这些 Blob。
    window.addEventListener('beforeunload', clearPreviewItems);

    // 初始同步控件状态，然后尝试读取已有配置。
    syncLyricsControls();
    loadExistingConfig();
}

