<template>
  <div class="countdown" :class="{ danger: remain <= 300 }">
    <el-icon><Clock /></el-icon>
    <span>{{ formatSeconds(remain) }}</span>
    <small v-if="remain > 0 && remain <= 300">剩余时间不足 5 分钟，请尽快提交</small>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatSeconds } from '@/utils/format'

const props = defineProps<{ seconds?: number; endAt?: number; running?: boolean }>()
const emit = defineEmits<{ timeout: [] }>()
const remain = ref(0)
let timer = 0
let emitted = false

function calcRemain() {
  if (props.endAt) return Math.max(0, Math.floor((props.endAt - Date.now()) / 1000))
  return Math.max(0, props.seconds || 0)
}

function updateRemain() {
  if (props.endAt) remain.value = calcRemain()
  else remain.value = Math.max(0, remain.value - 1)
  if (remain.value <= 0 && !emitted) {
    emitted = true
    window.clearInterval(timer)
    emit('timeout')
  }
}

function start() {
  window.clearInterval(timer)
  emitted = false
  remain.value = calcRemain()
  if (remain.value <= 0) {
    updateRemain()
    return
  }
  timer = window.setInterval(() => {
    if (props.running === false) return
    updateRemain()
  }, 1000)
}

watch(() => [props.seconds, props.endAt], () => {
  start()
})

onMounted(start)
onBeforeUnmount(() => window.clearInterval(timer))
</script>
