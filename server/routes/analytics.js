const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');

const router = express.Router();
router.use(authRequired);
router.use(role('admin', 'manager'));

router.get('/kpis', (req, res) => {
  try {
    const totalEmployees = db.prepare("SELECT COUNT(*) AS n FROM Users WHERE role = 'employee'").get().n;
    const totalGoals = db.prepare('SELECT COUNT(*) AS n FROM Goals').get().n;
    const submittedGoals = db.prepare("SELECT COUNT(*) AS n FROM Goals WHERE status = 'submitted'").get().n;
    const approvedGoals = db.prepare("SELECT COUNT(*) AS n FROM Goals WHERE status = 'approved'").get().n;
    const avgScoreRow = db.prepare('SELECT AVG(computedScore) AS s FROM Achievements WHERE computedScore IS NOT NULL').get();
    const avgScore = avgScoreRow.s !== null ? Math.round(avgScoreRow.s) : null;
    return send(res, ok({ totalEmployees, totalGoals, submittedGoals, approvedGoals, avgScore }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Per-manager check-in completion rate
router.get('/manager-completion', (req, res) => {
  try {
    const managers = db.prepare("SELECT id, name FROM Users WHERE role = 'manager'").all();
    const out = managers.map(m => {
      const reportCount = db.prepare("SELECT COUNT(*) AS n FROM Users WHERE managerId = ? AND role = 'employee'")
        .get(m.id).n;
      const openCycles = db.prepare("SELECT key FROM CycleConfig WHERE key IN ('Q1','Q2','Q3','Q4') AND isOpen = 1").all().length;
      const expected = reportCount * Math.max(1, openCycles);
      const done = db.prepare(`
        SELECT COUNT(*) AS n FROM CheckIns
        WHERE managerId = ? AND status = 'completed'
        AND quarter IN (SELECT key FROM CycleConfig WHERE isOpen = 1 AND key LIKE 'Q%')
      `).get(m.id).n;
      const rate = expected === 0 ? 0 : Math.round((done / expected) * 100);
      return { manager: m.name, completionRate: rate, done, expected };
    });
    return send(res, ok({ rows: out }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Distribution by thrust area
router.get('/thrust-distribution', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT thrustArea AS name, COUNT(*) AS value FROM Goals GROUP BY thrustArea ORDER BY value DESC
    `).all();
    return send(res, ok({ rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Quarter-on-quarter avg score
router.get('/quarterly-trend', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT quarter, AVG(computedScore) AS avgScore, COUNT(*) AS n
      FROM Achievements
      WHERE computedScore IS NOT NULL
      GROUP BY quarter
      ORDER BY quarter
    `).all();
    const map = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const r of rows) map[r.quarter] = Math.round(r.avgScore || 0);
    const out = ['Q1','Q2','Q3','Q4'].map(q => ({ quarter: q, avgScore: map[q] }));
    return send(res, ok({ rows: out }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

module.exports = router;
