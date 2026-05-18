import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { FullPageSpinner } from './components/common/Spinner';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';

import EmployeeGoals from './pages/employee/Goals';
import EmployeeAchievements from './pages/employee/Achievements';
import EmployeeProgress from './pages/employee/Progress';

import ManagerTeam from './pages/manager/Team';
import ManagerEmployee from './pages/manager/EmployeeReview';
import ManagerCheckIns from './pages/manager/CheckIns';
import ManagerCheckInDetail from './pages/manager/CheckInDetail';

import AdminOverview from './pages/admin/Overview';
import AdminCompletion from './pages/admin/Completion';
import AdminSharedGoals from './pages/admin/SharedGoals';
import AdminUnlock from './pages/admin/Unlock';
import AdminAudit from './pages/admin/Audit';
import AdminReport from './pages/admin/Report';
import AdminCycle from './pages/admin/Cycle';
import AdminEscalations from './pages/admin/Escalations';

import Analytics from './pages/analytics/Dashboard';
import Notifications from './pages/Notifications';

function Protected({ user, allow, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected user={user}><AppShell /></Protected>}>

        <Route path="/" element={<HomeRedirect role={user?.role} />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/analytics" element={
          <Protected user={user} allow={['manager','admin']}><Analytics /></Protected>
        } />

        <Route path="/employee/goals" element={
          <Protected user={user} allow={['employee']}><EmployeeGoals /></Protected>
        } />
        <Route path="/employee/achievements" element={
          <Protected user={user} allow={['employee']}><EmployeeAchievements /></Protected>
        } />
        <Route path="/employee/progress" element={
          <Protected user={user} allow={['employee']}><EmployeeProgress /></Protected>
        } />

        <Route path="/manager/team" element={
          <Protected user={user} allow={['manager','admin']}><ManagerTeam /></Protected>
        } />
        <Route path="/manager/team/:employeeId" element={
          <Protected user={user} allow={['manager','admin']}><ManagerEmployee /></Protected>
        } />
        <Route path="/manager/checkins" element={
          <Protected user={user} allow={['manager','admin']}><ManagerCheckIns /></Protected>
        } />
        <Route path="/manager/checkins/:employeeId/:quarter" element={
          <Protected user={user} allow={['manager','admin']}><ManagerCheckInDetail /></Protected>
        } />

        <Route path="/admin/overview" element={
          <Protected user={user} allow={['admin']}><AdminOverview /></Protected>
        } />
        <Route path="/admin/completion" element={
          <Protected user={user} allow={['admin']}><AdminCompletion /></Protected>
        } />
        <Route path="/admin/shared-goals" element={
          <Protected user={user} allow={['admin']}><AdminSharedGoals /></Protected>
        } />
        <Route path="/admin/unlock" element={
          <Protected user={user} allow={['admin']}><AdminUnlock /></Protected>
        } />
        <Route path="/admin/audit" element={
          <Protected user={user} allow={['admin']}><AdminAudit /></Protected>
        } />
        <Route path="/admin/report" element={
          <Protected user={user} allow={['admin']}><AdminReport /></Protected>
        } />
        <Route path="/admin/cycle" element={
          <Protected user={user} allow={['admin']}><AdminCycle /></Protected>
        } />
        <Route path="/admin/escalations" element={
          <Protected user={user} allow={['admin']}><AdminEscalations /></Protected>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomeRedirect({ role }) {
  if (role === 'admin')    return <Navigate to="/admin/overview" replace />;
  if (role === 'manager')  return <Navigate to="/manager/team" replace />;
  if (role === 'employee') return <Navigate to="/employee/goals" replace />;
  return <Navigate to="/login" replace />;
}
