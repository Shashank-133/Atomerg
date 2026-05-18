const { send, fail } = require('../lib/envelope');

function role(...allowed) {
  return function (req, res, next) {
    if (!req.user) return send(res, fail('Not authenticated', 401));
    if (!allowed.includes(req.user.role)) {
      return send(res, fail(`Requires one of: ${allowed.join(', ')}`, 403));
    }
    next();
  };
}

module.exports = { role };
