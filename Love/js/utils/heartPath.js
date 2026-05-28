let heartPath = null;

/**
 * 返回一份缓存后的爱心 Path2D。
 *
 * 多个 Canvas 动画都会反复绘制同一个爱心轮廓。如果每一帧都重新计算
 * 参数方程，会产生不必要的 CPU 开销。这里第一次调用时生成 Path2D，
 * 后续直接复用，既保证图形一致，也减少动画中的重复计算。
 */
export function getHeartPath() {
    if (heartPath) return heartPath;

    // 经典爱心参数方程，坐标原点在爱心中心附近，调用方通过 scale 控制实际大小。
    heartPath = new Path2D();
    for (let theta = 0; theta <= 2 * Math.PI; theta += 0.01) {
        const x = 16 * Math.pow(Math.sin(theta), 3);
        const y = -(13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta));
        theta === 0 ? heartPath.moveTo(x, y) : heartPath.lineTo(x, y);
    }
    heartPath.closePath();

    return heartPath;
}
