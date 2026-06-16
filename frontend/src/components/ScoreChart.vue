<template>
  <EmptyState v-if="!data.length" class="chart-empty" text="暂无图表数据" />
  <div v-else ref="chartRef" class="chart"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'

const props = defineProps<{ title?: string; type?: 'bar' | 'line'; data: any[]; horizontal?: boolean }>()
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

function render() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const names = props.data.map((item) => item.name)
  const values = props.data.map((item) => item.value)
  chart.setOption({
    title: { text: props.title || '', left: 8, top: 4, textStyle: { fontSize: 14, color: '#132238', fontWeight: 700 } },
    tooltip: { trigger: 'axis' },
    grid: { left: props.horizontal ? 120 : 36, right: 24, top: 48, bottom: 34 },
    xAxis: props.horizontal ? { type: 'value' } : { type: 'category', data: names, axisLabel: { interval: 0 } },
    yAxis: props.horizontal ? { type: 'category', data: names, axisLabel: { width: 104, overflow: 'truncate' } } : { type: 'value' },
    series: [{
      type: props.type || 'bar',
      data: values,
      smooth: true,
      barWidth: 24,
      itemStyle: { borderRadius: props.horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0], color: '#c1292e' },
      lineStyle: props.type === 'line' ? { color: '#c1292e', width: 3 } : undefined,
      areaStyle: props.type === 'line' ? { color: 'rgba(193,41,46,.14)' } : undefined
    }]
  })
}

function resize() {
  chart?.resize()
}

watch(() => props.data, () => nextTick(render), { deep: true })
onMounted(() => {
  nextTick(render)
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>
