import React, { useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { LeavePage } from "./pages/LeavePage";
import { AttendancePage } from "./pages/AttendancePage";
import { SalarySlipPage } from "./pages/SalarySlipPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { FacultyPage } from "./pages/FacultyPage";
import { EssDashboardPage } from "./pages/EssDashboardPage";
import { api } from "./services/api";
import { LoginPage } from "./pages/LoginPage";
import { TodoPage } from "./pages/TodoPage";
import { CalendarPage } from "./pages/Calendarpage";

const isLocalDev =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const refreshAuth = async () => {
    setLoading(true);
    const res = await api.getProfile();
    setAuthed(res.ok);
    setLoading(false);
  };

  useEffect(() => {
    if (!isLocalDev) {
      void refreshAuth();
    } else {
      setLoading(false);
      setAuthed(false);
    }
  }, []);

  const guard = useMemo(() => {
    if (loading) return { state: "loading" as const };
    if (authed)  return { state: "authed"  as const };
    return           { state: "guest"   as const };
  }, [loading, authed]);

  if (guard.state === "loading") {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isLocalDev ? (
              <LoginPage onLoggedIn={() => { void refreshAuth(); }} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/*"
          element={
            guard.state === "authed" ? (
              <Layout>
                <Routes>
                  <Route path="/"            element={<Dashboard />} />
                  <Route path="/ess"         element={<EssDashboardPage />} />
                  <Route path="/leave"       element={<LeavePage />} />
                  <Route path="/attendance"  element={<AttendancePage />} />
                  <Route path="/salary-slip" element={<SalarySlipPage />} />
                  <Route path="/profile"     element={<ProfilePage />} />
                  <Route path="/directory"   element={<DirectoryPage />} />
                  <Route path="/faculty"     element={<FacultyPage />} />
                  <Route path="/todo"        element={<TodoPage />} />
                  <Route path="/calendar"    element={<CalendarPage />} />
                  <Route path="*"            element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : isLocalDev ? (
              <Navigate to="/login" replace />
            ) : (
              <div className="p-4">
                Please login to ERPNext first, then reload this page.
              </div>
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;