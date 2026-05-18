import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Target, BarChart3, Users, ClipboardCheck,
  Building2, History, Share2, Unlock, FileDown, BellRing, Settings, Workflow
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV = {
  employee: [
    { to: '/employee/goals', label: 'My Goal Sheet', icon: Target },
    { to: '/employee/achievements', label: 'Quarterly Achievements', icon: ClipboardCheck },
    { to: '/employee/progress', label: 'Progress', icon: BarChart3 }
  ],
  manager: [
    { to: '/manager/team', label: 'Team Overview', icon: Users },
    { to: '/manager/checkins', label: 'Quarterly Check-ins', icon: ClipboardCheck },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 }
  ],
  admin: [
    { to: '/admin/overview', label: 'Org Overview', icon: Building2 },
    { to: '/admin/completion', label: 'Completion Heatmap', icon: LayoutDashboard },
    { to: '/admin/shared-goals', label: 'Shared Goals', icon: Share2 },
    { to: '/admin/unlock', label: 'Unlock Goals', icon: Unlock },
    { to: '/admin/audit', label: 'Audit Log', icon: History },
    { to: '/admin/report', label: 'Reports (CSV)', icon: FileDown },
    { to: '/admin/cycle', label: 'Cycle Windows', icon: Settings },
    { to: '/admin/escalations', label: 'Escalations', icon: Workflow },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 }
  ]
};

export default function Sidebar({ user, open, onClose }) {
  const links = NAV[user.role] || [];
  return (
    <>
      <div className={cn('fixed inset-0 bg-slate-900/40 z-20 lg:hidden', open ? 'block' : 'hidden')}
           onClick={onClose} />
      <aside className={cn(
        'fixed lg:static top-0 left-0 z-30 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center text-base shadow-sm">
            A
          </div>
          <div>
            <div className="font-semibold text-slate-800 leading-tight">AtomQuest</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Goal Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              )}
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <NavLink
            to="/notifications"
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            <BellRing className="w-4 h-4" /> Notifications
          </NavLink>
        </div>
      </aside>
    </>
  );
}
