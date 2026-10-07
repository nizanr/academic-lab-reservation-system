import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">📚</span>
            <div>
              <div className="font-bold text-gray-900">Akademik Danışmanlık</div>
              <div className="text-xs text-gray-500">Lab Rezerve Sistemi</div>
            </div>
          </Link>

          {isAuthenticated && (
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-4">
                <Link to="/dashboard" className="text-gray-600 hover:text-primary-600">
                  Dashboard
                </Link>
                {user?.role === 'STUDENT' && (
                  <>
                    <Link to="/appointments" className="text-gray-600 hover:text-primary-600">
                      Randevularım
                    </Link>
                    <Link to="/reservations" className="text-gray-600 hover:text-primary-600">
                      Rezervasyonlarım
                    </Link>
                  </>
                )}
                {user?.role === 'ACADEMIC' && (
                  <>
                    <Link to="/appointments" className="text-gray-600 hover:text-primary-600">
                      Randevular
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {user?.role === 'STUDENT' ? '👨‍🎓 Öğrenci' : user?.role === 'ACADEMIC' ? '👨‍🏫 Akademisyen' : '⚙️ Admin'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="button-secondary text-sm"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
