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
        this.smooth = 0.08
        /** 受击闪烁计时 */
        this.hitTimer = 0
        /** 受击红色覆盖层计时 */
        this.hitOverlayTimer = 0
        /** 受击抖动偏移量 */
        this.shakeOffset = 0
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
        this.hitTimer = 8 // 闪烁持续帧数
        this.hitOverlayTimer = 4 // 红色覆盖层持续帧数
        this.shakeOffset = 3 // 抖动幅度
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
        // 缓动动画
        this.displayValue += (this.value - this.displayValue) * this.smooth
        if (Math.abs(this.displayValue - this.value) < 0.1) {
            this.displayValue = this.value
        }
        // 更新闪烁
        if (this.hitTimer > 0) {
            this.hitTimer--
        }
        // 更新红色覆盖层
        if (this.hitOverlayTimer > 0) {
            this.hitOverlayTimer--
        }
        // 抖动衰减
        if (this.shakeOffset > 0) {
            this.shakeOffset *= 0.7
            if (this.shakeOffset < 0.3) this.shakeOffset = 0
        }
    }
    /**
     * 根据血量返回渐变色
     */
    getGradient(ctx, x, y, width, height) {
        const percent = this.value / this.max
        let color1, color2

        if (percent > 0.6) {
            color1 = '#00e676'
            color2 = '#00c853'
        } else if (percent > 0.3) {
            color1 = '#ff9100'
            color2 = '#ff6d00'
        } else {
            color1 = '#ff1744'
            color2 = '#d50000'
        }

        const grad = ctx.createLinearGradient(x, y, x, y + height)
        grad.addColorStop(0, color1)
        grad.addColorStop(1, color2)
        return grad
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
        const barWidth = width
        const barHeight = height

        // ===== 受击抖动 =====
        const shakeX = this.shakeOffset > 0 ? (Math.random() - 0.5) * this.shakeOffset * 2 : 0
        const drawX = x + shakeX

        // ===== 受击闪烁 =====
        const isFlashing = this.hitTimer > 0 && this.hitTimer % 2 === 0

        if (isFlashing) {
            ctx.save()
            ctx.globalAlpha = 0.6
        }

        // ===== 1. 背景 =====
        ctx.save()
        this.drawRoundRect(ctx, drawX, y, barWidth, barHeight, radius)
        ctx.fillStyle = '#1a1a2e'
        ctx.fill()

        // 背景内阴影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 2
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.lineWidth = 1
        this.drawRoundRect(ctx, drawX, y, barWidth, barHeight, radius)
        ctx.stroke()
        ctx.restore()

        // ===== 2. 裁剪（保证内部不会溢出圆角）=====
        ctx.save()
        this.drawRoundRect(ctx, drawX, y, barWidth, barHeight, radius)
        ctx.clip()

        // ===== 3. 延迟血条（橙色拖尾）=====
        const delayWidth = (this.displayValue / this.max) * barWidth
        if (delayWidth > 0) {
            ctx.fillStyle = 'rgba(255, 150, 0, 0.35)'
            ctx.fillRect(drawX, y, delayWidth, barHeight)
        }

        // ===== 4. 实时血条（渐变）=====
        const currentWidth = (this.value / this.max) * barWidth
        if (currentWidth > 0) {
            const grad = this.getGradient(ctx, drawX, y, currentWidth, barHeight)
            ctx.fillStyle = grad
            ctx.fillRect(drawX, y, currentWidth, barHeight)

            // ===== 4a. 高光效果 =====
            ctx.save()
            ctx.globalAlpha = 0.3
            const hlGrad = ctx.createLinearGradient(drawX, y, drawX, y + barHeight)
            hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
            hlGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)')
            hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
            ctx.fillStyle = hlGrad
            ctx.fillRect(drawX, y, currentWidth, barHeight)
            ctx.restore()
        }

        // ===== 5. 受击红色覆盖层 =====
        if (this.hitOverlayTimer > 0) {
            ctx.save()
            ctx.globalAlpha = this.hitOverlayTimer / 4 * 0.4
            ctx.fillStyle = '#ff0000'
            ctx.fillRect(drawX, y, barWidth, barHeight)
            ctx.restore()
        }

        ctx.restore() // 恢复裁剪

        // ===== 6. 描边 =====
        ctx.save()
        ctx.shadowColor = 'rgba(255, 255, 255, 0.1)'
        ctx.shadowBlur = 6
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        this.drawRoundRect(ctx, drawX, y, barWidth, barHeight, radius)
        ctx.stroke()
        ctx.restore()

        // ===== 恢复闪烁透明度 =====
        if (isFlashing) {
            ctx.restore()
        }

        // ===== 7. 血量数字 =====
        ctx.save()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px Arial, "Microsoft YaHei", sans-serif'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
        ctx.shadowBlur = 3
        ctx.fillText(`${Math.ceil(this.value)} / ${this.max}`, drawX + barWidth / 2, y + barHeight / 2 + 0.5)
        ctx.restore()
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