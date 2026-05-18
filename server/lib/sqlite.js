// Thin wrapper around node:sqlite that mirrors the subset of the
// better-sqlite3 API we use, so route code can stay unchanged.
// node:sqlite ships with Node 22.5+, so no native compilation is needed.

const { DatabaseSync } = require('node:sqlite');

function wrapStmt(stmt) {
  const coerce = (row) => {
    if (!row || typeof row !== 'object') return row;
    for (const k of Object.keys(row)) {
      if (typeof row[k] === 'bigint') row[k] = Number(row[k]);
    }
    return row;
  };
  return {
    run: (...args) => {
      const r = stmt.run(...args);
      return {
        changes: Number(r.changes),
        lastInsertRowid: typeof r.lastInsertRowid === 'bigint'
          ? Number(r.lastInsertRowid)
          : r.lastInsertRowid
      };
    },
    get: (...args) => coerce(stmt.get(...args)),
    all: (...args) => stmt.all(...args).map(coerce)
  };
}

function open(filename) {
  const db = new DatabaseSync(filename);
  return {
    _db: db,
    exec: (sql) => db.exec(sql),
    prepare: (sql) => wrapStmt(db.prepare(sql)),
    pragma: (s) => db.exec(`PRAGMA ${s}`),
    transaction: (fn) => (...args) => {
      db.exec('BEGIN');
      try {
        const res = fn(...args);
        db.exec('COMMIT');
        return res;
      } catch (e) {
        try { db.exec('ROLLBACK'); } catch (_) {}
        throw e;
      }
    },
    close: () => db.close()
  };
}

module.exports = open;
