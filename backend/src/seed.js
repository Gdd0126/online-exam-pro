const { initDb, run } = require('./db');

// ── Questions pool ──────────────────────────────────────────────
const jsQuestions = [
  {
    type: 'single', title: 'JavaScript 中 typeof null 的结果是？',
    options: ['null', 'undefined', 'object', 'boolean'],
    answer: 'C', score: 10,
    analysis: 'typeof null 返回 "object"，这是 JavaScript 著名的历史遗留 bug。'
  },
  {
    type: 'single', title: '以下哪个方法可以将 JSON 字符串转换为 JavaScript 对象？',
    options: ['JSON.stringify()', 'JSON.parse()', 'JSON.convert()', 'JSON.toObject()'],
    answer: 'B', score: 10,
    analysis: 'JSON.parse() 将合法的 JSON 字符串解析为 JavaScript 对象。'
  },
  {
    type: 'single', title: '闭包（Closure）的核心特征是？',
    options: ['函数可以访问其外部作用域的变量', '函数只能在全局作用域运行', '变量不能被修改', '代码自动压缩'],
    answer: 'A', score: 10,
    analysis: '闭包使内部函数可以记住并访问其外部（词法）作用域的变量，即使外部函数已执行完毕。'
  },
  {
    type: 'judge', title: 'Promise 可以用于处理异步操作，避免回调地狱。',
    options: ['正确', '错误'], answer: 'A', score: 10,
    analysis: 'Promise 通过 .then() 和 .catch() 链式调用，提供了比嵌套回调更清晰的异步控制流。'
  },
  {
    type: 'single', title: 'ES6 中，let 和 const 声明的变量具有什么作用域？',
    options: ['全局作用域', '函数作用域', '块级作用域', '文件作用域'],
    answer: 'C', score: 10,
    analysis: 'let 和 const 引入了块级作用域（{} 内有效），解决了 var 变量提升引起的许多问题。'
  },
  {
    type: 'judge', title: '箭头函数（Arrow Function）拥有自己的 this 绑定。',
    options: ['正确', '错误'], answer: 'B', score: 10,
    analysis: '箭头函数不会创建自己的 this，而是从外层作用域继承 this，因此不能用作构造函数。'
  },
  {
    type: 'single', title: '原型链（Prototype Chain）主要用于实现什么？',
    options: ['类型检查', '继承机制', '异步编程', '模块加载'],
    answer: 'B', score: 10,
    analysis: 'JavaScript 通过原型链实现对象之间的继承，每个对象都有一个内部 [[Prototype]] 指向其原型。'
  },
  {
    type: 'judge', title: 'async/await 是 Promise 的语法糖，让异步代码看起来像同步代码。',
    options: ['正确', '错误'], answer: 'A', score: 10,
    analysis: 'async 函数始终返回 Promise，await 暂停执行直到 Promise 解决，使代码更易读。'
  },
  {
    type: 'single', title: 'Array.prototype.map() 方法的返回值是？',
    options: ['原数组的引用', '一个新数组', 'undefined', '第一个匹配元素'],
    answer: 'B', score: 10,
    analysis: 'map() 返回一个新数组，每个元素是原数组元素经过回调函数处理后的结果，原数组不变。'
  },
  {
    type: 'single', title: '以下哪项是事件冒泡（Event Bubbling）的正确描述？',
    options: ['事件从 document 向目标元素传播', '事件从目标元素向祖先元素传播', '事件只在目标元素触发', '事件被完全阻止'],
    answer: 'B', score: 10,
    analysis: '事件冒泡是指事件从最内层目标元素开始，逐级向上传播到外层祖先元素的过程。可通过 stopPropagation() 阻止。'
  }
];

const exam1Questions = [
  { type: 'single', title: 'Vue 3 中用于创建响应式引用的 API 是？', options: ['reactiveRef', 'ref', 'state', 'observable'], answer: 'B', score: 10, analysis: 'ref 用于创建可响应的基本类型或对象引用，模板中会自动解包。' },
  { type: 'single', title: 'Pinia 的核心作用主要是？', options: ['路由跳转', '全局状态管理', 'HTTP 请求', '代码打包'], answer: 'B', score: 10, analysis: 'Pinia 是 Vue 官方推荐的状态管理库，适合保存登录信息、考试状态等。' },
  { type: 'judge', title: 'Vue Router 可以通过 beforeEach 实现全局路由守卫。', options: ['正确', '错误'], answer: 'A', score: 10, analysis: 'beforeEach 会在每次路由切换前执行，常用于登录校验和权限控制。' },
  { type: 'single', title: 'Axios 拦截器常用于以下哪类场景？', options: ['统一添加 Token 和处理错误', '编译 TypeScript', '生成图表', '创建数据库表'], answer: 'A', score: 10, analysis: '请求拦截器可以统一添加 Authorization，响应拦截器可以统一处理接口错误。' },
  { type: 'judge', title: 'localStorage 刷新页面后数据会立即丢失。', options: ['正确', '错误'], answer: 'B', score: 10, analysis: 'localStorage 是持久化存储，除非主动清除，否则刷新页面后仍会保留。' },
  { type: 'single', title: 'ECharts 最适合在本项目中承担什么职责？', options: ['成绩可视化分析', '用户登录认证', 'PDF 导出', '数据库迁移'], answer: 'A', score: 10, analysis: 'ECharts 可用于绘制分数段、趋势线、错误率排行榜等图表。' },
  { type: 'judge', title: 'RESTful API 通常使用不同 HTTP 方法表达资源操作。', options: ['正确', '错误'], answer: 'A', score: 10, analysis: 'GET、POST、PUT、DELETE 分别常用于查询、创建、更新和删除。' },
  { type: 'single', title: 'TypeScript 相比 JavaScript 的重要优势是？', options: ['提供静态类型检查', '自动替代后端', '不需要浏览器', '只能写 CSS'], answer: 'A', score: 10, analysis: 'TypeScript 通过类型系统帮助在开发阶段发现数据结构和调用错误。' },
  { type: 'judge', title: 'Vite 在开发环境中通常具有较快的冷启动和热更新速度。', options: ['正确', '错误'], answer: 'A', score: 10, analysis: 'Vite 基于原生 ESM 和高效构建工具，开发体验很轻快。' },
  { type: 'single', title: 'Element Plus 是什么类型的库？', options: ['Vue 3 UI 组件库', '数据库引擎', '后端框架', '命令行操作系统'], answer: 'A', score: 10, analysis: 'Element Plus 提供表单、表格、弹窗、消息提示等常用 Vue 3 组件。' },
  { type: 'single', title: 'v-model 指令在 Vue 3 中默认绑定什么 prop 和事件？', options: ['value 和 input', 'modelValue 和 update:modelValue', 'data 和 change', 'bind 和 sync'], answer: 'B', score: 10, analysis: 'Vue 3 中 v-model 默认绑定 modelValue prop 和 update:modelValue 事件，支持多个 v-model。' },
  { type: 'judge', title: 'Composition API 中的 watchEffect 会自动追踪其内部使用的响应式依赖。', options: ['正确', '错误'], answer: 'A', score: 10, analysis: 'watchEffect 首次执行时会自动收集所有被访问的响应式数据作为依赖，依赖变化时重新执行。' }
];

const exam2Questions = [
  { type: 'single', title: 'HTML 中用于定义文档类型声明的标签是？', options: ['<html>', '<DOCTYPE>', '<!DOCTYPE html>', '<meta>'], answer: 'C', score: 10, analysis: '<!DOCTYPE html> 声明文档为 HTML5 类型，帮助浏览器按标准模式渲染。' },
  { type: 'judge', title: 'CSS 中 id 选择器的优先级高于 class 选择器。', options: ['正确', '错误'], answer: 'A', score: 10, analysis: 'CSS 优先级：!important > 内联样式 > id > class > 标签 > 通配符。' },
  { type: 'single', title: '哪个 HTML 标签用于创建超链接？', options: ['<link>', '<a>', '<href>', '<url>'], answer: 'B', score: 10, analysis: '<a> 标签通过 href 属性指定目标 URL，是创建超链接的标准标签。' },
  { type: 'judge', title: 'JavaScript 中的 setTimeout 可以精确地在指定毫秒后执行回调。', options: ['正确', '错误'], answer: 'B', score: 10, analysis: 'setTimeout 的最小延迟受事件循环和浏览器限制，实际执行时间可能晚于指定值，不能保证精确。' }
];

// ── Simulated submissions for demo ──────────────────────────────
function makeSubmission(examId, userId, score, totalScore, isTimeout = false) {
  const accuracy = ((score / totalScore) * 100).toFixed(2);
  const correctCount = Math.round(score / 10);
  const wrongCount = Math.round((totalScore - score) / 10);
  const detail = [];
  for (let i = 0; i < correctCount; i++) detail.push({ questionId: i + 1, title: `题目${i + 1}`, type: 'single', options: [], userAnswer: 'A', correctAnswer: 'A', score: 10, isCorrect: true, analysis: '回答正确。' });
  for (let i = 0; i < wrongCount; i++) detail.push({ questionId: correctCount + i + 1, title: `题目${correctCount + i + 1}`, type: 'single', options: [], userAnswer: 'B', correctAnswer: 'A', score: 10, isCorrect: false, analysis: '正确答案是 A。' });
  const durationUsed = 600 + Math.floor(Math.random() * 1800);
  const switchCount = Math.floor(Math.random() * 5);
  return { exam_id: examId, user_id: userId, score, total_score: totalScore, correct_count: correctCount, wrong_count: wrongCount, accuracy, duration_used: durationUsed, switch_count: switchCount, is_timeout: isTimeout ? 1 : 0, detail: JSON.stringify(detail) };
}

// ── Main seed function ──────────────────────────────────────────
async function seed() {
  await initDb();
  await run('DELETE FROM submissions');
  await run('DELETE FROM questions');
  await run('DELETE FROM exams');
  await run('DELETE FROM users');
  await run("DELETE FROM sqlite_sequence WHERE name IN ('users','exams','questions','submissions')");

  // Users
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['admin',   '123456', 'admin',   '王老师']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['teacher2','123456', 'admin',   '李老师']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['student', '123456', 'student', '张同学']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['stu02',   '123456', 'student', '李明']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['stu03',   '123456', 'student', '王芳']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['stu04',   '123456', 'student', '赵强']);
  await run('INSERT INTO users (username,password,role,name) VALUES (?,?,?,?)', ['stu05',   '123456', 'student', '陈雪']);

  // Exams
  const e1 = await run('INSERT INTO exams (title,description,duration,total_score,is_random,is_published) VALUES (?,?,?,?,?,?)',
    ['前端工程综合能力测验', '覆盖 Vue 3、工程化、状态管理、接口请求与可视化的综合练习。', 45, 120, 1, 1]);
  const e2 = await run('INSERT INTO exams (title,description,duration,total_score,is_random,is_published) VALUES (?,?,?,?,?,?)',
    ['Web 基础快速自测', '适合课前热身的短测，重点考察 HTML、CSS 与 JS 基础概念。', 20, 40, 0, 1]);
  const e3 = await run('INSERT INTO exams (title,description,duration,total_score,is_random,is_published) VALUES (?,?,?,?,?,?)',
    ['JavaScript 核心概念考核', '深入考察闭包、原型链、异步编程与 ES6+ 核心特性的掌握程度。', 60, 100, 1, 1]);

  // Questions: exam1 (12), exam2 (4), exam3 (10)
  for (const q of exam1Questions) {
    await run('INSERT INTO questions (exam_id,type,title,options,answer,score,analysis) VALUES (?,?,?,?,?,?,?)',
      [e1.id, q.type, q.title, JSON.stringify(q.options), q.answer, q.score, q.analysis]);
  }
  for (const q of exam2Questions) {
    await run('INSERT INTO questions (exam_id,type,title,options,answer,score,analysis) VALUES (?,?,?,?,?,?,?)',
      [e2.id, q.type, q.title, JSON.stringify(q.options), q.answer, q.score, q.analysis]);
  }
  for (const q of jsQuestions) {
    await run('INSERT INTO questions (exam_id,type,title,options,answer,score,analysis) VALUES (?,?,?,?,?,?,?)',
      [e3.id, q.type, q.title, JSON.stringify(q.options), q.answer, q.score, q.analysis]);
  }

  // Submissions — varied scores for realistic dashboard
  // Exam 1 (120 pts, student ids: 3-7)
  const e1Scores = [
    { uid: 3, score: 100, timeout: false },
    { uid: 4, score: 80,  timeout: false },
    { uid: 5, score: 110, timeout: false },
    { uid: 6, score: 60,  timeout: true },
    { uid: 7, score: 90,  timeout: false }
  ];
  for (const s of e1Scores) {
    const d = makeSubmission(e1.id, s.uid, s.score, 120, s.timeout);
    await run(
      'INSERT INTO submissions (exam_id,user_id,score,total_score,correct_count,wrong_count,accuracy,duration_used,switch_count,is_timeout,detail,answers) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [d.exam_id, d.user_id, d.score, d.total_score, d.correct_count, d.wrong_count, d.accuracy, d.duration_used, d.switch_count, d.is_timeout, d.detail, '{}']
    );
  }

  // Exam 2 (40 pts, partial submissions)
  const e2Scores = [
    { uid: 3, score: 40, timeout: false },
    { uid: 4, score: 30, timeout: false },
    { uid: 6, score: 20, timeout: false }
  ];
  for (const s of e2Scores) {
    const d = makeSubmission(e2.id, s.uid, s.score, 40, s.timeout);
    await run(
      'INSERT INTO submissions (exam_id,user_id,score,total_score,correct_count,wrong_count,accuracy,duration_used,switch_count,is_timeout,detail,answers) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [d.exam_id, d.user_id, d.score, d.total_score, d.correct_count, d.wrong_count, d.accuracy, d.duration_used, d.switch_count, d.is_timeout, d.detail, '{}']
    );
  }

  console.log('Seed complete — 7 users, 3 exams, 26 questions, 8 submissions.');
  console.log('Admin: admin/123456 | Student: student/123456');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
