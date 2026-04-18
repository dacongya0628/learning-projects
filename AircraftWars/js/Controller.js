// 构造函数-定义控制类
// 控制器类：负责处理输入 + 更新位置
class Controller {
    constructor() {
        // 键盘key true = 按，false = 未按
        this.keys = {
            top: false,
            left: false,
            right: false,
            bottom: false
        }

        // 键盘按键 → 方向映射表 统一在这里管理，方便扩展（比如加 WASD）
        this.keyMap = {
            ArrowUp: 'top',
            ArrowDown: 'bottom',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        };
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} e - 键盘事件对象
     * @param {boolean} status - true 表示按下，false 表示松开
     */
    handleKey(e, status) {
        // 根据键盘按键找到对应方向
        const direction = this.keyMap[e.key];

        // 如果不是我们关心的按键（比如 Shift / Ctrl），直接忽略
        if (!direction) return;

        // 更新对应方向的状态
        this.keys[direction] = status;
    }
    /**
     * 初始化键盘事件监听
     */
    initEvents() {
        // 按键按下
        window.addEventListener('keydown', (e) => {
            console.log('按下')
            // e.repeat 表示按住键时的连续触发，这里忽略
            if (!e.repeat) {
                this.handleKey(e, true);
            }
        });

        // 按键松开
        window.addEventListener('keyup', (e) => {
            this.handleKey(e, false);
        });
    }
}