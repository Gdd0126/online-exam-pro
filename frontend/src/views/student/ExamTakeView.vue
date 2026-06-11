<template>
  <div v-if="exam" class="page-content take-layout-page">
    <PageHeader title="在线答题" subtitle="专注完成试卷，系统会自动保存答案并记录考试行为。" eyebrow="专注完成试卷">
      <template #actions>
        <el-tag :class="switchCount > 0 ? 'tag-switch' : 'tag-published'">切屏 {{ switchCount }} 次</el-tag>
      </template>
    </PageHeader>
  <div class="take-page take-shell">
    <aside class="answer-sheet">
      <h3>答题卡</h3>
      <div class="sheet-legend">
        <span><i class="legend-dot active"></i>当前题</span>
        <span><i class="legend-dot done"></i>已答题</span>
        <span><i class="legend-dot"></i>未答题</span>
      </div>
      <div class="sheet-grid">
        <button v-for="(q, i) in exam.questions" :key="q.id" :class="{ done: answers[q.id], active: i === currentIndex }" @click="setCurrentIndex(i)">{{ i + 1 }}</button>
      </div>
      <div class="risk-box">
        <span>切屏次数</span>
        <strong>{{ switchCount }}</strong>
      </div>
    </aside>
    <main class="exam-paper">
      <div class="paper-header">
        <div>
          <h1>{{ exam.title }}</h1>
          <p>已答 {{ answeredCount }}/{{ exam.questions.length }} 题 · {{ unansweredCount }} 题未答</p>
        </div>
        <div class="paper-status">
          <span class="save-status">已自动保存 {{ savedAtText }}</span>
          <el-tag :type="switchCount > 0 ? 'warning' : 'info'">切屏 {{ switchCount }} 次</el-tag>
          <CountdownTimer :end-at="endAt" @timeout="autoSubmit" />
        </div>
      </div>
      <QuestionCard v-if="currentQuestion" :key="currentQuestion.id" :question="currentQuestion" :index="currentIndex" :answer="answers[currentQuestion.id]" @update:answer="setAnswer(currentQuestion.id, $event)" />
      <div class="submit-bar">
        <div>
          <el-button size="large" :disabled="currentIndex === 0" @click="prevQuestion">上一题</el-button>
          <el-button size="large" :disabled="currentIndex === exam.questions.length - 1" @click="nextQuestion">下一题</el-button>
        </div>
        <el-button type="primary" size="large" icon="Check" :loading="submitting" @click="confirmSubmit">提交试卷</el-button>
      </div>
    </main>
    <aside class="take-side">
      <h3>答题进度</h3>
      <div class="progress-mini">
        <el-progress :percentage="progressPercent" :stroke-width="12" />
        <p class="muted">已答 {{ answeredCount }} 题，未答 {{ unansweredCount }} 题</p>
        <el-button class="full" type="primary" icon="Check" :loading="submitting" @click="confirmSubmit">提交试卷</el-button>
      </div>
    </aside>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import CountdownTimer from '@/components/CountdownTimer.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import { getExam, submitExam } from '@/api/exams'
import { getResults } from '@/api/results'
import { useAuthStore } from '@/stores/auth'
import { examDraftKey, getStorage, removeStorage, setStorage } from '@/utils/storage'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const exam = ref<any>()
const answers = reactive<Record<string, string>>({})
const switchCount = ref(0)
const submitting = ref(false)
const startAt = ref(Date.now())
const endAt = ref(0)
const submitted = ref(false)
const currentIndex = ref(0)
const lastSavedAt = ref(Date.now())
const questionOrder = ref<number[]>([])
let lastSwitchAt = 0
let pendingSwitch: number | null = null
let leavingPage = false
let switchAlertPending = false
let switchAlertOpen = false
const answeredCount = computed(() => Object.values(answers).filter(Boolean).length)
const unansweredCount = computed(() => Math.max((exam.value?.questions?.length || 0) - answeredCount.value, 0))
const progressPercent = computed(() => {
  const total = exam.value?.questions?.length || 0
  return total ? Math.round((answeredCount.value / total) * 100) : 0
})
const currentQuestion = computed(() => exam.value?.questions?.[currentIndex.value])
const savedAtText = computed(() => new Date(lastSavedAt.value).toLocaleTimeString('zh-CN', { hour12: false }))

function draftKey() {
  return examDraftKey(route.params.id as string, auth.user?.id || 'guest')
}
function persist() {
  lastSavedAt.value = Date.now()
  setStorage(draftKey(), {
    answers,
    switchCount: switchCount.value,
    startAt: startAt.value,
    endAt: endAt.value,
    questionOrder: questionOrder.value,
    currentIndex: currentIndex.value,
    currentQuestionId: currentQuestion.value?.id
  })
}
function setAnswer(id: number, value: string) {
  answers[String(id)] = value
  persist()
}
function setCurrentIndex(index: number) {
  const maxIndex = Math.max((exam.value?.questions?.length || 1) - 1, 0)
  currentIndex.value = Math.min(Math.max(index, 0), maxIndex)
  persist()
}
function prevQuestion() {
  setCurrentIndex(currentIndex.value - 1)
}
function nextQuestion() {
  setCurrentIndex(currentIndex.value + 1)
}
function clearPendingSwitch() {
  if (pendingSwitch !== null) {
    window.clearTimeout(pendingSwitch)
    pendingSwitch = null
  }
}
function showSwitchAlert() {
  if (!switchAlertPending || switchAlertOpen || submitted.value) return
  switchAlertPending = false
  switchAlertOpen = true
  ElMessageBox.alert(
    `检测到你离开了考试页面，本次行为已记录。当前切屏次数：${switchCount.value} 次。`,
    '切屏提示',
    {
      type: 'warning',
      confirmButtonText: '我知道了'
    }
  ).finally(() => {
    switchAlertOpen = false
  })
}
function recordSwitch() {
  if (submitted.value) return
  const now = Date.now()
  if (now - lastSwitchAt < 800) return
  lastSwitchAt = now
  switchCount.value += 1
  switchAlertPending = true
  persist()
  if (!document.hidden && document.hasFocus()) showSwitchAlert()
}
function scheduleSwitchCheck() {
  if (submitted.value || leavingPage || pendingSwitch !== null) return
  pendingSwitch = window.setTimeout(() => {
    pendingSwitch = null
    if (leavingPage || submitted.value) return
    recordSwitch()
  }, 900)
}
function handleVisibilityChange() {
  if (document.hidden) {
    scheduleSwitchCheck()
  } else {
    clearPendingSwitch()
    showSwitchAlert()
  }
}
function handleFocus() {
  if (!document.hidden) {
    clearPendingSwitch()
    showSwitchAlert()
  }
}
function handlePageLeaving() {
  leavingPage = true
  clearPendingSwitch()
  persist()
}
async function doSubmit(isTimeout = false) {
  if (submitted.value) return
  submitted.value = true
  submitting.value = true
  try {
    const data: any = await submitExam({
      exam_id: Number(route.params.id),
      answers: { ...answers },
      duration_used: Math.floor((Date.now() - startAt.value) / 1000),
      switch_count: switchCount.value,
      is_timeout: isTimeout
    })
    removeStorage(draftKey())
    ElMessage.success('提交成功，正在生成成绩')
    router.replace(`/student/results/${data.id}`)
  } catch (error: any) {
    const status = error.response?.status
    const body = error.response?.data
    const resultId = body?.data?.result_id || body?.data?.id
    if ((status === 400 || status === 409) && body?.message === '你已提交过该考试，不能重复提交' && resultId) {
      removeStorage(draftKey())
      ElMessage.warning(body.message)
      router.replace(`/student/results/${resultId}`)
      return
    }
    submitted.value = false
  } finally {
    submitting.value = false
  }
}
async function confirmSubmit() {
  try {
    const message = unansweredCount.value > 0
      ? `<div class="submit-confirm"><p>本次提交仍有未答题，请确认是否继续。</p><ul><li>总题数：<strong>${exam.value.questions.length}</strong> 题</li><li>已答题数：<strong>${answeredCount.value}</strong> 题</li><li>未答题数：<strong>${unansweredCount.value}</strong> 题</li></ul></div>`
      : `<div class="submit-confirm"><p>试卷已全部作答，确认提交后不可修改。</p><ul><li>总题数：<strong>${exam.value.questions.length}</strong> 题</li><li>已答题数：<strong>${answeredCount.value}</strong> 题</li><li>未答题数：<strong>0</strong> 题</li></ul></div>`
    await ElMessageBox.confirm(message, '提交确认', {
      dangerouslyUseHTMLString: true,
      type: unansweredCount.value > 0 ? 'warning' : 'info',
      confirmButtonText: '确认提交',
      cancelButtonText: '继续答题'
    })
    doSubmit(false)
  } catch {
    // user canceled
  }
}
function autoSubmit() {
  ElMessage.warning('考试时间已到，系统自动提交')
  doSubmit(true)
}
onMounted(async () => {
  const resultRows = await getResults()
  const completedResult = (resultRows as any[]).find((result) => Number(result.exam_id) === Number(route.params.id))
  if (completedResult) {
    ElMessage.info('该考试已完成，已为你跳转到成绩报告')
    router.replace(completedResult.id ? `/student/results/${completedResult.id}` : '/student/results')
    return
  }

  exam.value = await getExam(route.params.id as string)
  const draft = getStorage<any>(draftKey(), { answers: {}, switchCount: 0, startAt: 0, endAt: 0, questionOrder: [], currentIndex: 0, currentQuestionId: null })
  const savedOrder = Array.isArray(draft.questionOrder) ? draft.questionOrder.map(Number).filter(Boolean) : []
  if (exam.value?.is_random && savedOrder.length) {
    const orderMap = new Map<number, number>(savedOrder.map((id: number, index: number) => [id, index]))
    exam.value.questions = [...exam.value.questions].sort((a: any, b: any) => {
      const aIndex = orderMap.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER
      const bIndex = orderMap.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER
      return aIndex - bIndex
    })
    questionOrder.value = [
      ...savedOrder,
      ...exam.value.questions.map((question: any) => Number(question.id)).filter((id: number) => !savedOrder.includes(id))
    ]
  } else {
    questionOrder.value = exam.value.questions.map((question: any) => Number(question.id))
  }
  startAt.value = draft.startAt || Date.now()
  endAt.value = draft.endAt || Date.now() + Number(exam.value.duration) * 60 * 1000
  Object.assign(answers, draft.answers || {})
  switchCount.value = draft.switchCount || 0
  const savedQuestionIndex = exam.value.questions.findIndex((question: any) => Number(question.id) === Number(draft.currentQuestionId))
  setCurrentIndex(savedQuestionIndex >= 0 ? savedQuestionIndex : Number(draft.currentIndex || 0))
  persist()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('blur', scheduleSwitchCheck)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('beforeunload', handlePageLeaving)
  window.addEventListener('pagehide', handlePageLeaving)
})
onBeforeUnmount(() => {
  clearPendingSwitch()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('blur', scheduleSwitchCheck)
  window.removeEventListener('focus', handleFocus)
  window.removeEventListener('beforeunload', handlePageLeaving)
  window.removeEventListener('pagehide', handlePageLeaving)
})
</script>
