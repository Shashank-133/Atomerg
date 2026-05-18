const jwt = require('jsonwebtoken');
const db = require('../db');
const { send, fail } = require('../lib/envelope');

const JWT_SECRET = process.env.JWT_SECRET || 'atomquest-dev-secret-do-not-use-in-prod';
const COOKIE_NAME = 'aq_token';

function sign(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authRequired(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return send(res, fail('Not authenticated', 401));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare('SELECT id, name, email, role, managerId FROM Users WHERE id = ?')
      .get(decoded.uid);
    if (!user) return send(res, fail('Account no longer exists', 401));
    req.user = user;
    next();
  } catch (e) {
    return send(res, fail('Session expired — please log in again', 401));
  }
}

module.exports = { authRequired, sign, JWT_SECRET, COOKIE_NAME };
