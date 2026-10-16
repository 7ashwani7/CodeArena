import { Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage/HomePage';
import { ProblemsPage } from '../pages/ProblemsPage/ProblemsPage';
import { ProblemDetailPage } from '../pages/ProblemDetailPage/ProblemDetailPage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { RegisterPage } from '../pages/RegisterPage/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute/ProtectedRoute';
import { AdminRoute } from '../components/common/AdminRoute/AdminRoute';
import { AdminPage } from '../pages/AdminPage/AdminPage';


export function AppRoutes({ healthState }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage healthState={healthState} />} />
      <Route path="/problems" element={<ProblemsPage />} />
      <Route path="/problems/:slug" element={<ProblemDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

