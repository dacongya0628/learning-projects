import { TYPE_NORMAL } from '../constants/defaults'

export function getThreshold(width) {
  // 连线阈值继续和画布宽度绑定，维持原始网络密度。
  return width / 8
}

export function clamp(min, max, value) {
  if (value > max) return max
  if (value < min) return min
  return value
}

export function buildNodes({ nodeNum, speed, width, height, random = Math.random }) {
  return Array.from({ length: Number.parseInt(nodeNum, 10) + 1 }, (_, index) => ({
    // 第一个节点不参与绘制，只作为鼠标扰动源。
    drivenByMouse: index === 0,
    x: random() * width,
    y: random() * height,
    vx: random() * speed - 0.1,
    vy: random() * speed - 0.1,
    radius: random() > 0.9 ? 3 + random() * 3 : 1 + random() * 3
  }))
}

export function buildEdges(nodes) {
  const edges = []

  nodes.forEach((from, index) => {
    // 只保留无向边的一份组合，避免和原始版本一样再做额外去重扫描。
    nodes.slice(index + 1).forEach((to) => {
      edges.push({ from, to })
    })
  })

  return edges
}

export function getEdgeLength(edge) {
  return Math.sqrt(
    Math.pow(edge.from.x - edge.to.x, 2) + Math.pow(edge.from.y - edge.to.y, 2)
  )
}

export function getNodeDistance(node, mousePos, width) {
  if (mousePos.x !== null && mousePos.y !== null) {
    return Math.sqrt(Math.pow(node.x - mousePos.x, 2) + Math.pow(node.y - mousePos.y, 2))
  }

  // 鼠标尚未进入画布时保留旧版默认距离，避免初始分支抖动。
  return width / 4
}

export function moveNodes({ nodes, mousePos, width, height }) {
  const threshold = getThreshold(width)

  nodes.forEach((node) => {
    if (node.drivenByMouse) return

    node.x += node.vx
    node.y += node.vy

    const distance = getNodeDistance(node, mousePos, width)

    if (distance > threshold) {
      // 远离鼠标时沿用边界反弹。
      if (node.x <= 0 || node.x >= width) {
        node.vx *= -1
        node.x = clamp(0, width, node.x)
      }

      if (node.y <= 0 || node.y >= height) {
        node.vy *= -1
        node.y = clamp(0, height, node.y)
      }

      return
    }

    // 靠近鼠标时改为方向反转，维持原始扰动感。
    if ((node.x > mousePos.x && node.vx > 0) || (node.x < mousePos.x && node.vx < 0)) {
      node.vx *= -1
    }

    if ((node.y > mousePos.y && node.vy > 0) || (node.y < mousePos.y && node.vy < 0)) {
      node.vy *= -1
    }
  })
}

export function updateDrivenNode(nodes, mousePos) {
  if (!nodes.length || mousePos.x === null || mousePos.y === null) return

  // 隐藏节点用插值跟随鼠标，保留原始“跟随但不抢镜”的节奏。
  nodes[0].x += (mousePos.x - nodes[0].x) / 5
  nodes[0].y += (mousePos.y - nodes[0].y) / 5
}

export function getNodeFillStyle(type, random = Math.random) {
  // 鬼畜模式继续按绘制时随机取色，保持闪烁感。
  if (type === TYPE_NORMAL) return '#fff'
  return `rgba(${random() * 255},${random() * 255},${random() * 255})`
}

export function getEdgeStrokeStyle(type, random = Math.random) {
  // 线条颜色和节点颜色保持同一模式分支，不额外引入调色状态。
  if (type === TYPE_NORMAL) return '#fff'
  return `rgba(${random() * 255},${random() * 255},${random() * 255})`
}
