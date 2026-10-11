import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

export default function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', studentNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError('');
    try {
      login(await api('/auth/register', { method: 'POST', body: form }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2>Öğrenci Kaydı</h2>
      {error && <div className="alert" role="alert">{error}</div>}
      <label>Ad Soyad
        <input required maxLength={100} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label>Öğrenci numarası
        <input required inputMode="numeric" pattern="[0-9]{5,20}" minLength={5} maxLength={20} value={form.studentNumber} onChange={e => setForm({ ...form, studentNumber: e.target.value })} />
      </label>
      <label>E-posta
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label>Şifre (10–128 karakter)
        <input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </label>
      <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Kaydediliyor…' : 'Kayıt Ol'}</button>
      <p>Zaten hesabın var mı? <Link to="/login">Giriş yap</Link></p>
    </form>
  );
}
