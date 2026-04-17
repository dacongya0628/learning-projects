<template>
  <div class="wrapper">
    <ControlPanel
      :node-num="nodeNum"
      :speed="speed"
      :type="type"
      :show-tip="showTip"
      :tip="tip"
      @change-node-num="handleNodeNumChange"
      @change-speed="handleSpeedChange"
      @change-type="handleTypeChange"
    />
    <ParticleCanvas
      :node-num="nodeNum"
      :speed="speed"
      :type="type"
      :rebuild-token="rebuildToken"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ControlPanel from './components/ControlPanel.vue'
import ParticleCanvas from './components/ParticleCanvas.vue'
import {
  DEFAULT_NODE_NUM,
  DEFAULT_SPEED,
  MAX_NODE_NUM,
  MAX_SPEED,
  MIN_NODE_NUM,
  MIN_SPEED,
  TIP_BUILDING,
  TIP_INVALID_NODE_NUM,
  TIP_INVALID_SPEED,
  TIP_SWITCHING,
  TYPE_NORMAL
} from './constants/defaults'

// 页面状态保持最小集合，只映射原始 demo 暴露出来的控制项和提示层。
const nodeNum = ref(DEFAULT_NODE_NUM)
const speed = ref(DEFAULT_SPEED)
const type = ref(TYPE_NORMAL)
const showTip = ref(false)
const tip = ref('')
const rebuildToken = ref(0)

let hideTipTimer = 0

// 提示层只维护一个隐藏计时器，新的提示会覆盖旧的隐藏计划。
function clearTipTimer() {
  if (hideTipTimer) {
    window.clearTimeout(hideTipTimer)
    hideTipTimer = 0
  }
}

function showTipBox(message) {
  clearTipTimer()
  showTip.value = true
  tip.value = message
}

function hideTipBox() {
  clearTipTimer()
  showTip.value = false
  tip.value = ''
}

function hideTipBoxByTime(time) {
  clearTipTimer()
  hideTipTimer = window.setTimeout(() => {
    showTip.value = false
    tip.value = ''
    hideTipTimer = 0
  }, time)
}

function triggerRebuild(message) {
  showTipBox(message)
  // 通过递增 token 触发画布侧重建，避免直接把重建逻辑耦合到面板事件里。
  rebuildToken.value += 1
  hideTipBoxByTime(60)
}

function handleNodeNumChange(value) {
  // 合法输入才进入重建流程，越界时只提示，不污染当前配置。
  if (value >= MIN_NODE_NUM && value <= MAX_NODE_NUM) {
    nodeNum.value = value
    triggerRebuild(TIP_BUILDING)
    return
  }

  showTipBox(TIP_INVALID_NODE_NUM)
  hideTipBoxByTime(1500)
}

function handleSpeedChange(value) {
  // 速度修改和点数修改共用相同的重建节奏，保持原始交互反馈一致。
  if (value >= MIN_SPEED && value <= MAX_SPEED) {
    speed.value = value
    triggerRebuild(TIP_BUILDING)
    return
  }

  showTipBox(TIP_INVALID_SPEED)
  hideTipBoxByTime(1500)
}

function handleTypeChange(nextType) {
  // 模式切换直接落状态，再统一走一次整网重建。
  type.value = nextType
  triggerRebuild(TIP_SWITCHING)
}
</script>

<style scoped>
.wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
