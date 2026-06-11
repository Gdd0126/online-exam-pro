<template>
  <div v-if="result" ref="reportRef" class="result-page">
    <PageHeader title="成绩报告" subtitle="查看自动批改结果、考试信息、答题表现和错题解析。" eyebrow="查看批改结果">
      <template #actions>
        <div class="pdf-export-tip pdf-ignore">
          <span>导出包含成绩总览、答题表现与错题解析的 PDF 报告</span>
          <el-button type="primary" icon="Download" @click="exportPdf">导出 PDF</el-button>
        </div>
      </template>
    </PageHeader>
    <section class="result-hero">
      <div>
        <p>成绩总览</p>
        <h1>{{ result.score }} / {{ result.total_score }}</h1>
        <span>{{ result.exam_title }} · {{ result.student_name }}</span>
        <p><el-tag :class="performanceTagClass">{{ performanceText }}</el-tag></p>
      </div>
      <div class="score-ring">
        <el-progress type="circle" :percentage="Number(result.accuracy)" :width="118" />
      </div>
    </section>
    <section class="panel report-section">
      <div class="panel-head">
        <div><h2>考试信息</h2><p>用于报告截图时快速说明考试来源和提交状态。</p></div>
      </div>
      <div class="report-info-grid">
        <div class="report-info-item"><span>考试名称</span><strong>{{ result.exam_title }}</strong></div>
        <div class="report-info-item"><span>考生姓名</span><strong>{{ result.student_name }}</strong></div>
        <div class="report-info-item"><span>提交时间</span><strong>{{ result.submitted_at }}</strong></div>
        <div class="report-info-item"><span>提交状态</span><el-tag :class="result.is_timeout ? 'tag-timeout' : 'tag-published'">{{ result.is_timeout ? '超时提交' : '正常提交' }}</el-tag></div>
      </div>
    </section>
    <section class="report-section">
      <div class="panel-head">
        <div><h2>答题表现</h2><p>从正确率、用时和考试行为呈现本次作答质量。</p></div>
      </div>
      <div class="stats-grid">
        <StatCard label="正确题数" :value="result.correct_count" icon="CircleCheck" />
        <StatCard label="错误题数" :value="result.wrong_count" icon="CircleClose" />
        <StatCard label="正确率" :value="`${result.accuracy}%`" icon="TrendCharts" />
        <StatCard label="用时" :value="formatSeconds(result.duration_used)" icon="Timer" />
        <StatCard label="切屏次数" :value="result.switch_count" icon="WarnTriangleFilled" />
      </div>
    </section>
    <section class="panel report-section">
      <div class="section-head">
        <div>
          <h2>错题复习</h2>
          <p class="muted">自动批改后生成学习反馈，支持只看错题。</p>
        </div>
        <div class="toolbar-actions">
          <el-switch v-model="onlyWrong" active-text="只看错题" inactive-text="查看全部" />
          <el-tag :type="result.is_timeout ? 'danger' : 'success'">{{ result.is_timeout ? '超时提交' : '正常提交' }}</el-tag>
        </div>
      </div>
      <EmptyState v-if="reviewList.length === 0" text="全部答对，表现很稳" />
      <el-collapse v-else>
        <el-collapse-item v-for="item in reviewList" :key="item.questionId">
          <template #title>
            <div class="review-title">
              <el-tag :type="item.isCorrect ? 'success' : 'danger'">{{ item.isCorrect ? '正确' : '错题' }}</el-tag>
              <span>{{ item.title }}</span>
            </div>
          </template>
          <div class="answer-compare two-col">
            <div :class="['answer-pill', item.isCorrect ? 'correct' : 'wrong']">
              <span>我的答案</span>
              <strong>{{ answerLabel(item.userAnswer) }}</strong>
            </div>
            <div class="answer-pill correct">
              <span>正确答案</span>
              <strong>{{ item.correctAnswer }}</strong>
            </div>
          </div>
          <p class="muted">{{ item.analysis || '暂无解析' }}</p>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getResult } from '@/api/results'
import { answerLabel, formatSeconds } from '@/utils/format'
import { exportResultPdf } from '@/utils/pdf'

const route = useRoute()
const result = ref<any>()
const reportRef = ref<HTMLElement>()
const onlyWrong = ref(true)
const wrongList = computed(() => (result.value?.detail || []).filter((item: any) => !item.isCorrect))
const reviewList = computed(() => onlyWrong.value ? wrongList.value : (result.value?.detail || []))
const performanceText = computed(() => {
  const accuracy = Number(result.value?.accuracy || 0)
  if (accuracy >= 85) return '优秀'
  if (accuracy >= 60) return '及格'
  return '待提升'
})
const performanceTagClass = computed(() => {
  const accuracy = Number(result.value?.accuracy || 0)
  if (accuracy >= 85) return 'tag-excellent'
  if (accuracy >= 60) return 'tag-pass'
  return 'tag-improve'
})
function exportPdf() {
  exportResultPdf(result.value, reportRef.value)
}
onMounted(async () => {
  result.value = await getResult(route.params.id as string)
})
</script>
