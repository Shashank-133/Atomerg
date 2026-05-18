const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');
const { diffAndLog, logChange } = require('../lib/audit');
const { emailAndTeams } = require('../lib/notify');

const router = express.Router();

router.use(authRequired);
router.use(role('manager', 'admin'));

function listReports(managerId) {
  return db.prepare(`
    SELECT u.id, u.name, u.email,
      (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id) AS goalCount,
      (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'submitted') AS submittedCount,
      (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'approved') AS approvedCount,
      (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'rework')    AS reworkCount,
      (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'draft')     AS draftCount,
      (SELECT MAX(createdAt) FROM CheckIns c WHERE c.employeeId = u.id AND c.managerId = ?) AS lastCheckinAt
    FROM Users u
    WHERE u.managerId = ?
    ORDER BY u.name
  `).all(managerId, managerId);
}

// My team list
router.get('/team', (req, res) => {
  try {
    const reports = listReports(req.user.id);
    return send(res, ok({ reports }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Specific employee's full sheet
router.get('/team/:employeeId/goals', (req, res) => {
  try {
    const employee = db.prepare('SELECT id, name, email, managerId FROM Users WHERE id = ?').get(req.params.employeeId);
    if (!employee) return send(res, fail('Employee not found', 404));
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));

    const goals = db.prepare(`
      SELECT g.*,
        (SELECT json_group_array(json_object(
          'quarter', a.quarter, 'actual', a.actual,
          'progressStatus', a.progressStatus, 'computedScore', a.computedScore
        )) FROM Achievements a WHERE a.goalId = g.id) AS achievementsJson
      FROM Goals g
      WHERE g.employeeId = ?
      ORDER BY g.createdAt
    `).all(employee.id).map(r => ({
      ...r,
      isLocked: !!r.isLocked,
      isShared: !!r.isShared,
      achievements: r.achievementsJson ? JSON.parse(r.achievementsJson) : []
    })).map(({ achievementsJson, ...rest }) => rest);

    const totalW = goals.reduce((s, g) => s + Number(g.weightage), 0);
    return send(res, ok({ employee, goals, weightTotal: Math.round(totalW * 100) / 100 }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Inline edit during review — only for submitted goals
router.put('/goals/:id', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));

    const employee = db.prepare('SELECT managerId FROM Users WHERE id = ?').get(goal.employeeId);
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));

    if (goal.status !== 'submitted' && goal.status !== 'rework' && !goal.isLocked)
      return send(res, fail('Inline edits only allowed on submitted goals', 400));

    if (goal.isLocked && req.user.role !== 'admin')
      return send(res, fail('Goal is locked — Admin must unlock first', 400));

    const next = {
      target: req.body.target !== undefined ? Number(req.body.target) : goal.target,
      weightage: req.body.weightage !== undefined ? Number(req.body.weightage) : goal.weightage
    };

    if (isNaN(next.target) || next.target < 0) return send(res, fail('Invalid target', 400));
    if (isNaN(next.weightage) || next.weightage < 10 || next.weightage > 100)
      return send(res, fail('Weightage must be between 10 and 100', 400));

    const otherTotal = db.prepare(
      'SELECT COALESCE(SUM(weightage), 0) AS w FROM Goals WHERE employeeId = ? AND id != ?'
    ).get(goal.employeeId, goal.id).w;
    if (otherTotal + next.weightage > 100)
      return send(res, fail(`Total weightage would exceed 100% (others sum to ${otherTotal}%)`, 400));

    db.prepare('UPDATE Goals SET target = ?, weightage = ?, updatedAt = datetime(\'now\') WHERE id = ?')
      .run(next.target, next.weightage, goal.id);

    const updated = db.prepare('SELECT * FROM Goals WHERE id = ?').get(goal.id);

    if (goal.isLocked) {
      diffAndLog({ oldGoal: goal, newGoal: updated, changedBy: req.user.id, fields: ['target', 'weightage'] });
    }

    return send(res, ok({ goal: updated }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Approve — locks the goal
router.post('/goals/:id/approve', (req, res) => {
  try {
    const { note } = req.body || {};
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    const employee = db.prepare('SELECT id, name, managerId FROM Users WHERE id = ?').get(goal.employeeId);
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));
    if (goal.status !== 'submitted') return send(res, fail('Goal is not awaiting approval', 400));
    db.prepare(`
      UPDATE Goals SET status = 'approved', isLocked = 1, reworkNote = NULL, updatedAt = datetime('now')
      WHERE id = ?
    `).run(goal.id);
    logChange({
      goalId: goal.id, changedBy: req.user.id, fieldChanged: 'status',
      oldValue: goal.status, newValue: 'approved', reason: note || 'Approved by manager'
    });
    emailAndTeams(employee.id, 'Goal approved',
      `Your goal "${goal.title}" has been approved and is now locked.`,
      '/employee/goals');
    return send(res, ok({ approved: true }));
  } catch (e) {
    return send(res, fail('Approve failed: ' + e.message, 500));
  }
});

// Return for rework — note required
router.post('/goals/:id/return', (req, res) => {
  try {
    const { note } = req.body || {};
    if (!note || String(note).trim().length < 3) return send(res, fail('A rework note (min 3 chars) is required', 400));
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    const employee = db.prepare('SELECT id, name, managerId FROM Users WHERE id = ?').get(goal.employeeId);
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));
    if (goal.status !== 'submitted') return send(res, fail('Only submitted goals can be returned', 400));
    db.prepare(`
      UPDATE Goals SET status = 'rework', reworkNote = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(String(note).trim(), goal.id);
    logChange({
      goalId: goal.id, changedBy: req.user.id, fieldChanged: 'status',
      oldValue: goal.status, newValue: 'rework', reason: String(note).trim()
    });
    emailAndTeams(employee.id, 'Goal returned for rework',
      `Your goal "${goal.title}" was returned: ${note}`,
      '/employee/goals');
    return send(res, ok({ returned: true }));
  } catch (e) {
    return send(res, fail('Return failed: ' + e.message, 500));
  }
});

// Check-ins
router.get('/checkins', (req, res) => {
  try {
    const reports = listReports(req.user.id);
    const checkins = db.prepare(`
      SELECT c.*, u.name AS employeeName
      FROM CheckIns c JOIN Users u ON u.id = c.employeeId
      WHERE c.managerId = ?
      ORDER BY c.createdAt DESC
    `).all(req.user.id);

    const tracker = [];
    for (const r of reports) {
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const done = checkins.some(c => c.employeeId === r.id && c.quarter === q && c.status === 'completed');
        tracker.push({ employeeId: r.id, employeeName: r.name, quarter: q, completed: done });
      }
    }
    return send(res, ok({ reports, checkins, tracker }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Check-in detail view for one employee × quarter — planned vs actual
router.get('/checkins/:employeeId/:quarter', (req, res) => {
  try {
    const { employeeId, quarter } = req.params;
    const employee = db.prepare('SELECT id, name, managerId FROM Users WHERE id = ?').get(employeeId);
    if (!employee) return send(res, fail('Employee not found', 404));
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));

    const goals = db.prepare(`
      SELECT g.*,
        (SELECT json_object('actual', a.actual, 'progressStatus', a.progressStatus, 'computedScore', a.computedScore)
         FROM Achievements a WHERE a.goalId = g.id AND a.quarter = ?) AS quarterJson
      FROM Goals g
      WHERE g.employeeId = ? AND g.status = 'approved'
      ORDER BY g.createdAt
    `).all(quarter, employeeId).map(r => ({
      ...r,
      quarter: r.quarterJson ? JSON.parse(r.quarterJson) : null
    })).map(({ quarterJson, ...rest }) => rest);

    const existing = db.prepare(
      'SELECT * FROM CheckIns WHERE managerId = ? AND employeeId = ? AND quarter = ?'
    ).get(req.user.id, employeeId, quarter);

    return send(res, ok({ employee, goals, checkin: existing }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.post('/checkins', (req, res) => {
  try {
    const { employeeId, quarter, comment, status } = req.body || {};
    if (!employeeId || !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter))
      return send(res, fail('employeeId and valid quarter required', 400));
    if (!comment || String(comment).trim().length < 3) return send(res, fail('Comment (min 3 chars) required', 400));
    const employee = db.prepare('SELECT id, name, managerId FROM Users WHERE id = ?').get(employeeId);
    if (!employee) return send(res, fail('Employee not found', 404));
    if (req.user.role === 'manager' && employee.managerId !== req.user.id)
      return send(res, fail('Not your direct report', 403));
    const st = status === 'draft' ? 'draft' : 'completed';
    db.prepare(`
      INSERT INTO CheckIns (managerId, employeeId, quarter, comment, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(managerId, employeeId, quarter) DO UPDATE SET
        comment = excluded.comment,
        status = excluded.status,
        createdAt = datetime('now')
    `).run(req.user.id, employeeId, quarter, String(comment).trim(), st);
    if (st === 'completed') {
      emailAndTeams(employee.id, `${quarter} check-in logged`,
        `Your manager logged a ${quarter} check-in. View comments in the goal sheet.`,
        '/employee/goals');
    }
    return send(res, ok({ saved: true }));
  } catch (e) {
    return send(res, fail('Check-in save failed: ' + e.message, 500));
  }
});

module.exports = router;
