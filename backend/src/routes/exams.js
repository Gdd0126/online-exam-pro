const express = require('express');
const { all, get, run } = require('../db');
const { adminRequired } = require('../middleware/auth');
const { normalizeQuestion } = require('../utils/scorer');

const router = express.Router();

function normalizeExam(row) {
  return {
    ...row,
    is_random: Boolean(row.is_random),
    is_published: Boolean(row.is_published),
    question_count: row.question_count || 0
  };
}

function validateExamPayload(body) {
  const title = String(body.title ?? '').trim();
  const duration = Number(body.duration);
  const totalScore = Number(body.total_score);

  if (!title) return { message: '考试标题不能为空' };
  if (!Number.isFinite(duration) || duration <= 0) return { message: '考试时长必须大于 0' };
  if (!Number.isFinite(totalScore) || totalScore <= 0) return { message: '总分必须大于 0' };

  return {
    value: {
      title,
      description: String(body.description ?? '').trim(),
      duration,
      total_score: totalScore,
      is_random: Boolean(body.is_random),
      is_published: Boolean(body.is_published)
    }
  };
}

async function validatePublishRequirements(examId, totalScore) {
  const summary = await get(
    'SELECT COUNT(*) AS question_count, COALESCE(SUM(score), 0) AS score_sum FROM questions WHERE exam_id = ?',
    [examId]
  );
  const questionCount = Number(summary?.question_count || 0);
  const scoreSum = Number(summary?.score_sum || 0);

  if (questionCount === 0) return { message: '该考试还没有题目，不能发布' };
  if (scoreSum !== Number(totalScore)) {
    return { message: `题目总分为 ${scoreSum} 分，与试卷总分 ${totalScore} 分不一致，不能发布` };
  }
  return null;
}

router.get('/exams', async (req, res, next) => {
  try {
    const where = req.user.role === 'student' || req.query.published === '1' ? 'WHERE e.is_published = 1' : '';
    const rows = await all(`SELECT e.*, COUNT(q.id) AS question_count
      FROM exams e LEFT JOIN questions q ON q.exam_id = e.id
      ${where}
      GROUP BY e.id ORDER BY e.created_at DESC`);
    res.json({ code: 0, message: 'ok', data: rows.map(normalizeExam) });
  } catch (err) {
    next(err);
  }
});

router.get('/exams/:id', async (req, res, next) => {
  try {
    const exam = await get('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ code: 404, message: '考试不存在', data: null });
    if (req.user.role === 'student' && !exam.is_published) {
      return res.status(403).json({ code: 403, message: '该考试尚未发布', data: null });
    }
    let questions = await all('SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC', [req.params.id]);
    if (exam.is_random) questions = questions.sort(() => Math.random() - 0.5);
    const safeQuestions = questions.map(normalizeQuestion).map((question) => {
      if (req.user.role !== 'student') return question;
      const { answer, analysis, ...safe } = question;
      return safe;
    });
    res.json({ code: 0, message: 'ok', data: { ...normalizeExam(exam), questions: safeQuestions } });
  } catch (err) {
    next(err);
  }
});

router.post('/exams', adminRequired, async (req, res, next) => {
  try {
    const validated = validateExamPayload(req.body);
    if (validated.message) return res.status(400).json({ code: 400, message: validated.message, data: null });
    const { title, description, duration, total_score, is_random, is_published } = validated.value;
    if (is_published) {
      return res.status(400).json({ code: 400, message: '该考试还没有题目，不能发布', data: null });
    }
    const result = await run(
      'INSERT INTO exams (title, description, duration, total_score, is_random, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || '', duration, total_score, is_random ? 1 : 0, is_published ? 1 : 0]
    );
    res.json({ code: 0, message: '创建成功', data: { id: result.id } });
  } catch (err) {
    next(err);
  }
});

router.put('/exams/:id', adminRequired, async (req, res, next) => {
  try {
    const validated = validateExamPayload(req.body);
    if (validated.message) return res.status(400).json({ code: 400, message: validated.message, data: null });
    const { title, description, duration, total_score, is_random, is_published } = validated.value;
    const currentExam = await get('SELECT id, is_published FROM exams WHERE id = ?', [req.params.id]);
    if (!currentExam) return res.status(404).json({ code: 404, message: '考试不存在', data: null });
    const isPublishing = is_published && !currentExam.is_published;
    if (isPublishing) {
      const publishError = await validatePublishRequirements(req.params.id, total_score);
      if (publishError) return res.status(400).json({ code: 400, message: publishError.message, data: null });
    }
    await run(
      'UPDATE exams SET title = ?, description = ?, duration = ?, total_score = ?, is_random = ?, is_published = ? WHERE id = ?',
      [title, description || '', duration, total_score, is_random ? 1 : 0, is_published ? 1 : 0, req.params.id]
    );
    res.json({ code: 0, message: '更新成功', data: null });
  } catch (err) {
    next(err);
  }
});

router.delete('/exams/:id', adminRequired, async (req, res, next) => {
  try {
    const submission = await get('SELECT id FROM submissions WHERE exam_id = ? LIMIT 1', [req.params.id]);
    if (submission) {
      return res.status(400).json({ code: 400, message: '该考试已有学生提交记录，不能删除，可改为取消发布', data: null });
    }
    await run('DELETE FROM exams WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '删除成功', data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
