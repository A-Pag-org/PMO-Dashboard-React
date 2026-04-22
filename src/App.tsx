import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import SummaryPage from '@/pages/SummaryPage';
import DetailPage from '@/pages/DetailPage';
import AllDataPage from '@/pages/AllDataPage';
import UploadPage from '@/pages/UploadPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard/summary" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      {/* Legacy dashboard-selection landing page — kept accessible for
          reference, but users now land directly on the Impact Dashboard
          after sign-in. */}
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/summary"
        element={
          <RequireAuth>
            <SummaryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/detail"
        element={
          <RequireAuth>
            <DetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/all-data"
        element={
          <RequireAuth>
            <AllDataPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/upload"
        element={
          <RequireAuth>
            <UploadPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
