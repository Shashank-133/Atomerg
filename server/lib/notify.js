const db = require('../db');

const insert = db.prepare(`
  INSERT INTO Notifications (userId, channel, title, body, link)
  VALUES (?, ?, ?, ?, ?)
`);

function notify(userId, channel, title, body, link = null) {
  if (!userId) return;
  insert.run(userId, channel, title, body, link);
}

function emailAndTeams(userId, title, body, link = null) {
  notify(userId, 'email', title, body, link);
  notify(userId, 'teams', title, body, link);
}

module.exports = { notify, emailAndTeams };
