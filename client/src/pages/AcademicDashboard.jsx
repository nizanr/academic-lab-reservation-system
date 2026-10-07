import React, { useState, useEffect } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { useAuth } from '../contexts/AuthContext'
import { reservationAPI } from '../utils/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

export default function AcademicDashboard() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState('appointments')
  const [appointments, setAppointments] = useState([])
  const [pendingReservations, setPendingReservations] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [deviceStats, setDeviceStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments()
    } else if (activeTab === 'reservations') {
      loadReservations()
    } else if (activeTab === 'statistics') {
      loadStatistics()
    }
  }, [activeTab])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const response = await reservationAPI.getMyAppointments(token)
      setAppointments(response.data.appointments || [])
      setError(null)
    } catch (err) {
      setError('Randevuları yüklemede hata')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadReservations = async () => {
    setLoading(true)
    try {
      const response = await reservationAPI.getPendingReservations(token)
      setPendingReservations(response.data.reservations || [])
      setError(null)
    } catch (err) {
      setError('Rezervasyonları yüklemede hata')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    setLoading(true)
    try {
      const [statsRes, deviceRes] = await Promise.all([
        reservationAPI.getStatistics(token),
        reservationAPI.getDeviceUsageStats(token),
      ])
      setStatistics(statsRes.data.statistics)
      setDeviceStats(deviceRes.data.devices)
      setError(null)
    } catch (err) {
      setError('İstatistikleri yüklemede hata')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAppointment = async (appointmentId) => {
    try {
      await reservationAPI.approveAppointment(appointmentId, token)
      setSuccess('Randevu onaylandı')
      loadAppointments()
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Onaylama hatası')
    }
  }

  const handleRejectAppointment = async (appointmentId, reason) => {
    try {
      await reservationAPI.rejectAppointment(appointmentId, reason, token)
      setSuccess('Randevu reddedildi')
      loadAppointments()
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Reddetme hatası')
    }
  }

  const handleApproveReservation = async (reservationId) => {
    try {
      await reservationAPI.approveReservation(reservationId, token)
      setSuccess('Rezervasyon onaylandı')
      loadReservations()
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Onaylama hatası')
    }
  }

  const handleRejectReservation = async (reservationId, reason) => {
    try {
      await reservationAPI.rejectReservation(reservationId, reason, token)
      setSuccess('Rezervasyon reddedildi')
      loadReservations()
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Reddetme hatası')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      APPROVED: 'badge-success',
      REJECTED: 'badge-danger',
      COMPLETED: 'badge-info',
    }
    const labels = {
      PENDING: '⏳ Beklemede',
      APPROVED: '✅ Onaylı',
      REJECTED: '❌ Reddedildi',
      COMPLETED: '✔️ Tamamlandı',
    }
    return <span className={badges[status]}>{labels[status]}</span>
  }

  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING')
  const approvedAppointments = appointments.filter((a) => a.status === 'APPROVED')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz, Prof. {user?.name}</h1>
        <p className="text-gray-600">Randevu taleplerini yönetin ve istatistikleri inceleyin</p>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {success && <div className="alert-success mb-4">{success}</div>}

      <div className="flex space-x-4 mb-8 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-4 px-4 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📅 Randevu Talepleri ({pendingAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`pb-4 px-4 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'reservations'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Cihaz Talepleri ({pendingReservations.length})
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`pb-4 px-4 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'statistics'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 İstatistikler
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Beklemede Olan Randevular ({pendingAppointments.length})</h2>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : pendingAppointments.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-600">Beklemede randevu yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.map((apt) => (
                <div key={apt.id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">{apt.student_name}</p>
                      <p className="text-sm text-gray-600">{apt.email}</p>
                      <p className="text-sm text-gray-600 mt-1">📖 Konu: {apt.topic || 'Belirtilmedi'}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        📅 {apt.scheduled_date} | ⏰ {apt.start_time} - {apt.end_time}
                      </p>
                    </div>
                    <div>{getStatusBadge(apt.status)}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveAppointment(apt.id)}
                      className="button-primary py-2 text-sm flex-1"
                    >
                      ✅ Onayla
                    </button>
                    <button
                      onClick={() => handleRejectAppointment(apt.id, 'Müsait değilim')}
                      className="button-danger py-2 text-sm flex-1"
                    >
                      ❌ Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {approvedAppointments.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Onaylı Randevular ({approvedAppointments.length})</h3>
              <div className="space-y-2">
                {approvedAppointments.map((apt) => (
                  <div key={apt.id} className="card p-4 bg-green-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{apt.student_name}</p>
                        <p className="text-sm text-gray-600">
                          📅 {apt.scheduled_date} | ⏰ {apt.start_time} - {apt.end_time}
                        </p>
                      </div>
                      <span className="badge-success">✅ Onaylı</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reservations' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Beklemede Olan Cihaz Talepleri ({pendingReservations.length})</h2>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : pendingReservations.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-600">Beklemede cihaz talebi yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReservations.map((res) => (
                <div key={res.id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">{res.student_name}</p>
                      <p className="text-sm text-gray-600">{res.email}</p>
                      <p className="text-sm text-gray-600 mt-1">🔧 Cihaz: {res.device_name}</p>
                      <p className="text-sm text-gray-600">📝 Amaç: {res.purpose || 'Belirtilmedi'}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        📅 {res.reserved_date} | ⏰ {res.start_time} - {res.end_time} ({res.duration_minutes} min)
                      </p>
                    </div>
                    <div>{getStatusBadge(res.status)}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveReservation(res.id)}
                      className="button-primary py-2 text-sm flex-1"
                    >
                      ✅ Onayla
                    </button>
                    <button
                      onClick={() => handleRejectReservation(res.id, 'Cihaz uygun değil')}
                      className="button-danger py-2 text-sm flex-1"
                    >
                      ❌ Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">İstatistikler ve Analitik</h2>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="space-y-8">
              {statistics && (
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Toplam Randevu</h3>
                    <p className="text-3xl font-bold text-gray-900">{statistics.appointments?.total || 0}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      ✅ {statistics.appointments?.approved || 0} Onaylı
                    </p>
                  </div>

                  <div className="card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Beklemede Randevu</h3>
                    <p className="text-3xl font-bold text-gray-900">{statistics.appointments?.pending || 0}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      {statistics.approvalRate || 0}% Onay Oranı
                    </p>
                  </div>

                  <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Reddedilen Randevu</h3>
                    <p className="text-3xl font-bold text-gray-900">{statistics.appointments?.rejected || 0}</p>
                    <p className="text-xs text-gray-600 mt-2">
                      Reddetme Oranı: {
                        statistics.appointments?.total
                          ? ((statistics.appointments?.rejected / statistics.appointments?.total) * 100).toFixed(1)
                          : 0
                      }%
                    </p>
                  </div>
                </div>
              )}

              {deviceStats && deviceStats.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cihaz Kullanım Oranları</h3>
                  <div className="space-y-4">
                    {deviceStats.map((device) => (
                      <div key={device.id}>
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-medium text-gray-900">{device.name}</p>
                          <p className="text-sm text-gray-600">
                            {device.completed_reservations || 0} / {device.total_reservations || 0}
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: device.total_reservations
                                ? `${(device.completed_reservations / device.total_reservations) * 100}%`
                                : '0%',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
