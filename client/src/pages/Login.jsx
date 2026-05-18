import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/common/Toast';
import { Lock, Mail, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

const DEFAULT_BY_ROLE = {
  admin: '/admin/overview',
  manager: '/manager/team',
  employee: '/employee/goals'
};

const QUICK_LOGINS = [
  { role: 'Employee', email: 'employee@demo.com', tone: 'bg-slate-100 text-slate-700' },
  { role: 'Manager',  email: 'manager@demo.com',  tone: 'bg-blue-100 text-blue-700' },
  { role: 'Admin',    email: 'admin@demo.com',    tone: 'bg-purple-100 text-purple-700' }
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(DEFAULT_BY_ROLE[user.role] || '/', { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setBusy(true);
    const r = await login(email.trim(), password);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error || 'Login failed');
      return;
    }
    toast.success(`Welcome back, ${r.user.name.split(' ')[0]}!`);
    navigate(DEFAULT_BY_ROLE[r.user.role] || '/', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-brand-50">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-brand-700 font-bold flex items-center justify-center text-lg">A</div>
          <div>
            <div className="font-bold text-lg">AtomQuest 1.0</div>
            <div className="text-xs uppercase tracking-widest text-brand-200">In-house Goal Portal</div>
          </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Hackathon Build
          </div>
          <h1 className="text-4xl font-bold leading-tight">Set goals. Track impact. Stay aligned.</h1>
          <p className="mt-4 text-brand-100 max-w-md">
            A structured, audit-ready platform for the full goal lifecycle — creation,
            approval, quarterly check-ins, and analytics.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {['Goal Sheet', 'Manager Approval', 'Check-ins'].map(t => (
              <div key={t} className="bg-white/10 rounded-lg p-3 text-xs text-brand-100">{t}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-brand-200">© AtomQuest Hackathon 1.0</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center text-lg">A</div>
            <div>
              <div className="font-bold text-slate-800">AtomQuest</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Goal Portal</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h2 className="text-xl font-bold text-slate-800">Welcome back</h2>
              <p className="text-sm text-slate-500 mt-1">Log in to continue to your goal sheet.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label">Work email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      autoFocus
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1.5 p-1.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Demo accounts</div>
                <div className="flex flex-col gap-2">
                  {QUICK_LOGINS.map(q => (
                    <button
                      key={q.role}
                      type="button"
                      onClick={() => { setEmail(q.email); setPassword('password123'); }}
                      className="flex items-center justify-between text-sm rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-brand-50/40 px-3 py-2 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`badge ${q.tone}`}>{q.role}</span>
                        <span className="text-slate-600">{q.email}</span>
                      </span>
                      <span className="text-xs text-slate-400">click to use</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-xs text-slate-500">Password for all demo accounts: <span className="font-mono text-slate-700">password123</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
