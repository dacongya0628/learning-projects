import { ANIMATION_TIMING_CONFIG, PHOTO_WALL_CONFIG, PROPOSAL_MESSAGE_CONFIG, RESOURCE_CONFIG } from '../config/config.js';
import { resourceLoader } from "../resourceLoader.js";

/**
 * 最终求婚文字效果。
 *
 * 照片墙完成指定次数的中心展示后，会派发 centralDisplayCompleted 事件。
 * 这个模块监听该事件，然后用逐字打字和呼吸光效显示最终文字。
 */
class ProposalMessageEffect {
    constructor() {
        this.lines = [];
        this.lineContainers = [];
        this.characters = [];
        this.cursor = null;
        this.hasAnimated = false;
        this.breathTimer = null;
        this.initElement();
        this.bindEvents();
    }

    /**
     * 创建最终文字需要的 DOM 结构。
     *
     * 每个字符都会变成独立 span，方便后续按顺序控制透明度，形成打字效果。
     */
    initElement() {
        // 创建消息容器
        this.container = document.createElement('div');
        this.container.style.position = PROPOSAL_MESSAGE_CONFIG.CONTAINER.POSITION;
        this.container.style.top = PROPOSAL_MESSAGE_CONFIG.CONTAINER.TOP;
        this.container.style.left = PROPOSAL_MESSAGE_CONFIG.CONTAINER.LEFT;
        this.container.style.transform = PROPOSAL_MESSAGE_CONFIG.CONTAINER.TRANSFORM;
        this.container.style.zIndex = PROPOSAL_MESSAGE_CONFIG.CONTAINER.Z_INDEX;
        this.container.style.opacity = PROPOSAL_MESSAGE_CONFIG.CONTAINER.OPACITY;
        this.container.style.transition = ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.CONTAINER_TRANSITION;

        // 创建文字包裹容器
        this.textWrapper = document.createElement('div');
        this.textWrapper.style.display = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.DISPLAY;
        this.textWrapper.style.flexDirection = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.FLEX_DIRECTION;
        this.textWrapper.style.alignItems = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.ALIGN_ITEMS;
        this.textWrapper.style.fontFamily = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.FONT_FAMILY;
        this.textWrapper.style.fontSize = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.FONT_SIZE;
        this.textWrapper.style.color = PROPOSAL_MESSAGE_CONFIG.TEXT_WRAPPER.COLOR;

        this.container.appendChild(this.textWrapper);
        document.body.appendChild(this.container);
    }

    /**
     * 读取配置页保存的最终文案。
     *
     * ProposalMessageEffect 实例创建得很早，而 IndexedDB 用户配置要等资源加载阶段才会读取，
     * 所以最终文案不能在 constructor 中固定下来，必须在真正显示前再取一次。
     */
    getConfiguredLines() {
        const config = resourceLoader.getUserConfig();
        const savedLines = Array.isArray(config?.proposalMessageLines)
            ? config.proposalMessageLines.map(line => String(line).trim()).filter(Boolean)
            : [];
        if (savedLines.length > 0) {
            return savedLines;
        }

        const savedText = typeof config?.proposalMessageText === 'string' ? config.proposalMessageText : '';
        const textLines = savedText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        return textLines.length > 0 ? textLines : PROPOSAL_MESSAGE_CONFIG.LINES;
    }

    /**
     * 根据最新文案重新创建逐字打字需要的 span。
     */
    rebuildTextContent() {
        this.lines = this.getConfiguredLines();
        this.characters = [];
        this.lineContainers = [];
        this.textWrapper.replaceChildren();

        this.lineContainers = this.lines.map(line => {
            const lineDiv = document.createElement('div');
            lineDiv.style.overflow = 'hidden';
            lineDiv.style.height = '1.2em';
            return lineDiv;
        });

        this.characters = this.lines.flatMap((line, lineIndex) => {
            return line.split('').map(char => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.opacity = PROPOSAL_MESSAGE_CONFIG.CHARACTER.OPACITY;
                span.style.display = PROPOSAL_MESSAGE_CONFIG.CHARACTER.DISPLAY;
                span.style.transition = ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.CHARACTER_TRANSITION;
                this.lineContainers[lineIndex].appendChild(span);
                return { span, lineIndex };
            });
        });

        this.cursor = document.createElement('span');
        this.cursor.textContent = PROPOSAL_MESSAGE_CONFIG.CURSOR.TEXT;
        this.cursor.style.opacity = PROPOSAL_MESSAGE_CONFIG.CURSOR.OPACITY;
        this.cursor.style.marginLeft = PROPOSAL_MESSAGE_CONFIG.CURSOR.MARGIN_LEFT;
        this.cursor.style.animation = ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.CURSOR_ANIMATION;
        this.lineContainers[this.lineContainers.length - 1].appendChild(this.cursor);

        this.lineContainers.forEach(container => this.textWrapper.appendChild(container));
    }

    /**
     * 读取最终文案的触发次数，保持和照片墙模块使用同一份配置。
     */
    getConfiguredDisplayCount() {
        const fallback = PHOTO_WALL_CONFIG.MAX_CENTER_DISPLAY;
        const configuredCount = Number.parseInt(resourceLoader.getUserConfig()?.photosBeforeMessage, 10);
        if (!Number.isFinite(configuredCount)) {
            return fallback;
        }

        return Math.min(Math.max(configuredCount, 1), RESOURCE_CONFIG.IMAGES.totalCount);
    }

    /**
     * 执行逐行、逐字出现的打字动画。
     */
    showAnimation() {
        if (this.hasAnimated) {
            return;
        }

        this.hasAnimated = true;
        this.rebuildTextContent();
        this.container.style.opacity = '1';

        // 分阶段打字效果
        let currentStage = 0;
        const typeNextStage = () => {
            if (currentStage >= this.lines.length) {
                this.cursor.style.opacity = '1';
                this.startBreathEffect();
                return;
            }

            const lineChars = this.characters.filter(c => c.lineIndex === currentStage);
            let currentChar = 0;

            const typeInterval = setInterval(() => {
                if (currentChar < lineChars.length) {
                    lineChars[currentChar].span.style.opacity = '1';
                    currentChar++;
                } else {
                    clearInterval(typeInterval);
                    currentStage++;
                    setTimeout(typeNextStage, ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.LINE_INTERVAL); // 行间间隔
                }
            }, ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.TYPE_INTERVAL); // 字符间隔
        };

        typeNextStage();
    }

    /**
     * 打字完成后的呼吸光效。
     */
    startBreathEffect() {
        // 在打字完成后启动呼吸动画
        clearInterval(this.breathTimer);
        this.breathTimer = setInterval(() => {
            this.textWrapper.style.textShadow = `
                0 2px 4px rgba(0,0,0,0.5),
                0 0 ${15 + Math.sin(Date.now() / ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.BREATH_SHADOW_PERIOD) * ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.BREATH_SHADOW_RANGE}px rgba(255,64,129,0.6)
            `;
        }, ANIMATION_TIMING_CONFIG.PROPOSAL_MESSAGE.BREATH_EFFECT_INTERVAL);
    }

    /**
     * 监听照片墙完成事件，确保随机展示达到配置次数后才显示最终文字。
     */
    bindEvents() {
        // 监听中央动画完成事件
        document.addEventListener('centralDisplayCompleted', (e) => {
            // 确保达到最大显示次数后才显示
            const completedCount = Number.parseInt(e.detail?.count, 10) || 0;
            const targetCount = Number.parseInt(e.detail?.targetCount, 10) || this.getConfiguredDisplayCount();
            if (completedCount >= targetCount) {
                this.showAnimation();
            }
        });
    }
}

// 初始化实例
export const proposalMessageEffect = new ProposalMessageEffect();
