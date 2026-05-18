const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

require('./db');

const authRoutes = require('./routes/auth');
const goalRoutes = require('./routes/goals');
const achievementRoutes = require('./routes/achievements');
const managerRoutes = require('./routes/manager');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const escalationRoutes = require('./routes/escalations');
const notificationRoutes = require('./routes/notifications');
const cycleRoutes = require('./routes/cycle');
const { runEscalationEngine } = require('./routes/escalations');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cycle', cycleRoutes);

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ success: false, data: null, error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`[AtomQuest] API listening on http://localhost:${PORT}`);
  // Run escalation engine every 5 minutes during server lifetime
  try {
    runEscalationEngine();
    setInterval(() => {
      try { runEscalationEngine(); } catch (e) { console.error('[Escalation]', e.message); }
    }, 5 * 60 * 1000);
  } catch (e) {
    console.error('[Escalation init]', e.message);
  }
});
