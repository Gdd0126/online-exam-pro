<template>
  <div class="login-page">
    <section class="login-visual">
      <div class="hero-copy">
        <p class="eyebrow">Online Exam Pro</p>
        <h1>智测云 Online Exam Pro</h1>
        <p class="subtitle">面向教学场景的在线考试与智能分析平台，覆盖组卷、答题、自动批改和成绩复盘。</p>
        <div class="feature-list">
          <div class="feature-pill">
            <strong>自动批改</strong>
            <span>提交后立即生成分数与错题解析</span>
          </div>
          <div class="feature-pill">
            <strong>考试防切屏</strong>
            <span>记录考试行为，辅助维护考试纪律</span>
          </div>
          <div class="feature-pill">
            <strong>成绩可视化</strong>
            <span>分布、趋势、高频错题一屏掌握</span>
          </div>
        </div>
      </div>
    </section>
    <el-card class="login-card">
      <h2>账号登录</h2>
      <p class="muted">管理员和考生将进入不同工作台</p>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" size="large" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" size="large" placeholder="密码" type="password" show-password prefix-icon="Lock" />
        </el-form-item>
        <el-button class="full" size="large" type="primary" :loading="loading" @click="handleLogin">登录系统</el-button>
      </el-form>
      <div class="account-tips">
        <div class="account-tips-title">演示账号</div>
        <div class="account-tip">
          <span>管理员账号：admin / 123456</span>
          <el-button text @click="fill('admin')">填入</el-button>
        </div>
        <div class="account-tip">
          <span>考生账号：student / 123456</span>
          <el-button text @click="fill('student')">填入</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ username: 'admin', password: '123456' })
const rules: FormRules = {
  username: [{ required: true, whitespace: true, message: '用户名不能为空', trigger: 'blur' }],
  password: [{ required: true, whitespace: true, message: '密码不能为空', trigger: 'blur' }]
}

function fill(role: 'admin' | 'student') {
  form.username = role
  form.password = '123456'
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const user = await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.replace(user.role === 'admin' ? '/admin/dashboard' : '/student/exams')
  } finally {
    loading.value = false
  }
}
</script>
