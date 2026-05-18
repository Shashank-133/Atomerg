import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '../../lib/auth';
import { Outlet } from 'react-router-dom';

export default function AppShell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 lg:px-8 py-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
