/**
 * 全局配置中心。
 *
 * 这里集中放动画的可调参数，不放具体业务逻辑。多数时间单位都是毫秒，
 * 坐标比例一般使用 0 到 1 的屏幕归一化值，颜色里的字符串 RGB 会在
 * canvas 或 DOM 样式里拼成 rgba(...) 使用。
 */

// 资源配置：resourceLoader 会读取这里的字体、图片和音乐，并在开始动画前预加载。
export const RESOURCE_CONFIG = {
    // 字体资源列表。动画页会注册这些字体，后续通过 font-family 名称直接使用。
    FONTS: [
        {
            // 注册到浏览器里的字体名，对应 CSS/Canvas 中的 font-family。
            name: 'KeAi',
            // 字体文件路径，以当前页面所在目录为基准解析。
            path: './font/keai.ttf'
        }
    ],

    // 默认照片资源配置。没有自定义配置时，会从 imgs 目录读取固定 45 张照片。
    IMAGES: {
        // 图片所在目录。
        basePath: './imgs',
        // resourceLoader 内部使用的资源 key 模板，例如 img1、img2。
        namingTemplate: 'img$INDEX',
        // 照片墙需要的照片总数，心形模板刚好使用 45 张。
        totalCount: 45,
        // 默认图片后缀名，因此默认路径是 ./imgs/1.jpg 到 ./imgs/45.jpg。
        extensions: 'jpg',
        // 是否在进度页阶段提前加载图片。
        preload: true,
        // 给照片墙生成缩略图的目标边长，降低 3D 照片墙首帧绘制压力。
        thumbnailSize: 180,
        // 缩略图压缩质量，数值越高越清晰，体积和解码压力也更高。
        thumbnailQuality: 0.9
    },

    // 默认背景音乐配置。用户未上传自定义音乐时使用这里的音频。
    AUDIO: [
        {
            // 音频资源名，BackgroundMusicEffect 会按这个名字查找。
            name: 'everyTimeWeTouch',
            // 默认音乐文件路径。
            path: './music/everyTimeWeTouch.mp3'
        }
    ]
};

// 心率文字配置：控制心率数字的初始状态、动画速度、随机波动范围和颜色。
export const HEART_RATE_CONFIG = {
    // 心率文字刚创建时的状态。
    INITIAL: {
        // 初始透明度，0 表示先隐藏，后续再淡入。
        OPACITY: 0,
        // 初始心率数字。
        RATE: 100,
        // 心率文字字号，单位是 px。
        FONT_SIZE: 60,
        // 初始位置，x/y 是相对屏幕宽高的比例，0.5 表示居中。
        POSITION: { x: 0.5, y: 0.5 }
    },

    // 心率文字运动参数，具体时间统一放在 ANIMATION_TIMING_CONFIG.HEART_RATE。
    ANIMATION: {
        // Canvas 刷新帧率，越高越顺滑但越耗性能。
        FPS: 30,
        // 构图目标横向偏移比例，负数表示向左偏移。
        TARGET_OFFSET: -0.25,
        // 插值跟随速度，越大越快贴近目标位置。
        TRANSITION_SPEED: 0.1
    },

    // 心率数字的随机取值范围。
    RATE: {
        // 随机心率的基础值。
        BASE: 100,
        // 在基础值上允许增加的最大随机波动。
        MAX_VARIATION: 50,
        // 最低心率限制。
        MIN: 100,
        // 最高心率限制。
        MAX: 150
    },

    // 心率文字颜色。
    COLOR: {
        // 默认 RGB 色值，不包含透明度，绘制时会拼成 rgba。
        DEFAULT: '255, 64, 129'
    }
};

// 单颗小爱心配置：FallingHeartsEffect 会用这些范围随机生成背景飘落爱心。
export const HEART_CONFIG = {
    // 单颗爱心大小范围，单位是 px。
    SIZE: {
        // 最小尺寸。
        MIN: 10,
        // 最大尺寸。
        MAX: 20
    },

    // 单颗爱心下落速度范围。
    SPEED: {
        // 最慢下落速度。
        MIN: 0.5,
        // 最快下落速度。
        MAX: 1
    },

    // 单颗爱心左右摆动参数。
    OSCILLATION: {
        // 最低摆动速度。
        SPEED_MIN: 0.01,
        // 最高摆动速度。
        SPEED_MAX: 0.03,
        // 最小摆动幅度。
        AMPLITUDE_MIN: 0.5,
        // 最大摆动幅度。
        AMPLITUDE_MAX: 2.0
    },

    // 单颗爱心旋转参数。
    ROTATION: {
        // 初始角度最小值，单位是度。
        ANGLE_MIN: 0,
        // 初始角度最大值，单位是度。
        ANGLE_MAX: 360,
        // 最慢旋转速度。
        SPEED_MIN: 0.1,
        // 最快旋转速度。
        SPEED_MAX: 0.3
    },

    // 单颗爱心透明度范围。
    OPACITY: {
        // 最低透明度。
        MIN: 0.6,
        // 最高透明度。
        MAX: 1.0
    },

    // 爱心主体渐变颜色，从上到下按 stop 分布。
    GRADIENT: {
        COLORS: [
            // 渐变起点，高亮红。
            { stop: 0, color: '255, 58, 74' },
            // 上半部分过渡红。
            { stop: 0.3, color: '255, 30, 58' },
            // 中下部分深红。
            { stop: 0.6, color: '220, 20, 60' },
            // 底部暗红。
            { stop: 1, color: '176, 16, 48' }
        ]
    },

    // 爱心表面的白色高光渐变。
    HIGHLIGHT_GRADIENT: {
        COLORS: [
            // 高光最亮处。
            { stop: 0, color: '255, 255, 255', opacity: 0.6 },
            // 高光中段逐渐变淡。
            { stop: 0.5, color: '255, 255, 255', opacity: 0.2 },
            // 高光末端透明。
            { stop: 1, color: '255, 255, 255', opacity: 0 }
        ]
    },

    // 单颗爱心阴影。
    SHADOW: {
        // 阴影 RGB 色值。
        COLOR: '0, 0, 0',
        // 阴影模糊半径。
        BLUR: 2,
        // 阴影水平偏移。
        OFFSET_X: 1,
        // 阴影垂直偏移。
        OFFSET_Y: 1,
        // 阴影透明度。
        OPACITY: 0.3
    },

    // 单颗爱心描边。
    STROKE: {
        // 描边 RGB 色值。
        COLOR: '176, 16, 48',
        // 描边宽度。
        WIDTH: 0.3
    }
};

// 背景飘落爱心配置：控制同时存在的爱心数量和整体动画节奏。
export const FALLING_HEARTS_CONFIG = {
    // 同屏飘落爱心数量，越大越热闹，也越耗性能。
    COUNT: 30,
    // 背景飘落动画帧率。
    FPS: 30,

    // 背景爱心尺寸范围。
    SIZE: {
        // 最小尺寸。
        MIN: 10,
        // 最大尺寸。
        MAX: 20
    },

    // 背景爱心下落速度范围。
    SPEED: {
        // 最慢速度。
        MIN: 4,
        // 最快速度。
        MAX: 8
    },

    // 背景爱心左右摆动范围。
    OSCILLATION: {
        SPEED: {
            // 最低摆动速度。
            MIN: 0.01,
            // 最高摆动速度。
            MAX: 0.03
        },
        AMPLITUDE: {
            // 最小摆动幅度。
            MIN: 0.5,
            // 最大摆动幅度。
            MAX: 2.0
        }
    },

    // 背景爱心旋转速度。
    ROTATION: {
        SPEED: {
            // 最慢旋转速度。
            MIN: 0.3,
            // 最快旋转速度。
            MAX: 0.6
        }
    },

    // 背景爱心透明度范围。
    OPACITY: {
        // 最低透明度。
        MIN: 0.6,
        // 最高透明度。
        MAX: 1.0
    }
};

// 心电图配置：控制波形位置、振幅、心跳峰值间隔和淡入速度。
export const ECG_EFFECT_CONFIG = {
    // 心电图跟随整体构图移动时使用的目标偏移。
    OFFSET: {
        // 横向偏移比例，负数表示向左。
        TARGET_HORIZONTAL: -0.25
    },

    // 心电波形的上下振幅。
    AMPLITUDE: {
        // 基础振幅。
        BASE: 10,
        // 心跳峰值的额外振幅倍数。
        BEAT_MULTIPLIER: 10
    },

    // 心跳峰值出现间隔。
    PEAK_INTERVAL: {
        // 基础帧间隔。
        BASE_FRAMES: 60,
        // 随机速度因子的下限。
        SPEED_FACTOR_MIN: 0.5,
        // 随机速度因子的上限。
        SPEED_FACTOR_MAX: 1.5
    },

    // 心电图淡入参数。
    OPACITY: {
        // 每次淡入提升的透明度。
        FADE_IN_INCREMENT: 0.01
    },

    // 心电图绘制尺寸和位置。
    WAVE: {
        // 波形宽度。
        WIDTH: 300,
        // 相对中心点的纵向偏移。
        OFFSET_Y: -50
    }
};

// 主爱心配置：控制主爱心的跳动节奏、构图偏移、旋转、阴影和心率范围。
export const HEART_EFFECT_CONFIG = {
    // 主爱心跳动频率。
    BEAT: {
        // 120 次/分钟对应的帧间隔，数值越小跳得越快。
        MIN_INTERVAL: Math.round(60 / 120 * 60),
        // 80 次/分钟对应的帧间隔，数值越大跳得越慢。
        MAX_INTERVAL: Math.round(60 / 80 * 60)
    },

    // 主爱心参与整体构图时的水平偏移。
    OFFSET: {
        // 目标偏移比例，具体方向由效果类中的移动逻辑决定。
        TARGET_HORIZONTAL: 0.25
    },

    // 主爱心旋转角度。
    ROTATION: {
        // 最大旋转弧度，负数表示逆时针。
        MAX_ANGLE: -Math.PI / 12
    },

    // 主爱心淡入速度。
    OPACITY: {
        // 每帧提升的透明度。
        FADE_IN_INCREMENT: 0.01
    },

    // 主爱心阴影。
    SHADOW: {
        // 阴影颜色，RGB 数组。
        COLOR: [0, 0, 0],
        // 跳动瞬间的阴影模糊半径。
        BLUR_BEAT: 40,
        // 普通状态的阴影模糊半径。
        BLUR_NORMAL: 30,
        // 阴影水平偏移。
        OFFSET_X: 8,
        // 阴影垂直偏移。
        OFFSET_Y: 8
    },

    // 主爱心驱动的心率范围。
    HEART_RATE: {
        // 基础心率。
        BASE: 80,
        // 最大心率。
        MAX: 120
    }
};

// 第二颗爱心配置：整体与主爱心类似，但缩放、方向和纵向位置不同。
export const SECOND_HEART_EFFECT_CONFIG = {
    // 第二颗爱心默认缩放。
    SCALE: {
        // 基础缩放比例，小于 1 表示比主爱心小。
        BASE: 0.8
    },

    // 第二颗爱心跳动节奏。
    BEAT: {
        // 最快跳动帧间隔。
        MIN_INTERVAL: Math.round(60 / 120 * 60),
        // 最慢跳动帧间隔。
        MAX_INTERVAL: Math.round(60 / 80 * 60),
        // 跳动时的缩放强度。
        STRENGTH: 0.3
    },

    // 第二颗爱心构图偏移。
    OFFSET: {
        // 水平偏移比例。
        TARGET_HORIZONTAL: 0.25,
        // 纵向下移像素，让两颗爱心错开。
        Y_ADJUSTMENT: 30
    },

    // 第二颗爱心旋转角度。
    ROTATION: {
        // 最大旋转弧度，正数表示顺时针。
        MAX_ANGLE: Math.PI / 12
    },

    // 第二颗爱心淡入速度。
    OPACITY: {
        // 每帧提升的透明度。
        FADE_IN_INCREMENT: 0.01
    },

    // 第二颗爱心阴影。
    SHADOW: {
        // 阴影颜色，RGB 数组。
        COLOR: [0, 0, 0],
        // 跳动瞬间阴影模糊半径。
        BLUR_BEAT: 40,
        // 普通状态阴影模糊半径。
        BLUR_NORMAL: 30,
        // 阴影水平偏移。
        OFFSET_X: 8,
        // 阴影垂直偏移。
        OFFSET_Y: 8
    },

    // 第二颗爱心主体渐变。
    GRADIENT: {
        COLORS: [
            // 渐变起点亮红。
            { stop: 0, color: [255, 58, 74] },
            // 上半部分红色。
            { stop: 0.3, color: [255, 30, 58] },
            // 中下部分深红。
            { stop: 0.6, color: [220, 20, 60] },
            // 底部暗红。
            { stop: 1, color: [176, 16, 48] }
        ]
    },

    // 第二颗爱心高光渐变。
    HIGHLIGHT_GRADIENT: {
        COLORS: [
            // 高光最亮处。
            { stop: 0, color: [255, 255, 255], opacity: 0.4 },
            // 高光中段。
            { stop: 0.5, color: [255, 255, 255], opacity: 0.1 },
            // 高光尾部透明。
            { stop: 1, color: [255, 255, 255], opacity: 0 }
        ]
    }
};

// 全局动画时间配置：集中管理主剧情、爱心、音乐、像素化预览等时间参数。
export const ANIMATION_TIMING_CONFIG = {
    // 加载完成后的提示和淡出时间。
    LOADING: {
        // 加载容器淡出的时长。
        FADE_OUT: 800,
        // 进度到 100% 后，提示文字继续停留的时间。
        READY_MESSAGE_DURATION: 1200
    },

    // 主剧情编排时间，按动画出现顺序依次使用。
    MAIN_SEQUENCE: {
        // 背景爱心启动后，等待多久启动心率文字。
        HEART_RATE_START_DELAY: 2000,
        // 心率文字启动后，等待多久调用主爱心 start。
        MAIN_HEART_START_DELAY: 3000,
        // 主爱心 start 调用后，等待多久调用第二颗爱心 start。
        SECOND_HEART_START_DELAY: 3500,
        // 检查两颗爱心是否完全淡入的轮询间隔。
        READY_CHECK_INTERVAL: 100,
        // 双心淡入完成后，等待多久启动心电图。
        ECG_START_DELAY: 3000,
        // 心电图启动后，等待多久让两颗爱心调整构图。
        HEART_ADJUSTMENT_DELAY: 8000,
        // 构图调整后，等待多久让爱心、心率文字、心电图整体左移。
        HORIZONTAL_OFFSET_DELAY: 5000,
        // 整体左移后，等待多久显示右侧 3D 照片墙。
        PHOTO_WALL_SHOW_DELAY: 2000
    },

    // 主爱心内部时间。
    HEART: {
        // 主爱心 start 被调用后，内部再等待多久真正显示。
        START_DELAY: 4000,
        // 主爱心旋转和构图调整持续时间。
        ADJUSTMENT_DURATION: 2000,
        // 主爱心水平左移持续时间。
        HORIZONTAL_OFFSET_DURATION: 2000,
        // 透明度淡入间隔的基础系数，会乘以 FADE_IN_INCREMENT。
        FADE_INTERVAL_BASE: 500
    },

    // 第二颗爱心内部时间。
    SECOND_HEART: {
        // 第二颗爱心 start 被调用后，内部再等待多久真正显示。
        START_DELAY: 4000,
        // 第二颗爱心旋转、下移和构图调整持续时间。
        ADJUSTMENT_DURATION: 2000,
        // 第二颗爱心水平右移持续时间。
        HORIZONTAL_OFFSET_DURATION: 2000,
        // 透明度淡入间隔的基础系数，会乘以 FADE_IN_INCREMENT。
        FADE_INTERVAL_BASE: 500
    },

    // 心率文字内部时间。
    HEART_RATE: {
        // 心率文字出现后，等待多久从中央移动到下方。
        START_MOVE_DELAY: 3000,
        // 心率文字从中央移动到下方的持续时间。
        MOVE_DURATION: 1000,
        // 心率目标值随机更新的间隔。
        RATE_UPDATE_INTERVAL: 500,
        // 心率文字参与整体左移的持续时间。
        HORIZONTAL_OFFSET_DURATION: 2000,
        // 心率文字每次淡入增加的透明度。
        FADE_STEP: 0.01,
        // 心率文字淡入间隔的基础系数，会乘以 FADE_STEP。
        FADE_INTERVAL_BASE: 500
    },

    // 心电图内部时间。
    ECG: {
        // 心电图整体左移持续时间。
        HORIZONTAL_OFFSET_DURATION: 2000,
        // 初始峰值间隔，用于心电图启动后的默认节奏。
        INITIAL_PEAK_INTERVAL: 100,
        // 心电图淡入刷新间隔。
        FADE_IN_INTERVAL: 20,
        // 两次心跳触发之间的最小间隔，避免一帧内重复触发峰值。
        BEAT_DEBOUNCE: 500,
        // 心电图 canvas 透明度过渡。
        CANVAS_FADE_TRANSITION: 'opacity 1s ease'
    },

    // 背景音乐和歌词时间。
    MUSIC: {
        // 播放失败后的重试间隔。
        PLAY_RETRY_DELAY: 1000,
        // audio load 后再次尝试播放的延迟。
        RETRY_LOAD_DELAY: 1000,
        // 音量淡入的刷新间隔。
        FADE_INTERVAL: 100,
        // 歌词同步刷新间隔。
        LYRIC_SYNC_INTERVAL: 100,
        // 歌词容器透明度过渡。
        LYRICS_TRANSITION: 'opacity 0.5s'
    },

    // 像素化预览中仍由效果类控制的补充时间。
    PIXELATED_PREVIEW: {
        // 像素化 canvas 透明度过渡。
        CANVAS_TRANSITION: 'opacity 0.3s ease-in-out',
        // 每组像素块入场的基础延迟。
        BASE_DELAY: 500,
        // 单个像素块动画最短时长。
        DURATION_MIN: 2000,
        // 单个像素块动画最长时长。
        DURATION_MAX: 3000,
        // 每个像素块额外随机延迟的最大值。
        RANDOM_BLOCK_DELAY_RANGE: 500,
        // 像素块控制点横向随机范围，影响飞入路径弧度。
        CONTROL_POINT_X_RANGE: 300,
        // 兜底总等待时间，到点后开始散开淡出。
        COMPLETE_HOLD_DELAY: 7000,
        // 像素块散开淡出的主体时长。
        FADE_DURATION: 2000,
        // 整个 canvas 最后退出的淡出时长。
        FADE_OUT_DURATION: 500
    },

    // 最终文案呼吸光效补充参数。
    PROPOSAL_MESSAGE: {
        // 最终文案容器淡入过渡。
        CONTAINER_TRANSITION: 'opacity 0.5s ease',
        // 单个字符显示时的透明度过渡。
        CHARACTER_TRANSITION: 'opacity 0.1s ease',
        // 打字光标闪烁动画。
        CURSOR_ANIMATION: 'blink 1s infinite',
        // 每个字符出现的间隔。
        TYPE_INTERVAL: 150,
        // 每一行打完后到下一行开始之间的间隔。
        LINE_INTERVAL: 500,
        // 打字完成后呼吸光效的刷新间隔。
        BREATH_EFFECT_INTERVAL: 50,
        // 呼吸光效使用的正弦周期系数。
        BREATH_SHADOW_PERIOD: 500,
        // 呼吸光效阴影模糊变化幅度。
        BREATH_SHADOW_RANGE: 5
    }
};

// 右侧 3D 照片墙时间配置：集中管理随机选择、淡入、恢复和事件派发节奏。
export const PHOTO_WALL_TIMING_CONFIG = {
    // 照片墙显示后，等待多久开始随机选择。
    START_DELAY: 2000,
    // 照片墙和标题淡入时间。
    FADE_DURATION: 1000,
    // 预留配置：分批加载时每批之间的等待时间，当前主流程未直接读取。
    LAZY_LOAD_BATCH_DELAY: 700,
    // 每张中心像素化预览完成后，等待多久再统计完成次数。
    CENTER_DISPLAY_SETTLE_DELAY: 1500,
    // 达到设定照片数量后，等待多久派发最终文案事件。
    FINAL_MESSAGE_EVENT_DELAY: 2000,

    // 达到设定次数后，照片墙继续随机高亮的循环节奏。
    CONTINUOUS_SELECTION: {
        // 边框跳动多少次后选中照片。
        MAX_JUMPS: 10,
        // 边框每次跳动的间隔。
        JUMP_INTERVAL: 300,
        // 选中照片放大到前景的过渡。
        SELECTED_TRANSITION: 'all 0.5s ease-in-out',
        // 选中照片停留多久后恢复并进入下一轮。
        RESTORE_DELAY: 2000
    },

    // 前 N 张中心展示的随机选择节奏。
    CENTER_SELECTION: {
        // 边框跳动多少次后选中照片。
        MAX_JUMPS: 10,
        // 边框每次跳动的间隔。
        JUMP_INTERVAL: 300,
        // 选中照片放大到前景的过渡。
        SELECTED_TRANSITION: 'all 0.5s ease-in-out',
        // 选中后等待多久触发像素化预览。
        PIXELATED_PREVIEW_DELAY: 1000,
        // 像素化预览触发后，照片本身多久恢复原来的 3D 姿态。
        RESTORE_DELAY: 2000
    },

    // 随机选择边框的动画。
    SELECTOR: {
        // 边框移动到下一张照片时的过渡。
        TRANSITION: 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        // 边框自身的呼吸闪烁动画。
        ANIMATION: 'pulse 0.8s infinite alternate'
    },

    // 照片墙图片节点自身的淡入。
    IMAGE: {
        // 单张照片加载完成后的透明度过渡。
        FADE_TRANSITION: 'opacity 0.3s'
    }
};

// 右侧 3D 照片墙配置：控制照片墙出现位置、网格形状、标题和最终文案触发次数。
export const PHOTO_WALL_CONFIG = {
    // 默认随机展示多少张照片后出现最终文案；配置页保存的值会覆盖这里。
    MAX_CENTER_DISPLAY: 10,
    // 预留配置：期望至少多少张照片可用后才允许开始随机选择，当前主流程仍等待全部照片 ready。
    START_SELECTION_MIN_IMAGES: 8,
    // 预留配置：分批加载时每批处理的照片数量，当前主流程未直接读取。
    LAZY_LOAD_BATCH_SIZE: 4,

    // 照片墙外层容器样式。
    CONTAINER: {
        // 使用 fixed 让照片墙固定在视口右侧。
        POSITION: 'fixed',
        // 距离右侧的百分比。
        RIGHT: '5%',
        // 垂直居中基准。
        TOP: '50%',
        // 容器宽度。
        WIDTH: '800px',
        // 容器内边距。
        PADDING: '15px 8px',
        // 容器背景色。
        BACKGROUND_COLOR: 'rgba(0, 0, 0, 0.8)',
        // 容器投影，增强悬浮感。
        BOX_SHADOW: '0 20px 50px rgba(0, 0, 0, 0.6)',
        // 容器整体 3D 视角和居中位移。
        TRANSFORM: 'translateY(-50%) perspective(2000px) rotateY(-25deg) rotateX(12deg)',
        // 容器圆角。
        BORDER_RADIUS: '12px',
        // 容器层级，低于最终文案，高于普通背景。
        Z_INDEX: '997',
        // 最大高度，避免小屏幕溢出太多。
        MAX_HEIGHT: '85vh'
    },

    // 照片墙内部 grid 样式。
    GRID: {
        // 使用 CSS Grid 摆出心形模板。
        DISPLAY: 'grid',
        // 9 列，每个格子 70px。
        TEMPLATE_COLUMNS: 'repeat(9, 70px)',
        // 照片格子之间的间距。
        GAP: '15px',
        // grid 内边距。
        PADDING: '15px',
        // 水平居中。
        MARGIN: '0 auto',
        // 每个格子内部垂直居中。
        ALIGN_ITEMS: 'center',
        // 每个格子内部水平居中。
        JUSTIFY_ITEMS: 'center',
        // 高度由内容自然撑开。
        HEIGHT: 'auto',
        // 允许 3D 变换和放大照片超出 grid。
        OVERFLOW_Y: 'visible',
        // grid 整体绕 X 轴旋转，形成俯视角。
        TRANSFORM: 'rotateX(10deg)',
        // 保留子元素的 3D 层级。
        TRANSFORM_STYLE: 'preserve-3d',
        // grid 内部 3D 透视距离。
        PERSPECTIVE: '2000px'
    },

    // 照片墙标题样式。
    TITLE: {
        // 默认标题，配置页保存的标题会覆盖这里。
        TEXT: '可可爱爱的我们',
        // 标题颜色。
        COLOR: '#fff',
        // 标题对齐方式。
        TEXT_ALIGN: 'center',
        // 标题外边距。
        MARGIN: '0',
        // 标题字号。
        FONT_SIZE: '32px',
        // 标题字体。
        FONT_FAMILY: 'KeAi',
        // 标题阴影。
        TEXT_SHADOW: '0 2px 4px rgba(0,0,0,0.5)',
        // 标题字间距。
        LETTER_SPACING: '2px'
    }
};

// 随机选中照片后的像素化预览配置：控制全屏 canvas、像素块大小和分组数量。
// 预览相关的时长、延迟和过渡统一放在 ANIMATION_TIMING_CONFIG.PIXELATED_PREVIEW。
export const PIXELATED_PREVIEW_CONFIG = {
    // 像素化预览 canvas 样式。
    CANVAS: {
        // 固定在整个视口上方。
        POSITION: 'fixed',
        // 顶部贴齐视口。
        TOP: '0',
        // 左侧贴齐视口。
        LEFT: '0',
        // 覆盖整个视口宽度。
        WIDTH: '100%',
        // 覆盖整个视口高度。
        HEIGHT: '100%',
        // 层级高于照片墙，低于最终文案。
        Z_INDEX: '1000',
        // 不拦截鼠标事件。
        POINTER_EVENTS: 'none',
        // 初始隐藏，显示时再淡入。
        OPACITY: '0'
    },

    // 单个像素块的尺寸，越大越抽象，越小越接近原图。
    PIXEL_SIZE: 50,
    // 像素化采样网格大小，影响生成块数量。
    GRID_SIZE: 50,

    // 像素块入场动画配置。
    ANIMATION: {
        // 像素块分几组依次出现。
        GROUPS: 5
    }
};

// 最终文案配置：照片墙达到指定展示次数后触发，控制文案位置、样式和默认文本。
// 打字间隔、淡入过渡和光标动画统一放在 ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE。
export const PROPOSAL_MESSAGE_CONFIG = {
    // 最终文案外层容器样式。
    CONTAINER: {
        // 固定在视口中。
        POSITION: 'fixed',
        // 垂直居中基准。
        TOP: '50%',
        // 水平居中基准。
        LEFT: '50%',
        // 精确居中。
        TRANSFORM: 'translate(-50%, -50%)',
        // 层级最高，确保覆盖照片墙和像素化预览。
        Z_INDEX: '9999',
        // 初始透明，触发后淡入。
        OPACITY: '0'
    },

    // 最终文案文字包裹层样式。
    TEXT_WRAPPER: {
        // 使用 flex 让多行文案上下排列。
        DISPLAY: 'flex',
        // 多行文案按列排列。
        FLEX_DIRECTION: 'column',
        // 每行水平居中。
        ALIGN_ITEMS: 'center',
        // 最终文案字体。
        FONT_FAMILY: 'KeAi',
        // 最终文案字号。
        FONT_SIZE: '4em',
        // 最终文案颜色。
        COLOR: '#FFF'
    },

    // 默认最终文案。配置页填写内容后会覆盖这里。
    LINES: [
        'XXX女士',
        '你愿意嫁给',
        'XXX先生吗？'
    ],

    // 单个字符的打字动画样式。
    CHARACTER: {
        // 字符初始隐藏。
        OPACITY: '0',
        // 每个字符独立占位，方便逐字显示。
        DISPLAY: 'inline-block'
    },

    // 打字光标样式。
    CURSOR: {
        // 光标文本。
        TEXT: '|',
        // 初始隐藏，打字完成后显示。
        OPACITY: '0',
        // 光标和文字之间的距离。
        MARGIN_LEFT: '4px'
    }
};
