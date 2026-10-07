import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
    department: '',
    phone: '',
  })
  const [localError, setLocalError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setLocalError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      setLocalError('Ad, email ve şifre gereklidir')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Şifreler eşleşmiyor')
      return
    }

    if (formData.password.length < 6) {
      setLocalError('Şifre en az 6 karakter olmalıdır')
      return
    }

    try {
      await register(formData.name, formData.email, formData.password, formData.role, formData.department, formData.phone)
      navigate('/dashboard')
    } catch (err) {
      setLocalError(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yeni Hesap Oluştur</h1>
          <p className="text-gray-600">Akademik Danışmanlık Platformu</p>
        </div>

        <div className="card p-8">
          {(localError || error) && (
            <div className="alert-error mb-4">{localError || error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Ad Soyad</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Adınız Soyadınız"
              />
            </div>

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
              <label className="form-label">Rol</label>
              <select name="role" value={formData.role} onChange={handleChange} className="form-input">
                <option value="STUDENT">Öğrenci</option>
                <option value="ACADEMIC">Akademisyen</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Bölüm (Opsiyonel)</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="form-input"
                placeholder="Bilgisayar Mühendisliği"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telefon (Opsiyonel)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="+90 555 111 1111"
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

            <div className="form-group">
              <label className="form-label">Şifre Onayı</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
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
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="text-primary-600 font-medium hover:underline">
                Giriş Yapın
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
