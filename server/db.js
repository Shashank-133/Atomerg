const path = require('path');
const fs = require('fs');
const openDb = require('./lib/sqlite');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'portal.db');
const db = openDb(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee','manager','admin')),
      managerId INTEGER REFERENCES Users(id),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      thrustArea TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      uomType TEXT NOT NULL CHECK(uomType IN ('numeric_min','numeric_max','timeline','zero')),
      target REAL NOT NULL,
      weightage REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','rework')),
      isLocked INTEGER NOT NULL DEFAULT 0,
      isShared INTEGER NOT NULL DEFAULT 0,
      sharedFromGoalId INTEGER REFERENCES Goals(id) ON DELETE SET NULL,
      reworkNote TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_goals_employee ON Goals(employeeId);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON Goals(status);
    CREATE INDEX IF NOT EXISTS idx_goals_shared_from ON Goals(sharedFromGoalId);

    CREATE TABLE IF NOT EXISTS Achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goalId INTEGER NOT NULL REFERENCES Goals(id) ON DELETE CASCADE,
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
      actual REAL,
      progressStatus TEXT NOT NULL DEFAULT 'not_started' CHECK(progressStatus IN ('not_started','on_track','completed')),
      computedScore REAL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(goalId, quarter)
    );

    CREATE INDEX IF NOT EXISTS idx_ach_goal ON Achievements(goalId);

    CREATE TABLE IF NOT EXISTS CheckIns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      managerId INTEGER NOT NULL REFERENCES Users(id),
      employeeId INTEGER NOT NULL REFERENCES Users(id),
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('draft','completed')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(managerId, employeeId, quarter)
    );

    CREATE TABLE IF NOT EXISTS AuditLogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goalId INTEGER REFERENCES Goals(id) ON DELETE SET NULL,
      changedBy INTEGER NOT NULL REFERENCES Users(id),
      fieldChanged TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
      reason TEXT,
      changedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_goal ON AuditLogs(goalId);
    CREATE INDEX IF NOT EXISTS idx_audit_when ON AuditLogs(changedAt);

    CREATE TABLE IF NOT EXISTS CycleConfig (
      key TEXT PRIMARY KEY,
      isOpen INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS EscalationRules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger TEXT NOT NULL CHECK(trigger IN ('goal_not_submitted','goal_not_approved','checkin_missing')),
      thresholdDays INTEGER NOT NULL,
      escalateTo TEXT NOT NULL CHECK(escalateTo IN ('employee','manager','admin')),
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS EscalationLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ruleId INTEGER REFERENCES EscalationRules(id) ON DELETE SET NULL,
      ruleName TEXT NOT NULL,
      targetUserId INTEGER NOT NULL REFERENCES Users(id),
      subjectUserId INTEGER REFERENCES Users(id),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      resolvedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS Notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK(channel IN ('email','teams','system')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notif_user ON Notifications(userId, isRead);
  `);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM Users').get().n;
  if (userCount > 0) return;

  const hash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO Users (name, email, passwordHash, role, managerId)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Order matters: admin first (no manager), then manager, then employees referencing manager.
  const adminId   = insertUser.run('Rohit Verma',  'admin@demo.com',    hash, 'admin',    null).lastInsertRowid;
  const priyaId   = insertUser.run('Priya Sharma', 'manager@demo.com',  hash, 'manager',  adminId).lastInsertRowid;
  const arjunId   = insertUser.run('Arjun Mehta',  'employee@demo.com', hash, 'employee', priyaId).lastInsertRowid;

  // Extra team members for richer manager + admin views
  const nehaId    = insertUser.run('Neha Iyer',    'neha@demo.com',     hash, 'employee', priyaId).lastInsertRowid;
  const karanId   = insertUser.run('Karan Bose',   'karan@demo.com',    hash, 'employee', priyaId).lastInsertRowid;

  const insertGoal = db.prepare(`
    INSERT INTO Goals (employeeId, thrustArea, title, description, uomType, target, weightage, status, isLocked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- Arjun: mixed-state portfolio so the dashboard is alive on first login ---
  const g1 = insertGoal.run(arjunId, 'Revenue Growth',
    'Achieve Q-on-Q sales revenue target',
    'Drive new logo acquisition across North & West regions to grow ARR.',
    'numeric_min', 5000000, 30, 'approved', 1).lastInsertRowid;

  const g2 = insertGoal.run(arjunId, 'Operational Excellence',
    'Reduce average ticket resolution time',
    'Lower mean TAT for tier-2 support tickets through process improvements.',
    'numeric_max', 24, 25, 'submitted', 0).lastInsertRowid;

  const g3 = insertGoal.run(arjunId, 'Product Launch',
    'Ship Atomberg Studio Smart-Fan firmware v2',
    'Complete firmware roll-out for the next-gen smart-fan SKUs by Sep-30.',
    'timeline', 120, 25, 'rework', 0).lastInsertRowid;
  db.prepare('UPDATE Goals SET reworkNote = ? WHERE id = ?').run(
    'Please split this into firmware-ready vs full GA milestones.', g3);

  const g4 = insertGoal.run(arjunId, 'Safety & Compliance',
    'Zero reportable safety incidents',
    'No reportable safety / compliance incidents in own team for the year.',
    'zero', 0, 20, 'draft', 0).lastInsertRowid;

  // --- Neha: fully approved goal sheet, useful for manager + check-in demos ---
  const n1 = insertGoal.run(nehaId, 'Customer Success',
    'Increase NPS by 8 points',
    'Drive NPS lift via white-glove onboarding for top-50 accounts.',
    'numeric_min', 8, 40, 'approved', 1).lastInsertRowid;
  const n2 = insertGoal.run(nehaId, 'Operational Excellence',
    'Cut churn rate',
    'Reduce annualised customer churn from 12% to under 8%.',
    'numeric_max', 8, 35, 'approved', 1).lastInsertRowid;
  const n3 = insertGoal.run(nehaId, 'Product Launch',
    'Launch self-serve dashboard',
    'Ship customer-facing self-serve KPI dashboard by Q3.',
    'timeline', 90, 25, 'approved', 1).lastInsertRowid;

  // --- Karan: still in draft, lets admin see pending state ---
  insertGoal.run(karanId, 'Revenue Growth',
    'Cross-sell ratio',
    'Lift cross-sell attach rate across existing accounts.',
    'numeric_min', 35, 40, 'draft', 0);

  // --- Sample achievements for already-approved goals ---
  const insertAch = db.prepare(`
    INSERT INTO Achievements (goalId, quarter, actual, progressStatus, computedScore)
    VALUES (?, ?, ?, ?, ?)
  `);
  // Arjun Q1 partial progress on his approved goal
  insertAch.run(g1, 'Q1', 1100000, 'on_track', Math.min((1100000 / 5000000) * 100, 100));

  // Neha some history across quarters
  insertAch.run(n1, 'Q1', 3,  'on_track',  Math.min((3 / 8) * 100, 100));
  insertAch.run(n2, 'Q1', 10, 'on_track',  Math.min((8 / 10) * 100, 100));
  insertAch.run(n3, 'Q1', 25, 'on_track',  25 <= 90 ? 100 : 0);

  // --- Seed escalation rules ---
  const insertRule = db.prepare(`
    INSERT INTO EscalationRules (name, trigger, thresholdDays, escalateTo, enabled)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertRule.run('Goal not submitted within 14 days', 'goal_not_submitted', 14, 'manager', 1);
  insertRule.run('Manager not approved within 7 days', 'goal_not_approved', 7, 'admin', 1);
  insertRule.run('Check-in missing in active window',  'checkin_missing',   15, 'admin', 1);

  // --- Seed cycle config: goal-setting open + admin-toggleable quarters ---
  const insertCycle = db.prepare(`
    INSERT INTO CycleConfig (key, isOpen) VALUES (?, ?)
  `);
  insertCycle.run('goal_setting', 1);
  insertCycle.run('Q1', 1);
  insertCycle.run('Q2', 1);
  insertCycle.run('Q3', 1);
  insertCycle.run('Q4', 0);

  // --- Sample welcome notifications ---
  const insertNotif = db.prepare(`
    INSERT INTO Notifications (userId, channel, title, body, link)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertNotif.run(arjunId, 'email', 'Welcome to AtomQuest',
    'Your FY26 goal sheet is open for editing. Submit before the cycle closes.',
    '/employee/goals');
  insertNotif.run(priyaId, 'teams', '3 team members awaiting goal approval',
    'You have pending goal submissions from your direct reports.',
    '/manager/team');
}

migrate();
seed();

module.exports = db;
