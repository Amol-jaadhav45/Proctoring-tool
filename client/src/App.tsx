import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

import { ExamPage } from './pages/ExamPage';

import { RoleBasedHome } from './components/RoleBasedHome';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProctorDashboard } from './pages/ProctorDashboard';
import { LiveProctoringView } from './pages/LiveProctoringView';
import { ExamManagement } from './pages/ExamManagement';
import { InstitutePage } from './pages/InstitutePage';
import { StudentProfile } from './pages/StudentProfile';
import { ExamHistory } from './pages/ExamHistory';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { UserManagement } from './pages/UserManagement';
import { UpcomingExams } from './pages/UpcomingExams';
import { NotificationsPage } from './pages/NotificationsPage';
import { PreExamFlow } from './pages/PreExamFlow';
import { GenericSystemCheckPage } from './pages/GenericSystemCheckPage';

import { SchedulingPage } from './pages/admin/SchedulingPage';


import { AdminSettingsPage } from './pages/admin/SettingsPage';
import { ProctorSettingsPage } from './pages/proctor/SettingsPage';

import { FlaggedIncidentsPage } from './pages/admin/FlaggedIncidentsPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
// import { ActiveExamsMonitoring } from './pages/ActiveExamsMonitoring'; // Removed after merge
import { ExamResultsReport } from './pages/ExamResultsReport';
import { ExamResults } from './pages/ExamResults';

import { AdminLayout } from './components/AdminLayout';
import { ProctorLayout } from './components/ProctorLayout';
import { TestPage } from './pages/TestPage';
import { InvitePage } from './pages/InvitePage';

const AdminLayoutWrapper = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

const ProctorLayoutWrapper = () => (
  <ProctorLayout>
    <Outlet />
  </ProctorLayout>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/test" element={<TestPage />} />

            {/* Protected routes - Students */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:id"
              element={
                <ProtectedRoute>
                  <ExamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:id/precheck"
              element={
                <ProtectedRoute>
                  <PreExamFlow />
                </ProtectedRoute>
              }
            />

            {/* Student Pages */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <ExamHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:sessionId"
              element={
                <ProtectedRoute>
                  <ExamResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <PerformanceAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upcoming"
              element={
                <ProtectedRoute>
                  <UpcomingExams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-check"
              element={
                <ProtectedRoute>
                  <GenericSystemCheckPage />
                </ProtectedRoute>
              }
            />



            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayoutWrapper />}>
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <UserManagement />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <AdminSettingsPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="exam-results/:examId"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
                      <ExamResultsReport />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <NotificationsPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Proctor Routes */}
            <Route path="/proctor" element={<ProctorLayoutWrapper />}>
              {/* Reuse AdminDashboard for Proctor Dashboard for now, or assume it adapts if needed */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <ProctorDashboard />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <ExamManagement />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <UserManagement />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="scheduling"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <SchedulingPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="monitoring"
                element={<Navigate to="/proctor/exams" replace />}
              />
              <Route
                path="monitor/:examId"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <LiveProctoringView />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="exam-results/:examId"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <ExamResultsReport />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="violations"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <FlaggedIncidentsPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="sessions/:id"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <SessionDetailPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              {/* Proctor Settings - Reusing AdminSettingsPage or create new? Using AdminSettingsPage for now but should be separate or adapted */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <ProctorSettingsPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <NotificationsPage />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Institute Page - Protected or Public? Assuming Protected for now */}
            <Route
              path="/institute/:id"
              element={
                <ProtectedRoute>
                  <InstitutePage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
