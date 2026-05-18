const db = require('../db');

const insert = db.prepare(`
  INSERT INTO AuditLogs (goalId, changedBy, fieldChanged, oldValue, newValue, reason)
  VALUES (?, ?, ?, ?, ?, ?)
`);

function logChange({ goalId, changedBy, fieldChanged, oldValue, newValue, reason = null }) {
  insert.run(
    goalId,
    changedBy,
    fieldChanged,
    oldValue === undefined || oldValue === null ? null : String(oldValue),
    newValue === undefined || newValue === null ? null : String(newValue),
    reason
  );
}

function diffAndLog({ oldGoal, newGoal, changedBy, reason = null, fields }) {
  for (const f of fields) {
    const oldV = oldGoal[f];
    const newV = newGoal[f];
    if (String(oldV) !== String(newV)) {
      logChange({
        goalId: oldGoal.id,
        changedBy,
        fieldChanged: f,
        oldValue: oldV,
        newValue: newV,
        reason
      });
    }
  }
}

module.exports = { logChange, diffAndLog };
