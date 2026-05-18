function ok(data) {
  return { success: true, data, error: null };
}

function fail(error, status = 400) {
  const payload = { success: false, data: null, error };
  payload.__status = status;
  return payload;
}

function send(res, payload) {
  if (payload && payload.__status) {
    const status = payload.__status;
    const { __status, ...rest } = payload;
    return res.status(status).json(rest);
  }
  return res.json(payload);
}

module.exports = { ok, fail, send };
