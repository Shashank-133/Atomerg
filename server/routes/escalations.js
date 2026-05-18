const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');
const { emailAndTeams } = require('../lib/notify');

const router = express.Router();
router.use(authRequired);

const VALID_TRIGGERS = ['goal_not_submitted', 'goal_not_approved', 'checkin_missing'];
const VALID_TARGETS = ['employee', 'manager', 'admin'];

router.get('/rules', role('admin'), (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM EscalationRules ORDER BY id').all();
    return send(res, ok({ rules: rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.post('/rules', role('admin'), (req, res) => {
  try {
    const { name, trigger, thresholdDays, escalateTo, enabled } = req.body || {};
    if (!name || String(name).trim().length < 3) return send(res, fail('Rule name required', 400));
    if (!VALID_TRIGGERS.includes(trigger)) return send(res, fail('Invalid trigger', 400));
    if (!VALID_TARGETS.includes(escalateTo)) return send(res, fail('Invalid escalation target', 400));
    const days = Number(thresholdDays);
    if (isNaN(days) || days < 1) return send(res, fail('thresholdDays must be ≥ 1', 400));
    const info = db.prepare(`
      INSERT INTO EscalationRules (name, trigger, thresholdDays, escalateTo, enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(String(name).trim(), trigger, days, escalateTo, enabled === false ? 0 : 1);
    return send(res, ok({ id: info.lastInsertRowid }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.put('/rules/:id', role('admin'), (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM EscalationRules WHERE id = ?').get(req.params.id);
    if (!r) return send(res, fail('Rule not found', 404));
    const enabled = req.body.enabled === undefined ? r.enabled : (req.body.enabled ? 1 : 0);
    const days = req.body.thresholdDays === undefined ? r.thresholdDays : Number(req.body.thresholdDays);
    db.prepare('UPDATE EscalationRules SET enabled = ?, thresholdDays = ? WHERE id = ?').run(enabled, days, r.id);
    return send(res, ok({ updated: true }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.delete('/rules/:id', role('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM EscalationRules WHERE id = ?').run(req.params.id);
    return send(res, ok({ deleted: true }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.get('/log', role('admin', 'manager'), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT e.*, t.name AS targetName, s.name AS subjectName
      FROM EscalationLog e
      LEFT JOIN Users t ON t.id = e.targetUserId
      LEFT JOIN Users s ON s.id = e.subjectUserId
      ORDER BY e.createdAt DESC
      LIMIT 200
    `).all();
    return send(res, ok({ rows }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

router.post('/log/:id/resolve', role('admin'), (req, res) => {
  try {
    db.prepare("UPDATE EscalationLog SET status = 'resolved', resolvedAt = datetime('now') WHERE id = ?")
      .run(req.params.id);
    return send(res, ok({ resolved: true }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Run engine on-demand
router.post('/run', role('admin'), (req, res) => {
  try {
    const result = runEscalationEngine();
    return send(res, ok(result));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

function getEscalationTargetUser(rule, subject) {
  if (rule.escalateTo === 'employee') return subject.id;
  if (rule.escalateTo === 'manager') return subject.managerId || null;
  if (rule.escalateTo === 'admin') {
    const admin = db.prepare("SELECT id FROM Users WHERE role = 'admin' LIMIT 1").get();
    return admin ? admin.id : null;
  }
  return null;
}

function logIfNew({ ruleId, ruleName, targetUserId, subjectUserId, message }) {
  if (!targetUserId) return false;
  // Dedupe: don't log identical open escalation for same subject within last 24h
  const existing = db.prepare(`
    SELECT id FROM EscalationLog
    WHERE ruleId = ? AND COALESCE(subjectUserId, -1) = COALESCE(?, -1) AND status = 'open'
      AND datetime(createdAt) > datetime('now', '-1 day')
  `).get(ruleId, subjectUserId);
  if (existing) return false;
  db.prepare(`
    INSERT INTO EscalationLog (ruleId, ruleName, targetUserId, subjectUserId, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(ruleId, ruleName, targetUserId, subjectUserId || null, message);
  emailAndTeams(targetUserId, `Escalation: ${ruleName}`, message, '/admin/escalations');
  return true;
}

function runEscalationEngine() {
  const rules = db.prepare('SELECT * FROM EscalationRules WHERE enabled = 1').all();
  let fired = 0;
  for (const rule of rules) {
    if (rule.trigger === 'goal_not_submitted') {
      const stuck = db.prepare(`
        SELECT g.*, u.name AS empName, u.managerId
        FROM Goals g JOIN Users u ON u.id = g.employeeId
        WHERE g.status = 'draft'
          AND julianday('now') - julianday(g.createdAt) >= ?
      `).all(rule.thresholdDays);
      for (const g of stuck) {
        const subject = { id: g.employeeId, managerId: g.managerId };
        const target = getEscalationTargetUser(rule, subject);
        if (logIfNew({
          ruleId: rule.id, ruleName: rule.name, targetUserId: target,
          subjectUserId: g.employeeId,
          message: `${g.empName} has not submitted goal "${g.title}" — draft for ${rule.thresholdDays}+ days.`
        })) fired++;
      }
    } else if (rule.trigger === 'goal_not_approved') {
      const stuck = db.prepare(`
        SELECT g.*, u.name AS empName, u.managerId
        FROM Goals g JOIN Users u ON u.id = g.employeeId
        WHERE g.status = 'submitted'
          AND julianday('now') - julianday(g.updatedAt) >= ?
      `).all(rule.thresholdDays);
      for (const g of stuck) {
        const subject = { id: g.employeeId, managerId: g.managerId };
        const target = getEscalationTargetUser(rule, subject);
        if (logIfNew({
          ruleId: rule.id, ruleName: rule.name, targetUserId: target,
          subjectUserId: g.employeeId,
          message: `Goal "${g.title}" for ${g.empName} is awaiting approval ${rule.thresholdDays}+ days.`
        })) fired++;
      }
    } else if (rule.trigger === 'checkin_missing') {
      const openQuarters = db.prepare("SELECT key FROM CycleConfig WHERE key LIKE 'Q%' AND isOpen = 1").all();
      const employees = db.prepare(`
        SELECT u.id, u.name, u.managerId
        FROM Users u WHERE u.role = 'employee' AND u.managerId IS NOT NULL
      `).all();
      for (const q of openQuarters) {
        for (const e of employees) {
          const has = db.prepare(`
            SELECT 1 FROM CheckIns
            WHERE employeeId = ? AND quarter = ? AND status = 'completed'
          `).get(e.id, q.key);
          if (has) continue;
          const target = getEscalationTargetUser(rule, e);
          if (logIfNew({
            ruleId: rule.id, ruleName: rule.name, targetUserId: target,
            subjectUserId: e.id,
            message: `${q.key} check-in still missing for ${e.name}.`
          })) fired++;
        }
      }
    }
  }
  return { fired, ruleCount: rules.length };
}

module.exports = router;
module.exports.runEscalationEngine = runEscalationEngine;
