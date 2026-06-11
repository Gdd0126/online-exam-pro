const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'online-exam-secret';

function makeToken(user) {
  return jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name
  }, JWT_SECRET, { expiresIn: '6h' });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录', data: null });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无管理员权限', data: null });
  }
  return next();
}

module.exports = { makeToken, authRequired, adminRequired };
