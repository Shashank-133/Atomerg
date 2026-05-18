import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { Mail, MessageSquare, Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';

const CHANNEL = {
  email: { label: 'Email', icon: Mail, tone: 'text-blue-500 bg-blue-50' },
  teams: { label: 'Teams', icon: MessageSquare, tone: 'text-purple-500 bg-purple-50' },
  system: { label: 'System', icon: Bell, tone: 'text-slate-500 bg-slate-100' }
};

export default function Notifications() {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await api.get('/notifications');
    if (r.success) setData(r.data);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
  };
  const markAllRead = async () => {
    const r = await api.post('/notifications/read-all');
    if (r.success) toast.success('Inbox cleared');
    load();
  };

  if (!data) return <Spinner label="Loading inbox…" />;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Simulated email and Microsoft Teams notifications from across the portal."
        actions={data.unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary"><CheckCheck className="w-4 h-4" /> Mark all read</button>
        )}
      />

      {data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Your inbox is empty" message="You'll see notifications here when goals are submitted, approved, returned, or escalated." />
      ) : (
        <div className="space-y-2">
          {data.notifications.map(n => {
            const C = CHANNEL[n.channel] || CHANNEL.system;
            return (
              <div
                key={n.id}
                className={cn('card', !n.isRead && 'border-brand-200 bg-brand-50/30')}
              >
                <div className="card-body py-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', C.tone)}>
                      <C.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="badge bg-slate-100 text-slate-600 text-[10px]">{C.label}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500" title="Unread" />}
                        <span className="text-xs text-slate-400 ml-auto">{formatDate(n.createdAt)}</span>
                      </div>
                      <div className="font-medium text-slate-800 mt-1">{n.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{n.body}</div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        {n.link && (
                          <Link to={n.link} className="text-brand-600 hover:underline inline-flex items-center gap-1" onClick={() => markRead(n.id)}>
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {!n.isRead && (
                          <button onClick={() => markRead(n.id)} className="text-slate-500 hover:text-slate-700">Mark as read</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
