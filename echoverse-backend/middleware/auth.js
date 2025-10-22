// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'echoverse-secret-key-2024';

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未经授权，需要提供 Token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId; // 将 userId 附加到请求对象上
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
};

module.exports = auth;