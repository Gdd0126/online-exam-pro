<template>
  <div v-loading="loading" class="page-content">
    <PageHeader title="选择并开始考试" subtitle="查看已发布考试，阅读规则后进入在线答题流程。" eyebrow="考生端" />
    <div class="toolbar">
      <el-segmented v-model="activeStatus" :options="statusOptions" />
    </div>
    <div v-if="!filteredExams.length" class="panel"><EmptyState :text="emptyText" /></div>
    <div v-else class="exam-grid">
      <article v-for="exam in filteredExams" :key="exam.id" class="exam-card">
        <div>
          <el-tag :class="completedResult(exam.id) ? 'tag-published' : 'tag-draft'">{{ completedResult(exam.id) ? '已完成' : '未完成' }}</el-tag>
          <h2>{{ exam.title }}</h2>
          <p>{{ exam.description }}</p>
        </div>
        <div class="exam-meta">
          <span><el-icon><Timer /></el-icon>{{ exam.duration }} 分钟</span>
          <span><el-icon><Medal /></el-icon>{{ exam.total_score }} 分</span>
          <span><el-icon><Document /></el-icon>{{ exam.question_count }} 题</span>
        </div>
        <el-button
          v-if="completedResult(exam.id)"
          type="success"
          size="large"
          icon="View"
          @click="$router.push(`/student/results/${completedResult(exam.id).id}`)"
        >
          查看成绩
        </el-button>
        <el-button v-else type="primary" size="large" icon="Right" @click="$router.push(`/student/exams/${exam.id}/intro`)">开始考试</el-button>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getExams } from '@/api/exams'
import { getResults } from '@/api/results'

const exams = ref<any[]>([])
const results = ref<any[]>([])
const activeStatus = ref<'pending' | 'completed'>('pending')
const loading = ref(false)
const statusOptions = [
  { label: '未完成考试', value: 'pending' },
  { label: '已完成考试', value: 'completed' }
]
const filteredExams = computed(() => exams.value.filter((exam) => {
  const completed = Boolean(completedResult(exam.id))
  return activeStatus.value === 'completed' ? completed : !completed
}))
const emptyText = computed(() => activeStatus.value === 'completed' ? '暂无已完成考试' : '暂无未完成考试')

function completedResult(examId: number | string) {
  return results.value.find((result) => Number(result.exam_id) === Number(examId))
}

onMounted(async () => {
  loading.value = true
  try {
    const [examRows, resultRows] = await Promise.all([
      getExams({ published: 1 }),
      getResults()
    ])
    exams.value = examRows as any[]
    results.value = resultRows as any[]
  } finally {
    loading.value = false
  }
})
</script>
