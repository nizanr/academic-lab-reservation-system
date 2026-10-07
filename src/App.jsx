import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AcademicDashboard from './pages/AcademicDashboard.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem('session')) || { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const login = useCallback((s) => {
    localStorage.setItem('session', JSON.stringify(s));
    setSession(s);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem('session');
    setSession({ token: null, user: null });
  }, []);
  const value = useMemo(() => ({ ...session, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const home = (user) => (!user ? '/login' : user.role === 'STUDENT' ? '/student' : '/academic');

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={home(user)} replace />;
  return children;
}

function Landing() {
  const { user } = useAuth();
  return <Navigate to={home(user)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/student" element={<Protected roles={['STUDENT']}><StudentDashboard /></Protected>} />
          <Route
            path="/academic"
            element={<Protected roles={['ACADEMIC', 'SUPER_ADMIN']}><AcademicDashboard /></Protected>}
          />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
