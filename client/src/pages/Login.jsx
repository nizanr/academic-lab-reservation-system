import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [localError, setLocalError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setLocalError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setLocalError('Email ve şifre gereklidir')
      return
    }
    try {
      await login(formData.email, formData.password)
      navigate('/dashboard')
    } catch (err) {
      setLocalError(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📚 Akademik Birebir Danışmanlık
          </h1>
          <p className="text-gray-600">Lab Cihazı Rezerve Sistemi</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Giriş Yap</h2>

          {(localError || error) && (
            <div className="alert-error mb-4">{localError || error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Email Adresi</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="ornek@university.edu.tr"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Şifre</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full button-primary py-3 font-semibold"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Hesabınız yok mu?{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">
                Kayıt Olun
              </Link>
            </p>
          </div>
        </div>

        <div className="card p-4 bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-3">Test Kullanıcıları</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Öğrenci:</strong> student@example.com / password123</p>
            <p><strong>Akademisyen:</strong> academic@example.com / password123</p>
            <p><strong>Admin:</strong> admin@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
