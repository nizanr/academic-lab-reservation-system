import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      login(await api('/auth/login', { method: 'POST', body: form }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Giriş Yap</h2>
      {error && <div className="alert">{error}</div>}
      <label>E-posta
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label>Şifre
        <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <button className="btn" type="submit">Giriş</button>
      <p>Hesabın yok mu? <Link to="/register">Kayıt ol</Link></p>
    </form>
  );
}
