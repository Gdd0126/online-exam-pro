<template>
  <div class="page-content">
    <PageHeader title="创建与发布考试" subtitle="统一维护考试基础信息、发布状态、题目数量和考试规则。" eyebrow="考试管理">
      <template #actions>
        <el-button type="primary" icon="Plus" @click="openDialog()">创建考试</el-button>
      </template>
    </PageHeader>
    <div class="toolbar">
      <div class="filter-bar">
        <el-input v-model="filters.keyword" placeholder="搜索考试名称" clearable prefix-icon="Search" />
        <el-select v-model="filters.status" placeholder="发布状态" clearable>
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
      </div>
      <div class="toolbar-actions">
        <el-button icon="Refresh" @click="load">刷新数据</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="filteredRows" class="pro-table">
      <el-table-column prop="title" label="考试名称" min-width="180" />
      <el-table-column prop="duration" label="时长/分钟" width="110" />
      <el-table-column prop="total_score" label="总分" width="90" />
      <el-table-column prop="question_count" label="题数" width="90" />
      <el-table-column label="随机" width="90"><template #default="{ row }"><el-tag :type="row.is_random ? 'success' : 'info'">{{ row.is_random ? '随机' : '固定' }}</el-tag></template></el-table-column>
      <el-table-column label="发布" width="100"><template #default="{ row }"><el-tag :class="row.is_published ? 'tag-published' : 'tag-draft'">{{ row.is_published ? '已发布' : '未发布' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button text icon="Edit" @click="openDialog(row)">编辑</el-button>
          <el-button text :type="row.is_published ? 'warning' : 'primary'" icon="Promotion" @click="togglePublish(row)">
            {{ row.is_published ? '取消发布' : '发布' }}
          </el-button>
          <el-button text type="danger" icon="Delete" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty><EmptyState text="暂无考试数据" /></template>
    </el-table>
    <el-dialog v-model="visible" :title="form.id ? '编辑考试' : '创建考试'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <section class="form-section">
          <h3>基础信息</h3>
          <el-form-item label="考试名称" prop="title"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        </section>
        <section class="form-section">
          <h3>考试设置</h3>
          <el-form-item label="时长" prop="duration"><el-input-number v-model="form.duration" :min="1" :max="240" /> 分钟</el-form-item>
          <el-form-item label="总分" prop="total_score"><el-input-number v-model="form.total_score" :min="1" :max="300" /></el-form-item>
          <el-form-item label="随机题序"><el-switch v-model="form.is_random" /></el-form-item>
          <el-form-item label="发布状态"><el-switch v-model="form.is_published" /></el-form-item>
        </section>
        <section class="form-section">
          <h3>题目配置</h3>
          <div class="exam-meta">
            <span>当前题目：{{ questionCount }} 题</span>
            <span>题目总分：{{ questionScore }} 分</span>
            <span>试卷总分：{{ form.total_score }} 分</span>
          </div>
          <el-alert
            v-if="form.id && questionCount === 0"
            title="当前考试还没有题目，请先添加题目后再发布。"
            type="warning"
            show-icon
            :closable="false"
          />
          <el-alert
            v-else-if="form.id && scoreMismatch"
            :title="`题目总分为 ${questionScore} 分，与试卷总分 ${form.total_score} 分不一致。`"
            type="warning"
            show-icon
            :closable="false"
          />
          <el-alert
            v-if="!form.id"
            title="新建考试需要先保存为草稿，获得考试 ID 后才能添加或导入题目。"
            type="info"
            show-icon
            :closable="false"
          />
          <div class="toolbar-actions">
            <el-button v-if="!form.id" icon="FolderChecked" @click="saveDraftAndContinue">保存草稿并配置题目</el-button>
            <el-button :disabled="!form.id" icon="Collection" @click="openQuestionPicker">从题库选择题目</el-button>
            <el-button :disabled="!form.id" icon="Upload" @click="fileInput?.click()">本地导入题目</el-button>
            <input ref="fileInput" hidden type="file" accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="handleImport" />
          </div>
          <p class="muted">支持上传 .xlsx 或 .json 文件。Excel 文件请按模板字段填写；JSON 文件支持数组或 { items: [...] } 格式。</p>
        </section>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="questionPickerVisible" title="从题库选择题目" width="780px">
      <el-table v-loading="questionPickerLoading" :data="candidateQuestions" row-key="id" class="pro-table" @selection-change="selectedQuestions = $event">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="title" label="题干" min-width="240">
          <template #default="{ row }">
            <el-tooltip :content="row.title" placement="top-start">
              <div class="cell-title">{{ row.title }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="exam_title" label="来源考试" min-width="150" />
        <el-table-column label="题型" width="90">
          <template #default="{ row }">{{ row.type === 'single' ? '单选' : '判断' }}</template>
        </el-table-column>
        <el-table-column prop="score" label="分值" width="80" />
      </el-table>
      <template #footer>
        <el-button @click="questionPickerVisible = false">取消</el-button>
        <el-button type="primary" :disabled="selectedQuestions.length === 0" @click="copySelectedQuestions">加入当前考试</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { createExam, deleteExam, getExams, updateExam } from '@/api/exams'
import { createQuestion, getQuestions, importQuestions } from '@/api/questions'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'

const rows = ref<any[]>([])
const examQuestions = ref<any[]>([])
const loading = ref(false)
const visible = ref(false)
const questionPickerVisible = ref(false)
const questionPickerLoading = ref(false)
const formRef = ref<FormInstance>()
const fileInput = ref<HTMLInputElement>()
const filters = reactive({ keyword: '', status: '' })
const form = reactive<any>({ id: null, title: '', description: '', duration: 45, total_score: 100, is_random: false, is_published: true })
const candidateQuestions = ref<any[]>([])
const selectedQuestions = ref<any[]>([])
const judgeAnswers = ['A', 'B', 'true', 'false', '正确', '错误']
const positiveNumber = (_rule: any, value: number, callback: (error?: Error) => void) => {
  if (Number(value) > 0) callback()
  else callback(new Error('必须大于 0'))
}
const rules: FormRules = {
  title: [{ required: true, whitespace: true, message: '考试标题不能为空', trigger: 'blur' }],
  duration: [{ validator: positiveNumber, trigger: 'change' }],
  total_score: [{ validator: positiveNumber, trigger: 'change' }]
}
const filteredRows = computed(() => rows.value.filter((row) => {
  const matchKeyword = !filters.keyword || row.title.includes(filters.keyword)
  const matchStatus = !filters.status || (filters.status === 'published' ? row.is_published : !row.is_published)
  return matchKeyword && matchStatus
}))
const questionCount = computed(() => examQuestions.value.length)
const questionScore = computed(() => examQuestions.value.reduce((sum, question) => sum + Number(question.score || 0), 0))
const scoreMismatch = computed(() => questionScore.value !== Number(form.total_score || 0))

async function load() {
  loading.value = true
  try { rows.value = await getExams() as any[] } finally { loading.value = false }
}
async function loadExamQuestions() {
  if (!form.id) {
    examQuestions.value = []
    return
  }
  examQuestions.value = await getQuestions({ exam_id: form.id }) as any[]
}
async function openDialog(row?: any) {
  Object.assign(form, row || { id: null, title: '', description: '', duration: 45, total_score: 100, is_random: false, is_published: true })
  examQuestions.value = []
  visible.value = true
  nextTick(() => formRef.value?.clearValidate())
  await loadExamQuestions()
}
async function saveDraftAndContinue() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先完善考试表单')
    return false
  }
  if (form.id) return true
  const data = await createExam({ ...form, is_published: false })
  form.id = data.id
  form.is_published = false
  ElMessage.success('已保存为草稿，现在可以添加题目')
  await load()
  await loadExamQuestions()
  return true
}
async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先完善考试表单')
    return
  }
  if (!form.id && form.is_published) {
    await saveDraftAndContinue()
    ElMessage.warning('请先添加题目并确认总分一致后再发布')
    return
  }
  if (form.id) await updateExam(form.id, form)
  else await createExam(form)
  ElMessage.success('保存成功')
  visible.value = false
  load()
}
async function togglePublish(row: any) {
  await updateExam(row.id, { ...row, is_published: !row.is_published })
  ElMessage.success(row.is_published ? '已取消发布' : '已发布')
  load()
}
async function remove(id: number) {
  await ElMessageBox.confirm('删除考试会同时删除关联题目，确认继续？', '提示', { type: 'warning' })
  await deleteExam(id)
  ElMessage.success('删除成功')
  load()
}
function normalizeQuestionPayload(item: any) {
  const type = String(item.type || '').trim()
  const options = type === 'judge'
    ? ['正确', '错误']
    : (Array.isArray(item.options) ? item.options.map((option: string) => String(option || '').trim()).filter(Boolean) : [])
  return {
    ...item,
    exam_id: form.id,
    title: String(item.title || '').trim(),
    type,
    options,
    answer: String(item.answer || '').trim(),
    score: Number(item.score),
    analysis: String(item.analysis || '').trim()
  }
}
function validateQuestionPayload(item: any) {
  if (!form.id) return '请先保存考试草稿'
  if (!item.title) return '题干不能为空'
  if (!item.type) return '题型不能为空'
  if (!['single', 'judge'].includes(item.type)) return '题型不合法'
  if (!Number.isFinite(Number(item.score)) || Number(item.score) <= 0) return '分值必须大于 0'
  if (!item.answer) return '正确答案不能为空'
  if (item.type === 'single' && item.options.filter(Boolean).length < 2) return '单选题至少需要 2 个非空选项'
  if (item.type === 'judge' && !judgeAnswers.includes(String(item.answer))) return '判断题答案只能是 true/false 或 正确/错误'
  return ''
}
function mapExcelRow(row: any, index: number) {
  const options = ['A', 'B', 'C', 'D', 'E', 'F']
    .map((key) => String(row[key] ?? row[key.toLowerCase()] ?? '').trim())
    .filter(Boolean)
  const item = normalizeQuestionPayload({
    type: row.type ?? row['题型'],
    title: row.title ?? row['题干'],
    options,
    answer: row.answer ?? row['答案'],
    score: row.score ?? row['分值'],
    analysis: row.analysis ?? row['解析'] ?? ''
  })
  const error = validateQuestionPayload(item)
  if (error) throw new Error(`第 ${index + 2} 行：${error}`)
  return item
}
async function parseImportFile(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('Excel 文件中没有工作表')
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }) as any[]
    if (!rows.length) throw new Error('Excel 中没有题目数据')
    return rows.map(mapExcelRow)
  }

  if (name.endsWith('.json')) {
    const raw = JSON.parse(await file.text())
    const list = Array.isArray(raw) ? raw : raw.items
    if (!Array.isArray(list)) throw new Error('导入数据必须是数组')
    const data = list.map((item) => normalizeQuestionPayload(item))
    const errorIndex = data.findIndex((item) => validateQuestionPayload(item))
    if (errorIndex >= 0) throw new Error(`第 ${errorIndex + 1} 条：${validateQuestionPayload(data[errorIndex])}`)
    return data
  }

  throw new Error('仅支持 .json 或 .xlsx 文件')
}
async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const data = await parseImportFile(file)
    await importQuestions(data)
    ElMessage.success(`导入成功，共 ${data.length} 道题`)
    await loadExamQuestions()
    await load()
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败，请检查文件格式')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
async function openQuestionPicker() {
  if (!form.id) {
    ElMessage.warning('请先保存考试草稿')
    return
  }
  questionPickerVisible.value = true
  questionPickerLoading.value = true
  selectedQuestions.value = []
  try {
    const questions = await getQuestions()
    candidateQuestions.value = (questions as any[]).filter((question) => Number(question.exam_id) !== Number(form.id))
  } finally {
    questionPickerLoading.value = false
  }
}
async function copySelectedQuestions() {
  if (!form.id || selectedQuestions.value.length === 0) return
  for (const question of selectedQuestions.value) {
    await createQuestion({
      exam_id: form.id,
      type: question.type,
      title: question.title,
      options: question.options,
      answer: question.answer,
      score: question.score,
      analysis: question.analysis || ''
    })
  }
  ElMessage.success(`已加入 ${selectedQuestions.value.length} 道题`)
  questionPickerVisible.value = false
  await loadExamQuestions()
  await load()
}
onMounted(load)
</script>
