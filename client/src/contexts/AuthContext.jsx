import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      fetchProfile(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfile = async (authToken) => {
    try {
      const config = { headers: { Authorization: 'Bearer ' + authToken } }
      const response = await axios.get('/api/auth/profile', config)
      setUser(response.data.user)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      const { token: newToken, user: userData } = response.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Giriş hatası'
      setError(errorMessage)
      throw errorMessage
    } finally {
      setLoading(false)
    }
  }

  const register = async (name, email, password, role = 'STUDENT', department = '', phone = '') => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role,
        department: department || null,
        phone: phone || null,
      })
      const { token: newToken, user: userData } = response.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Kayıt hatası'
      setError(errorMessage)
      throw errorMessage
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setError(null)
    localStorage.removeItem('token')
  }

  const updateProfile = async (profileData) => {
    setError(null)
    try {
      const config = { headers: { Authorization: 'Bearer ' + token } }
      const response = await axios.put('/api/auth/profile', profileData, config)
      setUser(response.data.user)
      return response.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Profil güncelleme hatası'
      setError(errorMessage)
      throw errorMessage
    }
  }

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!token && !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
