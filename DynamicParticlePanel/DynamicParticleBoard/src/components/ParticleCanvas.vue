<template>
  <canvas ref="canvasRef" class="particle-canvas"></canvas>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useParticleNetwork } from '../composables/useParticleNetwork'

const props = defineProps({
  nodeNum: {
    type: Number,
    required: true
  },
  speed: {
    type: Number,
    required: true
  },
  type: {
    type: Number,
    required: true
  },
  rebuildToken: {
    type: Number,
    required: true
  }
})

const canvasRef = ref(null)
// 画布侧只关心运行时参数，不接触表单和提示层状态。
const optionsRef = computed(() => ({
  nodeNum: props.nodeNum,
  speed: props.speed,
  type: props.type,
  rebuildToken: props.rebuildToken
}))

useParticleNetwork(canvasRef, optionsRef)
</script>

<style scoped>
.particle-canvas {
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}
</style>
