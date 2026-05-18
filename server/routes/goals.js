const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { role } = require('../middleware/role');
const { ok, fail, send } = require('../lib/envelope');
const { computeScore } = require('../lib/score');
const { diffAndLog, logChange } = require('../lib/audit');
const { emailAndTeams } = require('../lib/notify');

const router = express.Router();

const VALID_UOM = ['numeric_min', 'numeric_max', 'timeline', 'zero'];
const VALID_THRUST = [
  'Revenue Growth',
  'Operational Excellence',
  'Customer Success',
  'Product Launch',
  'People & Culture',
  'Safety & Compliance',
  'Innovation',
  'Cost Optimisation'
];

const MAX_GOALS = 8;
const MIN_WEIGHTAGE = 10;

function totalWeight(employeeId, excludeGoalId = null) {
  const row = excludeGoalId
    ? db.prepare('SELECT COALESCE(SUM(weightage),0) AS w FROM Goals WHERE employeeId = ? AND id != ?').get(employeeId, excludeGoalId)
    : db.prepare('SELECT COALESCE(SUM(weightage),0) AS w FROM Goals WHERE employeeId = ?').get(employeeId);
  return row.w;
}

function sheetSummary(employeeId) {
  const rows = db.prepare(`
    SELECT g.*,
      (SELECT json_group_array(json_object(
        'id', a.id,
        'quarter', a.quarter,
        'actual', a.actual,
        'progressStatus', a.progressStatus,
        'computedScore', a.computedScore
      )) FROM Achievements a WHERE a.goalId = g.id) AS achievementsJson
    FROM Goals g
    WHERE g.employeeId = ?
    ORDER BY g.createdAt ASC
  `).all(employeeId);
  return rows.map(r => ({
    ...r,
    isLocked: !!r.isLocked,
    isShared: !!r.isShared,
    achievements: r.achievementsJson ? JSON.parse(r.achievementsJson) : []
  })).map(({ achievementsJson, ...rest }) => rest);
}

router.use(authRequired);

// List my goals (employee)
router.get('/', (req, res) => {
  try {
    const goals = sheetSummary(req.user.id);
    const total = goals.reduce((s, g) => s + Number(g.weightage), 0);
    return send(res, ok({
      goals,
      weightTotal: Math.round(total * 100) / 100,
      canSubmit: total === 100 && goals.length > 0 && goals.length <= MAX_GOALS,
      limits: { maxGoals: MAX_GOALS, minWeightage: MIN_WEIGHTAGE }
    }));
  } catch (e) {
    return send(res, fail('Failed to load goals: ' + e.message, 500));
  }
});

router.get('/:id', (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (req.user.role === 'employee' && goal.employeeId !== req.user.id)
      return send(res, fail('Not allowed', 403));
    return send(res, ok({ goal }));
  } catch (e) {
    return send(res, fail('Failed: ' + e.message, 500));
  }
});

// Create goal
router.post('/', role('employee'), (req, res) => {
  try {
    const { thrustArea, title, description, uomType, target, weightage } = req.body || {};

    const errors = [];
    if (!thrustArea || !VALID_THRUST.includes(thrustArea)) errors.push('Choose a valid Thrust Area');
    if (!title || String(title).trim().length < 3) errors.push('Title must be at least 3 characters');
    if (!uomType || !VALID_UOM.includes(uomType)) errors.push('Choose a valid Unit of Measurement');
    const t = Number(target);
    if (uomType !== 'zero' && (isNaN(t) || t < 0)) errors.push('Target must be a non-negative number');
    const w = Number(weightage);
    if (isNaN(w) || w < MIN_WEIGHTAGE) errors.push(`Weightage must be at least ${MIN_WEIGHTAGE}%`);
    if (w > 100) errors.push('Weightage cannot exceed 100%');
    if (errors.length) return send(res, fail(errors.join('. '), 400));

    const existingCount = db.prepare('SELECT COUNT(*) AS n FROM Goals WHERE employeeId = ?').get(req.user.id).n;
    if (existingCount >= MAX_GOALS) return send(res, fail(`You already have the maximum of ${MAX_GOALS} goals`, 400));

    const currentTotal = totalWeight(req.user.id);
    if (currentTotal + w > 100) {
      return send(res, fail(`Weightage exceeds 100% (have ${currentTotal}%, adding ${w}%). Adjust other goals first.`, 400));
    }

    const info = db.prepare(`
      INSERT INTO Goals (employeeId, thrustArea, title, description, uomType, target, weightage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      String(thrustArea),
      String(title).trim(),
      description ? String(description).trim() : null,
      uomType,
      uomType === 'zero' ? 0 : t,
      w
    );

    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(info.lastInsertRowid);
    return send(res, ok({ goal }));
  } catch (e) {
    return send(res, fail('Could not create goal: ' + e.message, 500));
  }
});

// Update goal (employee, pre-lock)
router.put('/:id', role('employee'), (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (goal.employeeId !== req.user.id) return send(res, fail('Not allowed', 403));
    if (goal.isLocked) return send(res, fail('Goal is locked — ask Admin to unlock first', 400));

    // Shared goals: only weightage editable by recipient
    if (goal.isShared) {
      const w = Number(req.body.weightage);
      if (isNaN(w) || w < MIN_WEIGHTAGE) return send(res, fail(`Weightage must be at least ${MIN_WEIGHTAGE}%`, 400));
      const otherTotal = totalWeight(req.user.id, goal.id);
      if (otherTotal + w > 100) return send(res, fail(`Weightage exceeds 100% (others sum to ${otherTotal}%).`, 400));
      db.prepare('UPDATE Goals SET weightage = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(w, goal.id);
      const updated = db.prepare('SELECT * FROM Goals WHERE id = ?').get(goal.id);
      return send(res, ok({ goal: updated }));
    }

    const next = {
      thrustArea: req.body.thrustArea ?? goal.thrustArea,
      title: req.body.title ?? goal.title,
      description: req.body.description ?? goal.description,
      uomType: req.body.uomType ?? goal.uomType,
      target: req.body.target !== undefined ? Number(req.body.target) : goal.target,
      weightage: req.body.weightage !== undefined ? Number(req.body.weightage) : goal.weightage
    };

    const errors = [];
    if (!VALID_THRUST.includes(next.thrustArea)) errors.push('Invalid Thrust Area');
    if (!next.title || String(next.title).trim().length < 3) errors.push('Title too short');
    if (!VALID_UOM.includes(next.uomType)) errors.push('Invalid UoM');
    if (next.uomType !== 'zero' && (isNaN(next.target) || next.target < 0)) errors.push('Invalid target');
    if (isNaN(next.weightage) || next.weightage < MIN_WEIGHTAGE) errors.push(`Weightage must be at least ${MIN_WEIGHTAGE}%`);
    if (next.weightage > 100) errors.push('Weightage cannot exceed 100%');
    if (errors.length) return send(res, fail(errors.join('. '), 400));

    const otherTotal = totalWeight(req.user.id, goal.id);
    if (otherTotal + next.weightage > 100)
      return send(res, fail(`Total weightage would exceed 100% (others sum to ${otherTotal}%).`, 400));

    db.prepare(`
      UPDATE Goals
      SET thrustArea = ?, title = ?, description = ?, uomType = ?, target = ?, weightage = ?,
          status = CASE WHEN status = 'rework' THEN 'draft' ELSE status END,
          reworkNote = CASE WHEN status = 'rework' THEN NULL ELSE reworkNote END,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      next.thrustArea,
      String(next.title).trim(),
      next.description ? String(next.description).trim() : null,
      next.uomType,
      next.uomType === 'zero' ? 0 : next.target,
      next.weightage,
      goal.id
    );

    const updated = db.prepare('SELECT * FROM Goals WHERE id = ?').get(goal.id);
    return send(res, ok({ goal: updated }));
  } catch (e) {
    return send(res, fail('Could not update goal: ' + e.message, 500));
  }
});

// Delete (pre-submit only)
router.delete('/:id', role('employee'), (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (goal.employeeId !== req.user.id) return send(res, fail('Not allowed', 403));
    if (goal.status !== 'draft' && goal.status !== 'rework')
      return send(res, fail('Goal already submitted — cannot delete', 400));
    if (goal.isShared) return send(res, fail('Shared goals cannot be deleted', 400));
    db.prepare('DELETE FROM Goals WHERE id = ?').run(goal.id);
    return send(res, ok({ deleted: true }));
  } catch (e) {
    return send(res, fail('Delete failed: ' + e.message, 500));
  }
});

// Submit single
router.post('/:id/submit', role('employee'), (req, res) => {
  try {
    const goal = db.prepare('SELECT * FROM Goals WHERE id = ?').get(req.params.id);
    if (!goal) return send(res, fail('Goal not found', 404));
    if (goal.employeeId !== req.user.id) return send(res, fail('Not allowed', 403));
    if (goal.status === 'approved') return send(res, fail('Already approved', 400));
    const totalW = totalWeight(req.user.id);
    if (totalW !== 100) return send(res, fail(`Total weightage must be exactly 100% to submit (currently ${totalW}%)`, 400));
    db.prepare('UPDATE Goals SET status = \'submitted\', updatedAt = datetime(\'now\') WHERE id = ?').run(goal.id);

    const manager = db.prepare('SELECT id FROM Users WHERE id = ?').get(req.user.managerId);
    if (manager) {
      emailAndTeams(manager.id, 'Goal submitted for approval',
        `${req.user.name} submitted "${goal.title}" for your review.`,
        '/manager/team');
    }
    return send(res, ok({ submitted: true }));
  } catch (e) {
    return send(res, fail('Submit failed: ' + e.message, 500));
  }
});

// Submit all draft/rework goals at once
router.post('/batch-submit', role('employee'), (req, res) => {
  try {
    const totalW = totalWeight(req.user.id);
    if (totalW !== 100)
      return send(res, fail(`Total weightage must be exactly 100% (currently ${totalW}%).`, 400));
    const count = db.prepare('SELECT COUNT(*) AS n FROM Goals WHERE employeeId = ?').get(req.user.id).n;
    if (count === 0) return send(res, fail('No goals to submit', 400));
    const info = db.prepare(`
      UPDATE Goals
      SET status = 'submitted', updatedAt = datetime('now')
      WHERE employeeId = ? AND status IN ('draft','rework')
    `).run(req.user.id);

    if (info.changes > 0 && req.user.managerId) {
      emailAndTeams(req.user.managerId, `${req.user.name} submitted goal sheet`,
        `${info.changes} goal(s) ready for your review.`,
        '/manager/team');
    }
    return send(res, ok({ submitted: info.changes }));
  } catch (e) {
    return send(res, fail('Batch submit failed: ' + e.message, 500));
  }
});

module.exports = router;
