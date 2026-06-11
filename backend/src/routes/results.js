const express = require('express');
const { all, get, run } = require('../db');
const { scoreSubmission } = require('../utils/scorer');

const router = express.Router();

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeResult(row) {
  return {
    ...row,
    answers: parseJson(row.answers, {}),
    detail: parseJson(row.detail, []),
    is_timeout: Boolean(row.is_timeout)
  };
}

async function duplicateSubmissionResponse(res, examId, userId) {
  const existing = await get(
    'SELECT id FROM submissions WHERE exam_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1',
    [examId, userId]
  );
  return res.status(409).json({
    code: 409,
    message: '你已提交过该考试，不能重复提交',
    data: existing ? { id: existing.id, result_id: existing.id } : null
  });
}

router.post('/exam/submit', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 403, message: '只有考生可以提交考试', data: null });
    }

    const { exam_id, answers = {}, duration_used = 0, switch_count = 0, is_timeout = false } = req.body;
    const examId = Number(exam_id);
    if (!examId) return res.status(400).json({ code: 400, message: '考试不能为空', data: null });

    const exam = await get('SELECT id, is_published FROM exams WHERE id = ?', [examId]);
    if (!exam) return res.status(404).json({ code: 404, message: '考试不存在', data: null });
    if (Number(exam.is_published) !== 1) {
      return res.status(403).json({ code: 403, message: '该考试尚未发布，不能提交', data: null });
    }

    const existing = await get(
      'SELECT id FROM submissions WHERE exam_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [examId, req.user.id]
    );
    if (existing) return duplicateSubmissionResponse(res, examId, req.user.id);

    const scored = await scoreSubmission(examId, answers);
    const result = await run(
      `INSERT INTO submissions
      (exam_id, user_id, answers, score, total_score, correct_count, wrong_count, accuracy, duration_used, switch_count, is_timeout, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        examId,
        req.user.id,
        JSON.stringify(answers),
        scored.score,
        scored.totalScore,
        scored.correctCount,
        scored.wrongCount,
        scored.accuracy,
        duration_used,
        switch_count,
        is_timeout ? 1 : 0,
        JSON.stringify(scored.detail)
      ]
    );
    res.json({ code: 0, message: '提交成功', data: { id: result.id, ...scored } });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT') {
      const examId = Number(req.body.exam_id);
      if (examId) return duplicateSubmissionResponse(res, examId, req.user.id);
    }
    next(err);
  }
});

router.get('/results', async (req, res, next) => {
  try {
    const params = [];
    let filter = '';
    if (req.query.exam) {
      filter = 'WHERE e.title LIKE ?';
      params.push(`%${req.query.exam}%`);
    }
    if (req.user.role === 'student') {
      filter += filter ? ' AND s.user_id = ?' : 'WHERE s.user_id = ?';
      params.push(req.user.id);
    }
    const rows = await all(`SELECT s.*, u.name AS student_name, e.title AS exam_title
      FROM submissions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN exams e ON e.id = s.exam_id
      ${filter}
      ORDER BY s.submitted_at DESC`, params);
    res.json({ code: 0, message: 'ok', data: rows.map(normalizeResult) });
  } catch (err) {
    next(err);
  }
});

router.get('/results/:id', async (req, res, next) => {
  try {
    const row = await get(`SELECT s.*, u.name AS student_name, e.title AS exam_title
      FROM submissions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN exams e ON e.id = s.exam_id
      WHERE s.id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ code: 404, message: '成绩不存在', data: null });
    if (req.user.role === 'student' && row.user_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权查看该成绩', data: null });
    }
    res.json({ code: 0, message: 'ok', data: normalizeResult(row) });
  } catch (err) {
    next(err);
  }
});

router.get('/analysis/summary', async (req, res, next) => {
  try {
    const [examCount, questionCount, submissionCount, avgScore] = await Promise.all([
      get('SELECT COUNT(*) AS value FROM exams'),
      get('SELECT COUNT(*) AS value FROM questions'),
      get('SELECT COUNT(DISTINCT user_id) AS value FROM submissions'),
      get('SELECT ROUND(AVG(score), 2) AS value FROM submissions')
    ]);
    const results = await all('SELECT score, total_score, submitted_at FROM submissions ORDER BY submitted_at ASC');
    const details = await all('SELECT detail FROM submissions');
    const buckets = [
      { name: '0-59', value: 0 },
      { name: '60-69', value: 0 },
      { name: '70-79', value: 0 },
      { name: '80-89', value: 0 },
      { name: '90-100', value: 0 }
    ];
    results.forEach((r) => {
      const percent = r.total_score ? (r.score / r.total_score) * 100 : 0;
      if (percent < 60) buckets[0].value += 1;
      else if (percent < 70) buckets[1].value += 1;
      else if (percent < 80) buckets[2].value += 1;
      else if (percent < 90) buckets[3].value += 1;
      else buckets[4].value += 1;
    });
    const wrongMap = new Map();
    details.forEach((row) => {
      parseJson(row.detail, []).forEach((item) => {
        if (!item.isCorrect) {
          const current = wrongMap.get(item.questionId) || { title: item.title, value: 0 };
          current.value += 1;
          wrongMap.set(item.questionId, current);
        }
      });
    });
    const wrongRank = Array.from(wrongMap.values()).sort((a, b) => b.value - a.value).slice(0, 8);
    const trend = results.map((r, index) => ({
      name: `第${index + 1}次`,
      value: r.score,
      date: r.submitted_at
    }));
    res.json({
      code: 0,
      message: 'ok',
      data: {
        cards: {
          examCount: examCount.value || 0,
          questionCount: questionCount.value || 0,
          submissionCount: submissionCount.value || 0,
          avgScore: avgScore.value || 0
        },
        scoreBuckets: buckets,
        wrongRank,
        trend
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
