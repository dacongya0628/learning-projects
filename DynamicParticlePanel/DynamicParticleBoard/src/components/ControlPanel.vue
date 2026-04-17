<template>
  <div class="control-panel">
    <div class="inputBox">
      点数：<input class="nodeNum" type="number" :value="nodeNumValue" @input="emitNodeNum" />
    </div>
    <div class="inputBox two">
      速度：<input class="speed" type="number" :value="speedValue" @input="emitSpeed" />
    </div>
    <div class="inputBox thr">
      版本：
      <span :class="['type', props.type === 1 ? 'active' : '']" @click="emitType(1)">正常</span>
      <span :class="['type', props.type === 2 ? 'active' : '']" @click="emitType(2)">鬼畜</span>
    </div>
    <div class="inputBox four">
      <a href="https://www.dacongyaa.com/" target="_blank" rel="noreferrer">开发者：行走的大葱鸭</a>
    </div>

    <div v-if="props.showTip" class="loadTip">
      <div class="loading">
        <div class="cover"></div>
      </div>
      <span>{{ props.tip }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

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
  showTip: {
    type: Boolean,
    default: false
  },
  tip: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['change-node-num', 'change-speed', 'change-type'])

// 输入框保留一份本地显示值，越界输入时不被父层立即回写覆盖。
const nodeNumValue = ref(String(props.nodeNum))
const speedValue = ref(String(props.speed))

// 父层接受合法值后，再把面板显示值同步回标准状态。
watch(
  () => props.nodeNum,
  (value) => {
    nodeNumValue.value = String(value)
  }
)

watch(
  () => props.speed,
  (value) => {
    speedValue.value = String(value)
  }
)

function emitNodeNum(event) {
  // 先更新输入框显示，再把数值交给父层判定是否生效。
  nodeNumValue.value = event.target.value
  emit('change-node-num', Number(event.target.value))
}

function emitSpeed(event) {
  // 速度输入沿用和点数相同的本地显示策略。
  speedValue.value = event.target.value
  emit('change-speed', Number(event.target.value))
}

function emitType(nextType) {
  // 模式切换不做中间态，直接把目标模式抛给父层。
  emit('change-type', nextType)
}
</script>

<style scoped>
.control-panel {
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: 10;
}

.inputBox {
  align-items: center;
  border-bottom: 1px solid #fff;
  color: #fff;
  display: flex;
  font-size: 16px;
  justify-content: center;
  left: 20px;
  line-height: 1;
  padding: 5px 0;
  pointer-events: auto;
  position: absolute;
  top: 20px;
}

.inputBox.two {
  top: 60px;
}

.inputBox.thr {
  top: 100px;
}

.inputBox.four {
  color: rgb(175, 173, 173);
  font-size: 12px;
  top: 140px;
}

.inputBox.four a {
  color: inherit;
  text-decoration: none;
}

.type {
  cursor: pointer;
  margin-right: 10px;
}

.type.active {
  color: yellow;
}

input {
  background: none;
  border: none;
  color: #fff;
  outline: none;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

input[type='number'] {
  -moz-appearance: textfield;
}

.loadTip {
  align-items: center;
  background: #000;
  border-radius: 150px;
  box-shadow: 0 0 10px #fff;
  color: #fff;
  display: flex;
  font-size: 15px;
  justify-content: center;
  left: 50%;
  padding: 15px;
  pointer-events: auto;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  z-index: 99;
}

.loading {
  align-items: center;
  animation: myLoading 0.5s infinite;
  background-image: linear-gradient(red, yellow, green, blue);
  border-radius: 50%;
  display: flex;
  height: 15px;
  justify-content: center;
  margin-right: 10px;
  width: 15px;
}

.cover {
  background: #000;
  border-radius: 50%;
  height: 12px;
  width: 12px;
}

@keyframes myLoading {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }

  50% {
    transform: rotateX(180deg) rotateY(180deg);
  }

  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
}
</style>
