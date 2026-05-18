const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { ok, fail, send } = require('../lib/envelope');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM Notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 100
    `).all(req.user.id);
    const unread = rows.filter(r => !r.isRead).length;
    return send(res, ok({ notifications: rows, unread }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.post('/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE Notifications SET isRead = 1 WHERE id = ? AND userId = ?')
      .run(req.params.id, req.user.id);
    return send(res, ok({ updated: true }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.post('/read-all', (req, res) => {
  try {
    db.prepare('UPDATE Notifications SET isRead = 1 WHERE userId = ?').run(req.user.id);
    return send(res, ok({ updated: true }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

module.exports = router;
