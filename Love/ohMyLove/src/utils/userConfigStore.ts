// @ts-nocheck
const USER_CONFIG_DB_NAME = 'proposalConfigDB';
const USER_CONFIG_DB_VERSION = 1;
const USER_CONFIG_STORE_NAME = 'settings';
const USER_CONFIG_RECORD_KEY = 'config';
const USER_CONFIG_READY_KEY = 'proposalConfigReady';

/**
 * 用户配置存储。
 *
 * 浏览器出于安全限制，不能让普通网页把上传文件直接写回项目目录。
 * 所以 Config.html 会把照片和音乐保存到 IndexedDB，动画页再从这里读取 Blob，
 * 转成 object URL 后交给原来的资源加载流程使用。
 */
export const userConfigStore = {
    readyKey: USER_CONFIG_READY_KEY,

    /**
     * 打开 IndexedDB。
     *
     * 第一次打开时会创建 settings object store；后续读写都复用同一个数据库名和版本。
     */
    openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('Current browser does not support IndexedDB.'));
                return;
            }

            const request = indexedDB.open(USER_CONFIG_DB_NAME, USER_CONFIG_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(USER_CONFIG_STORE_NAME)) {
                    db.createObjectStore(USER_CONFIG_STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 读取 Config.html 保存的完整配置。
     *
     * 返回值可能为空，调用方需要自己决定是回落默认资源还是提示用户重新配置。
     */
    async getConfig() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(USER_CONFIG_STORE_NAME, 'readonly');
            const store = transaction.objectStore(USER_CONFIG_STORE_NAME);
            const request = store.get(USER_CONFIG_RECORD_KEY);

            request.onsuccess = () => {
                db.close();
                resolve(request.result || null);
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    },

    /**
     * 读取启动模式标记。
     *
     * custom 表示使用 IndexedDB 配置；default 表示全部使用项目自带资源；
     * null 则代表还没有完成配置，index.html 会跳回 Config.html。
     */
    getReadyMode() {
        try {
            return localStorage.getItem(USER_CONFIG_READY_KEY);
        } catch (error) {
            console.warn('Unable to read user config marker.', error);
            return null;
        }
    },

    // 小工具：判断当前是否处于自定义资源模式。
    isCustomMode() {
        return this.getReadyMode() === 'custom';
    }
};


