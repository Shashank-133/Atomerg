function computeScore(uomType, target, actual) {
  if (actual === null || actual === undefined || isNaN(actual)) return null;
  const t = Number(target);
  const a = Number(actual);
  if (uomType === 'numeric_min') {
    if (t === 0) return a === 0 ? 100 : 100;
    return Math.min((a / t) * 100, 100);
  }
  if (uomType === 'numeric_max') {
    if (a === 0) return 100;
    return a <= t ? 100 : Math.min((t / a) * 100, 100);
  }
  if (uomType === 'timeline') {
    return a <= t ? 100 : 0;
  }
  if (uomType === 'zero') {
    return a === 0 ? 100 : 0;
  }
  return null;
}

function scoreBand(score) {
  if (score === null || score === undefined) return 'pending';
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

module.exports = { computeScore, scoreBand };
