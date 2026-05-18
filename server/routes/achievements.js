const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');
const { computeScore } = require('../lib/score');

const router = express.Router();

router.use(authRequired);

const VALID_Q = ['Q1', 'Q2', 'Q3', 'Q4'];
const VALID_PROGRESS = ['not_started', 'on_track', 'completed'];

router.get('/:goalId', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.goalId);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (req.user.role === 'employee' && goal.employeeId !== req.user.id)
      return send(res, fail('Not allowed', 403));
    const rows = db.prepare('SELECT * FROM Achievements WHERE goalId = ? ORDER BY quarter').all(goal.id);
    return send(res, ok({ achievements: rows, goal }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Upsert an achievement entry. Updating a shared-source goal mirrors to all child goals.
router.post('/', role('employee'), (req, res) => {
  try {
    const { goalId, quarter, actual, progressStatus } = req.body || {};
    if (!goalId) return send(res, fail('goalId required', 400));
    if (!VALID_Q.includes(quarter)) return send(res, fail('Invalid quarter', 400));
    if (progressStatus && !VALID_PROGRESS.includes(progressStatus)) return send(res, fail('Invalid status', 400));

    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(goalId);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (goal.employeeId !== req.user.id) return send(res, fail('Not allowed', 403));
    if (goal.status !== 'approved') return send(res, fail('Goal must be approved before logging achievements', 400));

    const cycleOpen = db.prepare('SELECT isOpen FROM CycleConfig WHERE key = ?').get(quarter);
    if (!cycleOpen || !cycleOpen.isOpen)
      return send(res, fail(`${quarter} window is currently closed by Admin`, 400));

    const actualNum = actual === null || actual === undefined || actual === '' ? null : Number(actual);
    if (actualNum !== null && isNaN(actualNum)) return send(res, fail('Actual must be a number', 400));

    const score = computeScore(goal.uomType, goal.target, actualNum);

    const upsert = db.prepare(`
      INSERT INTO Achievements (goalId, quarter, actual, progressStatus, computedScore, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(goalId, quarter) DO UPDATE SET
        actual = excluded.actual,
        progressStatus = excluded.progressStatus,
        computedScore = excluded.computedScore,
        updatedAt = datetime('now')
    `);
    upsert.run(goal.id, quarter, actualNum, progressStatus || 'not_started', score);

    // Mirror updates from primary owner to all linked shared goals
    if (!goal.isShared) {
      const children = db.prepare('SELECT * FROM Goals WHERE sharedFromGoalId = ?').all(goal.id);
      for (const c of children) {
        const cScore = computeScore(c.uomType, c.target, actualNum);
        upsert.run(c.id, quarter, actualNum, progressStatus || 'not_started', cScore);
      }
    }

    const row = db.prepare('SELECT * FROM Achievements WHERE goalId = ? AND quarter = ?').get(goal.id, quarter);
    return send(res, ok({ achievement: row }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

module.exports = router;
