import { onMounted, onUnmounted, watch } from 'vue'
import {
  buildEdges,
  buildNodes,
  getEdgeLength,
  getEdgeStrokeStyle,
  getNodeFillStyle,
  getThreshold,
  moveNodes,
  updateDrivenNode
} from '../utils/particleCore'

export function useParticleNetwork(canvasRef, optionsRef) {
  // 原始 demo 里的全局动画状态在这里收束为组件级私有状态。
  let ctx = null
  let frameId = 0
  let nodes = []
  let edges = []
  const mousePos = {
    x: null,
    y: null
  }
  let lastToken = -1

  function getCanvas() {
    return canvasRef.value
  }

  function resize() {
    const canvas = getCanvas()
    if (!canvas) return

    // 仍按页面可视区域直接铺满，和旧版 HTML 的尺寸来源保持一致。
    canvas.width = document.body.clientWidth
    canvas.height = document.body.clientHeight

    // 初始鼠标参考点保持随机，避免首次渲染时所有粒子同时朝同一方向偏移。
    mousePos.x = Math.random() * canvas.width
    mousePos.y = Math.random() * canvas.height
  }

  function rebuild() {
    const canvas = getCanvas()
    if (!canvas) return

    // 每次重建都按当前参数重新生成节点和边，保持和原始实现一致。
    nodes = buildNodes({
      nodeNum: optionsRef.value.nodeNum,
      speed: optionsRef.value.speed,
      width: canvas.width,
      height: canvas.height
    })
    // 边数据始终和节点集成对重建，避免保留旧引用。
    edges = buildEdges(nodes)
  }

  function render() {
    const canvas = getCanvas()
    if (!canvas || !ctx) return

    // 保持原始绘制顺序：背景 -> 节点 -> 连线。
    ctx.fillStyle = '#022158'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    nodes.forEach((node) => {
      // 鼠标驱动节点只参与扰动和连线，不直接出现在画面里。
      if (node.drivenByMouse) return

      ctx.fillStyle = getNodeFillStyle(optionsRef.value.type)
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    const threshold = getThreshold(canvas.width)

    edges.forEach((edge) => {
      const length = getEdgeLength(edge)
      // 阈值外的边直接跳过，避免把远距离连线带进画面。
      if (length > threshold) return

      ctx.strokeStyle = getEdgeStrokeStyle(optionsRef.value.type)
      ctx.lineWidth = (1 - length / threshold) * 2.5
      ctx.globalAlpha = 1 - length / threshold
      ctx.beginPath()
      ctx.moveTo(edge.from.x, edge.from.y)
      ctx.lineTo(edge.to.x, edge.to.y)
      ctx.stroke()
    })

    ctx.globalAlpha = 1
  }

  function animate() {
    const canvas = getCanvas()
    if (!canvas) return

    // 位移更新只放在帧循环里，配置变化不会直接夹带运动逻辑。
    moveNodes({
      nodes,
      mousePos,
      width: canvas.width,
      height: canvas.height
    })
    render()
    frameId = requestAnimationFrame(animate)
  }

  function handleMouseMove(event) {
    mousePos.x = event.clientX
    mousePos.y = event.clientY
    // 鼠标只驱动隐藏节点，实际粒子仍按既有规则运动。
    updateDrivenNode(nodes, mousePos)
  }

  onMounted(() => {
    // 先拿上下文，再完成一次初始尺寸同步和首帧渲染。
    ctx = getCanvas()?.getContext('2d') ?? null
    resize()
    rebuild()
    render()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    frameId = requestAnimationFrame(animate)
  })

  onUnmounted(() => {
    // 组件卸载时回收事件和动画帧，避免旧实例继续驱动画布。
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', handleMouseMove)
    cancelAnimationFrame(frameId)
  })

  watch(
    () => optionsRef.value.rebuildToken,
    (nextToken) => {
      if (nextToken === lastToken) return
      lastToken = nextToken
      // 只在父层确认参数变更后重建，输入过程本身不直接重算网络。
      rebuild()
      render()
    }
  )
}
