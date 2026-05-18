const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, COOKIE_NAME, authRequired } = require('../middleware/auth');
const { ok, fail, send } = require('../lib/envelope');

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return send(res, fail('Email and password are required', 400));

    const user = db.prepare('SELECT * FROM Users WHERE email = ?').get(String(email).trim().toLowerCase());
    if (!user) return send(res, fail('Invalid email or password', 401));

    const matches = bcrypt.compareSync(String(password), user.passwordHash);
    if (!matches) return send(res, fail('Invalid email or password', 401));

    const token = sign(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    return send(res, ok({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.managerId }
    }));
  } catch (e) {
    return send(res, fail('Login failed: ' + e.message, 500));
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return send(res, ok({ loggedOut: true }));
});

router.get('/me', authRequired, (req, res) => {
  return send(res, ok({ user: req.user }));
});

module.exports = router;
