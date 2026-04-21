// 血条类
class HpBar {
    /**
     * @param {number} max 最大血量
     */
    constructor(max = 100) {
        /** 最大血量 */
        this.max = max
        /** 当前真实血量（逻辑值） */
        this.value = max
        /** 显示血量（用于动画） */
        this.displayValue = max
        /** 动画平滑系数（越大越快） */
        this.smooth = 0.1
        /** 受击闪烁计时 */
        this.hitTimer = 0
    }
    /**
     * 设置血量（带边界限制）
     */
    set(value) {
        this.value = Math.max(0, Math.min(this.max, value))
    }
    /**
     * 扣血
     */
    damage(amount) {
        this.set(this.value - amount)
        this.hitTimer = 6 // 触发闪烁
    }
    /**
     * 加血
     */
    heal(amount) {
        this.set(this.value + amount)
    }
    /**
     * 每帧更新（做动画）
     */
    update() {
        // 缓动动画（关键）
        this.displayValue += (this.value - this.displayValue) * this.smooth
        // 防止无限逼近
        if (Math.abs(this.displayValue - this.value) < 0.1) {
            this.displayValue = this.value
        }
        // 更新闪烁
        if (this.hitTimer > 0) {
            this.hitTimer--
        }
    }
    /**
     * 根据血量返回颜色
     */
    getColor() {
        const percent = this.value / this.max

        if (percent > 0.5) return '#00ff88'
        if (percent > 0.2) return '#ff9900'
        return '#ff3333'
    }
    /**
     * 绘制圆角矩形路径
     */
    drawRoundRect(ctx, x, y, width, height, radius) {
        radius = Math.min(radius, height / 2, width / 2)
        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + width - radius, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
        ctx.lineTo(x + width, y + height - radius)
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
        ctx.lineTo(x + radius, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()
    }

    /**
     * 绘制血条
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    draw(ctx, x, y, width, height) {
        const radius = height / 2
        // ===== 受击闪烁（整体透明度变化）=====
        if (this.hitTimer > 0) {
            ctx.save()
            ctx.globalAlpha = 0.7
        }
        // ===== 1. 背景 =====
        this.drawRoundRect(ctx, x, y, width, height, radius)
        ctx.fillStyle = '#222'
        ctx.fill()
        // ===== 2. 裁剪（保证内部不会溢出圆角）=====
        ctx.save()
        this.drawRoundRect(ctx, x, y, width, height, radius)
        ctx.clip()
        // ===== 3. 延迟血条（黄色拖尾）=====
        ctx.fillStyle = '#ffaa00'
        ctx.fillRect(x, y, (this.displayValue / this.max) * width, height)
        // ===== 4. 实时血条 =====
        ctx.fillStyle = this.getColor()
        ctx.fillRect(x, y, (this.value / this.max) * width, height)
        ctx.restore()
        // ===== 5. 描边 =====
        ctx.lineWidth = 2
        ctx.strokeStyle = '#ffffff'
        this.drawRoundRect(ctx, x, y, width, height, radius)
        ctx.stroke()
        // ===== 恢复透明度 =====
        if (this.hitTimer > 0) {
            ctx.restore()
        }
    }
    /**
     * 是否死亡
     */
    isDead() {
        return this.value <= 0
    }
    /**
     * 获取血量百分比
     */
    getPercent() {
        return this.value / this.max
    }
}