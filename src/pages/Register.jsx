import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      login(await api('/auth/register', { method: 'POST', body: form }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Öğrenci Kaydı</h2>
      {error && <div className="alert">{error}</div>}
      <label>Ad Soyad
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label>E-posta
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label>Şifre (en az 6 karakter)
        <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <button className="btn" type="submit">Kayıt Ol</button>
      <p>Zaten hesabın var mı? <Link to="/login">Giriş yap</Link></p>
    </form>
  );
}
