const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { ok, fail, send } = require('../lib/envelope');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, isOpen FROM CycleConfig').all();
    return send(res, ok({ cycle: rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

module.exports = router;
