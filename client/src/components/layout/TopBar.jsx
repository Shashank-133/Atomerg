import { useEffect, useState } from 'react';
import { Menu, LogOut, Bell, Mail, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { initials, cn } from '../../lib/utils';

const ROLE_LABEL = { employee: 'Employee', manager: 'Manager (L1)', admin: 'Admin / HR' };
const ROLE_TONE = {
  employee: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700'
};

export default function TopBar({ user, onMenuClick }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);

  const load = async () => {
    const r = await api.get('/notifications', { skipAuthRedirect: true });
    if (r.success) {
      setUnread(r.data.unread);
      setList(r.data.notifications.slice(0, 8));
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const openInbox = () => { setOpen(o => !o); load(); };
  const goToInbox = () => { setOpen(false); navigate('/notifications'); };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <button onClick={onMenuClick} className="lg:hidden text-slate-600 p-2 -ml-2">
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden lg:block text-sm text-slate-500">
        FY26 cycle • <span className="text-slate-800 font-medium">Goal Setting & Tracking</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button onClick={openInbox} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-pop overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="font-semibold text-slate-800 text-sm">Notifications</div>
                <button onClick={goToInbox} className="text-xs text-brand-600 hover:underline">View all</button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {list.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500 text-center">You're all caught up.</div>
                ) : list.map(n => (
                  <div key={n.id} className={cn('flex gap-3 px-4 py-3 border-b border-slate-100', !n.isRead && 'bg-brand-50/40')}>
                    <div className="mt-0.5">
                      {n.channel === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                      {n.channel === 'teams' && <MessageSquare className="w-4 h-4 text-purple-500" />}
                      {n.channel === 'system' && <Bell className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold text-sm flex items-center justify-center shadow-sm">
            {initials(user.name)}
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-semibold text-slate-800">{user.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn('badge text-[10px]', ROLE_TONE[user.role])}>{ROLE_LABEL[user.role]}</span>
            </div>
          </div>
          <button onClick={logout} className="ml-1 p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
