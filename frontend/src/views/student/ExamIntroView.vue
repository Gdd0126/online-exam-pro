<template>
  <div v-loading="loading" class="intro-page" v-if="exam">
    <PageHeader title="确认考试规则" subtitle="阅读考试时长、总分、题目数量和行为要求后再开始答题。" eyebrow="考试须知" />
    <section class="intro-hero">
      <el-tag :class="completedResult ? 'tag-published' : 'tag-draft'" size="large">{{ completedResult ? '已完成' : '未完成' }}</el-tag>
      <h1>{{ exam.title }}</h1>
      <p>{{ exam.description }}</p>
      <div class="exam-meta">
        <span><el-icon><Timer /></el-icon>{{ exam.duration }} 分钟</span>
        <span><el-icon><Medal /></el-icon>{{ exam.total_score }} 分</span>
        <span><el-icon><Document /></el-icon>{{ exam.questions.length }} 题</span>
      </div>
    </section>
    <section class="rules-panel">
      <div class="panel-head">
        <div><h2>考试规则 checklist</h2><p>开始前请确认考试规则、防切屏和自动保存说明。</p></div>
      </div>
      <div class="rule"><el-icon><Clock /></el-icon><span>考试限时 {{ exam.duration }} 分钟，倒计时结束会自动提交。</span></div>
      <div class="rule"><el-icon><WarnTriangleFilled /></el-icon><span>答题过程中请勿切屏，系统会记录切屏次数。</span></div>
      <div class="rule"><el-icon><FolderChecked /></el-icon><span>选择答案后系统自动保存进度，刷新页面可恢复。</span></div>
      <div class="rule"><el-icon><CircleCheck /></el-icon><span>提交后立即自动批改并生成成绩分析报告。</span></div>
      <div class="agree-row">
        <template v-if="completedResult">
          <el-tag type="success">该考试已完成</el-tag>
          <el-button type="success" size="large" icon="View" @click="$router.push(`/student/results/${completedResult.id}`)">查看成绩</el-button>
        </template>
        <template v-else>
          <el-checkbox v-model="agreed">我已阅读并同意考试规则</el-checkbox>
          <el-button type="primary" size="large" icon="Right" :disabled="!agreed" @click="$router.push(`/student/exams/${exam.id}/take`)">开始考试</el-button>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getExam } from '@/api/exams'
import { getResults } from '@/api/results'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()
const exam = ref<any>()
const completedResult = ref<any>()
const agreed = ref(false)
const loading = ref(false)
onMounted(async () => {
  loading.value = true
  try {
    const [examData, resultRows] = await Promise.all([
      getExam(route.params.id as string),
      getResults()
    ])
    exam.value = examData
    completedResult.value = (resultRows as any[]).find((result) => Number(result.exam_id) === Number(route.params.id))
  } finally {
    loading.value = false
  }
})
</script>
