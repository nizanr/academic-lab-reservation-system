import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

const ROLE_TR = { STUDENT: 'Öğrenci', ACADEMIC: 'Akademisyen', SUPER_ADMIN: 'Süper Admin' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <Link to="/" className="brand">🎓 Danışmanlık &amp; Lab Rezervasyon</Link>
      <div className="nav-right">
        {user ? (
          <>
            <span className="nav-user">{user.name} <span className="badge">{ROLE_TR[user.role]}</span></span>
            <button className="btn btn-outline" onClick={() => { logout(); navigate('/login'); }}>Çıkış</button>
          </>
        ) : (
          <>
            <Link to="/login">Giriş</Link>
            <Link to="/register">Kayıt Ol</Link>
          </>
        )}
      </div>
    </nav>
  );
}
