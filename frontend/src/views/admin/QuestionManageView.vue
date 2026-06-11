<template>
  <div class="page-content">
    <PageHeader title="维护题目与批量导入" subtitle="管理单选题、判断题，支持 JSON 与 Excel 模板导入，快速构建标准化题库。" eyebrow="题库管理">
      <template #actions>
        <el-button type="primary" icon="Plus" @click="openDialog()">新增题目</el-button>
      </template>
    </PageHeader>
    <div class="toolbar">
      <div class="filter-bar question-filter">
        <el-select v-model="filters.exam_id" placeholder="所属考试" clearable>
          <el-option v-for="exam in exams" :key="exam.id" :label="exam.title" :value="exam.id" />
        </el-select>
        <el-select v-model="filters.type" placeholder="题型" clearable>
          <el-option label="单选题" value="single" />
          <el-option label="判断题" value="judge" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索题干" clearable prefix-icon="Search" />
        <el-button type="primary" icon="Search" @click="load">查询</el-button>
      </div>
      <div class="toolbar-actions">
        <el-button icon="Download" @click="downloadSample">下载示例 JSON</el-button>
        <el-button icon="Document" @click="downloadExcelTemplate">下载 Excel 模板</el-button>
        <el-button icon="Upload" @click="fileInput?.click()">导入 JSON/Excel</el-button>
        <input ref="fileInput" hidden type="file" accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="handleImport" />
      </div>
    </div>
    <p class="muted">支持上传 .xlsx 或 .json 文件。Excel 文件请按模板字段填写；JSON 文件支持数组或 { items: [...] } 格式。</p>
    <el-table v-loading="loading" :data="rows" class="pro-table">
      <el-table-column prop="title" label="题干" min-width="300">
        <template #default="{ row }">
          <el-tooltip :content="row.title" placement="top-start">
            <div class="cell-title">{{ row.title }}</div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="exam_title" label="所属考试" min-width="170"><template #default="{ row }"><el-tag type="info">{{ row.exam_title }}</el-tag></template></el-table-column>
      <el-table-column label="题型" width="110"><template #default="{ row }"><el-tag :class="row.type === 'single' ? 'tag-single' : 'tag-judge'">{{ row.type === 'single' ? '单选题' : '判断题' }}</el-tag></template></el-table-column>
      <el-table-column prop="answer" label="答案" width="80" />
      <el-table-column prop="score" label="分值" width="90"><template #default="{ row }"><el-tag type="warning">{{ row.score }} 分</el-tag></template></el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button text icon="Edit" @click="openDialog(row)">编辑</el-button>
          <el-button text type="danger" icon="Delete" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty><EmptyState text="暂无题目数据" /></template>
    </el-table>
    <el-drawer v-model="visible" :title="form.id ? '编辑题目' : '新增题目'" size="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="所属考试" prop="exam_id">
          <el-select v-model="form.exam_id" class="full">
            <el-option v-for="exam in exams" :key="exam.id" :label="exam.title" :value="exam.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="题型" prop="type">
          <el-segmented v-model="form.type" :options="[{ label: '单选题', value: 'single' }, { label: '判断题', value: 'judge' }]" @change="syncType" />
        </el-form-item>
        <el-form-item label="题干" prop="title"><el-input v-model="form.title" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="选项" prop="options">
          <div class="option-editor">
            <div v-for="(_, idx) in form.options" :key="idx" class="option-row">
              <div class="option-letter">{{ letters[idx] }}</div>
              <el-input v-model="form.options[idx]" :disabled="form.type === 'judge'" />
              <el-button :disabled="form.type === 'judge' || form.options.length <= 2" text type="danger" icon="Delete" @click="removeOption(idx)" />
            </div>
            <el-button v-if="form.type === 'single' && form.options.length < letters.length" icon="Plus" @click="addOption">添加选项</el-button>
          </div>
        </el-form-item>
        <el-form-item label="正确答案" prop="answer">
          <el-select v-model="form.answer">
            <el-option v-for="(_, idx) in form.options" :key="idx" :label="letters[idx]" :value="letters[idx]" />
          </el-select>
        </el-form-item>
        <el-form-item label="分值" prop="score"><el-input-number v-model="form.score" :min="1" /></el-form-item>
        <el-form-item label="解析"><el-input v-model="form.analysis" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { getExams } from '@/api/exams'
import { createQuestion, deleteQuestion, getQuestions, importQuestions, updateQuestion } from '@/api/questions'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'

const rows = ref<any[]>([])
const exams = ref<any[]>([])
const loading = ref(false)
const visible = ref(false)
const formRef = ref<FormInstance>()
const fileInput = ref<HTMLInputElement>()
const filters = reactive<any>({ keyword: '', type: '', exam_id: '' })
const letters = ['A', 'B', 'C', 'D', 'E', 'F']
const form = reactive<any>({ id: null, exam_id: null, type: 'single', title: '', options: ['', '', '', ''], answer: 'A', score: 10, analysis: '' })
const judgeAnswers = ['A', 'B', 'true', 'false', '正确', '错误']
const positiveNumber = (_rule: any, value: number, callback: (error?: Error) => void) => {
  if (Number(value) > 0) callback()
  else callback(new Error('分值必须大于 0'))
}
const validateOptions = (_rule: any, value: string[], callback: (error?: Error) => void) => {
  const nonEmptyOptions = Array.isArray(value) ? value.filter((option) => String(option || '').trim()) : []
  if (form.type === 'single' && nonEmptyOptions.length < 2) callback(new Error('单选题至少需要 2 个非空选项'))
  else callback()
}
const validateAnswer = (_rule: any, value: string, callback: (error?: Error) => void) => {
  const answer = String(value || '').trim()
  if (!answer) return callback(new Error('正确答案不能为空'))
  if (form.type === 'judge' && !judgeAnswers.includes(answer)) return callback(new Error('判断题答案只能是 true/false 或 正确/错误'))
  if (form.type === 'single') {
    const nonEmptyOptions = form.options.filter((option: string) => String(option || '').trim())
    const answerIndex = answer.toUpperCase().charCodeAt(0) - 65
    if (answerIndex < 0 || answerIndex >= nonEmptyOptions.length) return callback(new Error('正确答案必须对应一个非空选项'))
  }
  callback()
}
const rules: FormRules = {
  exam_id: [{ required: true, message: '所属考试不能为空', trigger: 'change' }],
  type: [{ required: true, message: '题型不能为空', trigger: 'change' }],
  title: [{ required: true, whitespace: true, message: '题干不能为空', trigger: 'blur' }],
  options: [{ validator: validateOptions, trigger: 'blur' }],
  answer: [{ validator: validateAnswer, trigger: 'change' }],
  score: [{ validator: positiveNumber, trigger: 'change' }]
}

async function load() {
  loading.value = true
  try { rows.value = await getQuestions(filters) as any[] } finally { loading.value = false }
}
async function loadExams() { exams.value = await getExams() as any[] }
function syncType() {
  form.options = form.type === 'judge' ? ['正确', '错误'] : ['', '', '', '']
  form.answer = 'A'
  nextTick(() => formRef.value?.clearValidate(['options', 'answer']))
}
function addOption() {
  if (form.options.length < letters.length) form.options.push('')
}
function removeOption(index: number) {
  form.options.splice(index, 1)
  if (!letters.slice(0, form.options.length).includes(form.answer)) form.answer = 'A'
}
function openDialog(row?: any) {
  Object.assign(form, row ? { ...row, options: [...row.options] } : { id: null, exam_id: exams.value[0]?.id, type: 'single', title: '', options: ['', '', '', ''], answer: 'A', score: 10, analysis: '' })
  visible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function normalizeQuestionPayload(item: any) {
  const type = String(item.type || '').trim()
  const options = type === 'judge'
    ? ['正确', '错误']
    : (Array.isArray(item.options) ? item.options.map((option: string) => String(option || '').trim()).filter(Boolean) : [])
  return {
    ...item,
    title: String(item.title || '').trim(),
    type,
    options,
    answer: String(item.answer || '').trim(),
    score: Number(item.score),
    analysis: String(item.analysis || '').trim()
  }
}
function validateQuestionPayload(item: any) {
  if (!item.exam_id) return '所属考试不能为空'
  if (!item.title) return '题干不能为空'
  if (!item.type) return '题型不能为空'
  if (!Number.isFinite(Number(item.score)) || Number(item.score) <= 0) return '分值必须大于 0'
  if (!item.answer) return '正确答案不能为空'
  if (item.type === 'single' && item.options.filter(Boolean).length < 2) return '单选题至少需要 2 个非空选项'
  if (item.type === 'judge' && !judgeAnswers.includes(String(item.answer))) return '判断题答案只能是 true/false 或 正确/错误'
  return ''
}
async function save() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先完善题目表单')
    return
  }
  const payload = normalizeQuestionPayload(form)
  const error = validateQuestionPayload(payload)
  if (error) {
    ElMessage.warning(error)
    return
  }
  if (form.id) await updateQuestion(form.id, payload)
  else await createQuestion(payload)
  ElMessage.success('保存成功')
  visible.value = false
  load()
}
async function remove(id: number) {
  await ElMessageBox.confirm('确认删除该题目？', '提示', { type: 'warning' })
  await deleteQuestion(id)
  ElMessage.success('删除成功')
  load()
}
function downloadSample() {
  const sample = [{ exam_id: exams.value[0]?.id || 1, type: 'single', title: '示例题目', options: ['选项一', '选项二', '选项三', '选项四'], answer: 'A', score: 10, analysis: '这里填写解析。' }]
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'questions-sample.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
function downloadExcelTemplate() {
  const rows = [
    {
      exam_id: exams.value[0]?.id || 1,
      type: 'single',
      title: '示例单选题：Vue 3 的组合式 API 常用入口是？',
      A: 'setup',
      B: 'mounted',
      C: 'created',
      D: 'filters',
      answer: 'A',
      score: 10,
      analysis: 'setup 是组合式 API 的入口。'
    },
    {
      exam_id: exams.value[0]?.id || 1,
      type: 'judge',
      title: '示例判断题：localStorage 刷新页面后仍可保留数据。',
      A: '正确',
      B: '错误',
      C: '',
      D: '',
      answer: '正确',
      score: 10,
      analysis: 'localStorage 是持久化本地存储。'
    }
  ]
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'questions')
  XLSX.writeFile(workbook, 'questions-template.xlsx')
}
function mapExcelRow(row: any, index: number) {
  const options = ['A', 'B', 'C', 'D', 'E', 'F']
    .map((key) => String(row[key] ?? row[key.toLowerCase()] ?? '').trim())
    .filter(Boolean)
  const item = normalizeQuestionPayload({
    exam_id: row.exam_id ?? row['考试ID'],
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
    const data = list.map(normalizeQuestionPayload)
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
    load()
  } catch (error: any) {
    ElMessage.error(error.message || '导入失败，请检查文件格式')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
onMounted(async () => { await loadExams(); await load() })
</script>
