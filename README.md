# 智测云 Online Exam Pro

智测云 Online Exam Pro 是一个前后端分离的在线考试与成绩分析平台，覆盖管理员出题组卷、考生在线考试、倒计时、防切屏、自动保存、自动批改、成绩分析和 PDF 报告导出，适合作为前端开发综合实践课程展示项目。

## 技术栈

前端：Vue 3、Vite、TypeScript、Pinia、Vue Router、Element Plus、Axios、ECharts、xlsx、html2canvas、jsPDF、localStorage、响应式布局。

后端：Node.js、Express、SQLite、RESTful API、本地 seed 数据。

## 功能亮点

- 双角色登录：管理员与考生自动进入不同工作台。
- JWT 登录态维护：后端使用 `jsonwebtoken` 签发 6 小时有效期 token，前端通过 `Authorization: Bearer token` 访问受保护接口。
- 完整权限控制：未登录跳转登录页，跨角色访问跳转 403；题库列表接口仅管理员可访问，考生考试详情不返回答案和解析。
- 管理员端：Dashboard 数据卡片、考试 CRUD、题目 CRUD、JSON/Excel 批量导入、成绩管理、成绩分析图表。
- Excel 导入：支持下载 `.xlsx` 模板，按 `exam_id/type/title/A/B/C/D/answer/score/analysis` 字段批量导入题目。
- 考生端：已发布考试列表、考试须知、沉浸式答题、倒计时、自动保存、刷新恢复、防切屏计数、自动提交。
- 倒计时防刷新重置：答题页基于 `endAt` 时间戳计算剩余时间，刷新后继续倒计时并恢复答案。
- 防重复提交：同一考生同一考试只能提交一次，重复提交会提示并跳转到已有成绩页。
- 自动批改：后端按题目正确答案计算得分、正确率、错题解析，成绩页支持只看错题。
- 老师查看详情：管理员成绩管理页可打开 Drawer 查看某学生每题答题情况、是否正确和得分。
- 报告导出：成绩页使用 html2canvas + jsPDF 导出 PDF 报告，中文内容更稳定。
- 数据可视化：使用 ECharts 展示分数段分布、提交成绩趋势、高错题排行。

## 项目结构

```text
online-exam-pro/
  frontend/          Vue 3 + Vite 前端
  backend/           Express + SQLite 后端
  README.md
```

## 安装与运行

推荐使用 Node.js 20 LTS。项目根目录已提供 `.nvmrc`：

```bash
cd online-exam-pro
nvm use
```

后端：

```bash
cd backend
npm install
npm run seed
npm run dev
```

注意：`npm run seed` 只建议用于首次初始化或重置演示数据。执行 seed 会清空已有用户、考试、题目和成绩记录，并重新生成演示账号和示例考试。

前端：

```bash
cd frontend
npm install
npm run dev
```

访问地址：

- 前端：http://localhost:5173
- 后端：http://localhost:3000

前端 `/api` 请求已通过 Vite proxy 转发到 `http://localhost:3000`。

## WSL 运行排错

如果在 WSL 中执行 `npm install` 或 `npm run seed` 时出现下面这类错误：

```text
UNC 路径不受支持
Cannot find module 'C:\Windows\src\seed.js'
gyp ERR! cwd C:\Windows
```

说明当前 WSL 调用到了 Windows 版 Node/npm。Windows CMD 无法把 `\\wsl.localhost\...` 作为脚本工作目录，SQLite 的 native 依赖也会被错误地按 Windows 环境编译。

请在 WSL 里安装并使用 Linux 版 Node 20：

```bash
which node
which npm
```

如果输出路径包含 `/mnt/c/`、`Program Files` 或没有输出，请执行：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
cd ~/qianduan/online-exam-pro
nvm install
nvm use
```

然后删除之前由 Windows npm 生成的残留依赖并重新安装：

```bash
cd ~/qianduan/online-exam-pro/backend
rm -rf node_modules package-lock.json
npm install
npm run seed
npm run dev
```

另开一个 WSL 终端启动前端：

```bash
cd ~/qianduan/online-exam-pro/frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 测试账号

- 管理员：`admin` / `123456`
- 考生：`student` / `123456`

## 主要页面说明

- `/login`：登录页，支持管理员和考生账号。
- `/admin/dashboard`：后台首页，展示考试总数、题目总数、提交人数、平均分和图表。
- `/admin/exams`：考试管理，支持创建、编辑、删除、发布、随机题序设置。
- `/admin/questions`：题目管理，支持新增、编辑、删除、搜索、题型筛选、JSON 导入和 Excel 导入。
- `/admin/results`：成绩管理，展示考生提交记录、得分、正确率、超时、切屏次数和每题答题详情。
- `/admin/analysis`：成绩分析，展示分数段、提交成绩趋势、高错题排行。
- `/student/exams`：考生考试列表。
- `/student/exams/:id/intro`：考试须知页。
- `/student/exams/:id/take`：在线答题页，支持自动保存、倒计时、防切屏、刷新恢复和提交前未答检查。
- `/student/results`：考生个人成绩列表。
- `/student/results/:id`：成绩结果页，支持错题复习、只看错题和导出 PDF 报告。

## Excel / JSON 批量导入题目

题目管理页保留原 JSON 导入，同时新增 Excel 导入：

1. 进入 `/admin/questions`。
2. 点击“下载 Excel 模板”，得到 `questions-template.xlsx`。
3. 按模板填写题目数据。
4. 点击“导入 JSON/Excel”，选择 `.xlsx` 或 `.json` 文件。
5. 前端会先校验必填字段，再复用 `POST /api/questions/import` 批量导入。

Excel 字段说明：

| 字段 | 说明 |
| --- | --- |
| `exam_id` | 所属考试 ID，必填 |
| `type` | 题型，`single` 表示单选题，`judge` 表示判断题 |
| `title` | 题干，必填 |
| `A` `B` `C` `D` | 选项内容，单选题至少填写 2 个非空选项 |
| `answer` | 正确答案，单选题填写 `A/B/C/D`，判断题可填写 `正确/错误` 或 `true/false` |
| `score` | 分值，必须大于 0 |
| `analysis` | 解析，可选 |

JSON 导入格式仍然兼容数组或 `{ "items": [...] }`：

```json
[
  {
    "exam_id": 1,
    "type": "single",
    "title": "Vue 3 中用于创建响应式引用的 API 是？",
    "options": ["reactiveRef", "ref", "state", "observable"],
    "answer": "B",
    "score": 10,
    "analysis": "ref 用于创建可响应的基本类型或对象引用。"
  }
]
```

## 登录与权限说明

- 登录成功后，后端使用 JWT 登录态维护，payload 包含 `id`、`username`、`role`、`name`。
- JWT 过期时间为 6 小时，密钥从 `JWT_SECRET` 环境变量读取；未配置时使用 `online-exam-secret`。
- 前端请求会继续使用 `Authorization: Bearer token`，无需额外配置。
- 管理员题库接口受权限保护，考生只能通过考试详情接口获取不含答案和解析的题目。

## API 接口说明

- `POST /api/login`：登录并返回 JWT。
- `GET /api/exams`：考试列表。
- `GET /api/exams/:id`：考试详情，包含题目。
- `POST /api/exams`：创建考试。
- `PUT /api/exams/:id`：更新考试。
- `DELETE /api/exams/:id`：删除考试。
- `GET /api/questions`：题目列表。
- `POST /api/questions`：新增题目。
- `PUT /api/questions/:id`：更新题目。
- `DELETE /api/questions/:id`：删除题目。
- `POST /api/questions/import`：批量导入题目。
- `POST /api/exam/submit`：提交考试并自动批改。
- `GET /api/results`：成绩列表。
- `GET /api/results/:id`：成绩详情。
- `GET /api/analysis/summary`：统计分析汇总。

## 课堂展示建议

推荐演示流程：

1. 管理员登录后台首页，展示统计卡片、快捷入口和成绩分析图表。
2. 在考试管理中新建考试，配置时长、总分、随机题序和发布状态。
3. 进入题库管理，下载 Excel 模板或示例 JSON，演示 Excel/JSON 批量导入题目。
4. 发布考试后，切换考生账号进入考试列表。
5. 考生阅读考试须知，勾选“我已阅读并同意考试规则”后开始考试。
6. 在答题页选择部分答案，刷新页面验证倒计时不重置、答案、随机题序和切屏次数可恢复。
7. 切换浏览器标签页或窗口，展示防切屏提醒与计数。
8. 点击提交，展示未答题统计和“确认提交后不可修改”的二次确认。
9. 提交后查看成绩结果页，演示自动批改、只看错题、答案对比和解析。
10. 导出 PDF 报告，展示中文成绩报告。
11. 管理员回到成绩管理，打开“详情”查看学生每题表现。
12. 打开成绩分析页，展示分数段分布、提交成绩趋势和高频错题排行。
