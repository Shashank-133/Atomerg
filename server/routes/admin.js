const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');
const { logChange } = require('../lib/audit');
const { emailAndTeams } = require('../lib/notify');

const router = express.Router();
router.use(authRequired);
router.use(role('admin'));

const VALID_UOM = ['numeric_min', 'numeric_max', 'timeline', 'zero'];
const VALID_THRUST = [
  'Revenue Growth', 'Operational Excellence', 'Customer Success', 'Product Launch',
  'People & Culture', 'Safety & Compliance', 'Innovation', 'Cost Optimisation'
];

// Org overview
router.get('/overview', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.role,
        (SELECT name FROM Users m WHERE m.id = u.managerId) AS managerName,
        (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id) AS totalGoals,
        (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'approved') AS approvedGoals,
        (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'submitted') AS submittedGoals,
        (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'rework')    AS reworkGoals,
        (SELECT COUNT(*) FROM Goals g WHERE g.employeeId = u.id AND g.status = 'draft')     AS draftGoals,
        (SELECT COALESCE(SUM(weightage),0) FROM Goals g WHERE g.employeeId = u.id) AS weightTotal
      FROM Users u
      ORDER BY u.role, u.name
    `).all();
    return send(res, ok({ rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Completion grid (employees × quarters)
router.get('/completion', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT u.id, u.name, m.name AS managerName, m.id AS managerId
      FROM Users u LEFT JOIN Users m ON m.id = u.managerId
      WHERE u.role = 'employee'
      ORDER BY u.name
    `).all();

    const checkins = db.prepare(`
      SELECT employeeId, quarter, status FROM CheckIns
    `).all();

    const grid = employees.map(emp => {
      const row = { ...emp, quarters: {} };
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const found = checkins.find(c => c.employeeId === emp.id && c.quarter === q && c.status === 'completed');
        row.quarters[q] = !!found;
      }
      return row;
    });
    return send(res, ok({ grid }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Push a shared goal to many employees
router.post('/shared-goal', (req, res) => {
  try {
    const { thrustArea, title, description, uomType, target, weightage, employeeIds } = req.body || {};
    const errors = [];
    if (!VALID_THRUST.includes(thrustArea)) errors.push('Invalid Thrust Area');
    if (!title || String(title).trim().length < 3) errors.push('Title too short');
    if (!VALID_UOM.includes(uomType)) errors.push('Invalid UoM');
    const t = uomType === 'zero' ? 0 : Number(target);
    if (uomType !== 'zero' && (isNaN(t) || t < 0)) errors.push('Invalid target');
    const w = Number(weightage);
    if (isNaN(w) || w < 10 || w > 100) errors.push('Weightage must be between 10 and 100');
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) errors.push('Select at least one employee');
    if (errors.length) return send(res, fail(errors.join('. '), 400));

    const insert = db.prepare(`
      INSERT INTO Goals (employeeId, thrustArea, title, description, uomType, target, weightage, status, isLocked, isShared)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1, 1)
    `);

    const created = [];
    const ttl = db.transaction((ids) => {
      for (const id of ids) {
        const userExists = db.prepare('SELECT id FROM Users WHERE id = ? AND role = \'employee\'').get(id);
        if (!userExists) continue;
        const otherTotal = db.prepare('SELECT COALESCE(SUM(weightage),0) AS w FROM Goals WHERE employeeId = ?').get(id).w;
        // If this push would overflow, cap weightage to remaining; ensure min 10 retained on others
        let appliedW = w;
        if (otherTotal + appliedW > 100) {
          appliedW = Math.max(10, 100 - otherTotal);
        }
        const info = insert.run(id, thrustArea, String(title).trim(),
          description ? String(description).trim() : null, uomType, t, appliedW);
        created.push({ employeeId: id, goalId: info.lastInsertRowid });
        emailAndTeams(id, 'New shared organisational goal',
          `"${title}" has been added to your goal sheet by HR.`,
          '/employee/goals');
      }
    });
    ttl(employeeIds);
    return send(res, ok({ pushedTo: created.length, created }));
  } catch (e) {
    return send(res, fail('Push failed: ' + e.message, 500));
  }
});

// Unlock a locked goal
router.post('/unlock/:goalId', (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!reason || String(reason).trim().length < 3) return send(res, fail('Unlock reason (min 3 chars) is required', 400));
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.goalId);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (!goal.isLocked) return send(res, fail('Goal is not locked', 400));
    db.prepare('UPDATE Goals SET isLocked = 0, updatedAt = datetime(\'now\') WHERE id = ?').run(goal.id);
    logChange({
      goalId: goal.id, changedBy: req.user.id, fieldChanged: 'isLocked',
      oldValue: 1, newValue: 0, reason: String(reason).trim()
    });
    emailAndTeams(goal.employeeId, 'Goal unlocked by Admin',
      `Your goal "${goal.title}" has been unlocked: ${reason}`,
      '/employee/goals');
    return send(res, ok({ unlocked: true }));
  } catch (e) {
    return send(res, fail('Unlock failed: ' + e.message, 500));
  }
});

router.get('/locked-goals', (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const rows = db.prepare(`
      SELECT g.id, g.title, g.thrustArea, g.weightage, g.target, g.status,
             u.name AS employeeName, u.email AS employeeEmail
      FROM Goals g JOIN Users u ON u.id = g.employeeId
      WHERE g.isLocked = 1
      ORDER BY g.updatedAt DESC
    `).all().filter(r =>
      !q || r.title.toLowerCase().includes(q) || r.employeeName.toLowerCase().includes(q)
    );
    return send(res, ok({ rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Audit log
router.get('/audit-logs', (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const rows = db.prepare(`
      SELECT a.*, g.title AS goalTitle, u.name AS changedByName, e.name AS employeeName
      FROM AuditLogs a
      LEFT JOIN Goals g ON g.id = a.goalId
      LEFT JOIN Users u ON u.id = a.changedBy
      LEFT JOIN Users e ON e.id = g.employeeId
      ORDER BY a.changedAt DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) AS n FROM AuditLogs').get().n;
    return send(res, ok({ rows, total, page, pageSize }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// CSV export of achievement report
router.get('/report/csv', (req, res) => {
  try {
    const goals = db.prepare(`
      SELECT g.id, u.name AS employeeName, g.title, g.thrustArea, g.uomType, g.target, g.weightage, g.status
      FROM Goals g JOIN Users u ON u.id = g.employeeId
      ORDER BY u.name, g.createdAt
    `).all();
    const ach = db.prepare(`SELECT * FROM Achievements`).all();
    const byGoalQ = {};
    for (const a of ach) byGoalQ[`${a.goalId}_${a.quarter}`] = a;

    const headers = [
      'Employee', 'Goal Title', 'Thrust Area', 'UoM', 'Target', 'Weightage', 'Status',
      'Q1 Actual', 'Q1 Score',
      'Q2 Actual', 'Q2 Score',
      'Q3 Actual', 'Q3 Score',
      'Q4 Actual', 'Q4 Score'
    ];
    const esc = (s) => {
      if (s === null || s === undefined) return '';
      const str = String(s);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.join(',')];
    for (const g of goals) {
      const cells = [
        g.employeeName, g.title, g.thrustArea, g.uomType, g.target, g.weightage, g.status
      ];
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const a = byGoalQ[`${g.id}_${q}`];
        cells.push(a ? a.actual : '');
        cells.push(a && a.computedScore !== null ? Math.round(a.computedScore) : '');
      }
      lines.push(cells.map(esc).join(','));
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="achievement-report-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (e) {
    return send(res, fail('CSV export failed: ' + e.message, 500));
  }
});

// Cycle config (admin toggle for quarters and goal-setting window)
router.get('/cycle', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM CycleConfig ORDER BY key').all();
    return send(res, ok({ cycle: rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.put('/cycle/:key', (req, res) => {
  try {
    const allowed = ['goal_setting', 'Q1', 'Q2', 'Q3', 'Q4'];
    if (!allowed.includes(req.params.key)) return send(res, fail('Invalid cycle key', 400));
    const isOpen = req.body.isOpen ? 1 : 0;
    db.prepare(`
      INSERT INTO CycleConfig (key, isOpen, updatedAt)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET isOpen = excluded.isOpen, updatedAt = datetime('now')
    `).run(req.params.key, isOpen);
    return send(res, ok({ key: req.params.key, isOpen: !!isOpen }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Employees list (for shared goal picker)
router.get('/employees', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT u.id, u.name, u.email,
        (SELECT name FROM Users m WHERE m.id = u.managerId) AS managerName
      FROM Users u WHERE u.role = 'employee' ORDER BY u.name
    `).all();
    return send(res, ok({ employees }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

module.exports = router;
