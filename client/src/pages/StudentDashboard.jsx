import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { reservationAPI } from '../utils/api'

export default function StudentDashboard() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState('appointments')
  const [appointments, setAppointments] = useState([])
  const [reservations, setReservations] = useState([])
  const [devices, setDevices] = useState([])
  const [academics, setAcademics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [appointmentForm, setAppointmentForm] = useState({
    academic_id: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    topic: '',
  })

  const [reservationForm, setReservationForm] = useState({
    device_id: '',
    reserved_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
  })

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments()
      loadAcademics()
    } else if (activeTab === 'reservations') {
      loadReservations()
      loadDevices()
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
      const response = await reservationAPI.getMyReservations(token)
      setReservations(response.data.reservations || [])
      setError(null)
    } catch (err) {
      setError('Rezervasyonları yüklemede hata')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadAcademics = async () => {
    try {
      const response = await reservationAPI.getAvailableAcademics(new Date().toISOString().split('T')[0], token)
      setAcademics(response.data.academics || [])
    } catch (err) {
      console.error('Akademisyenleri yüklemede hata:', err)
    }
  }

  const loadDevices = async () => {
    try {
      const response = await reservationAPI.getAvailableDevices(token)
      setDevices(response.data.devices || [])
    } catch (err) {
      console.error('Cihazları yüklemede hata:', err)
    }
  }

  const handleRequestAppointment = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await reservationAPI.requestAppointment(appointmentForm, token)
      setSuccess('Randevu talebiniz başarıyla gönderildi')
      setAppointmentForm({ academic_id: '', scheduled_date: '', start_time: '', end_time: '', topic: '' })
      loadAppointments()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Randevu talebinde hata')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReservation = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await reservationAPI.requestDeviceReservation(reservationForm, token)
      setSuccess('Cihaz rezervasyon talebiniz başarıyla gönderildi')
      setReservationForm({ device_id: '', reserved_date: '', start_time: '', end_time: '', purpose: '' })
      loadReservations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Rezervasyon talebinde hata')
    } finally {
      setLoading(false)
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz, {user?.name}</h1>
        <p className="text-gray-600">Randevu talebiniz ve cihaz rezervasyonlarını yönetin</p>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {success && <div className="alert-success mb-4">{success}</div>}

      <div className="flex space-x-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-4 px-4 font-medium border-b-2 transition ${
            activeTab === 'appointments'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📅 Randevu Talepleri
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`pb-4 px-4 font-medium border-b-2 transition ${
            activeTab === 'reservations'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          🔧 Cihaz Rezervasyonları
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Randevularım</h2>
            {loading ? (
              <div className="text-center py-8">Yükleniyor...</div>
            ) : appointments.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-600">Henüz randevu talebiniz yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{apt.academic_name}</p>
                        <p className="text-sm text-gray-600">{apt.topic || 'Konu belirtilmedi'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {apt.scheduled_date} | ⏰ {apt.start_time} - {apt.end_time}
                        </p>
                      </div>
                      <div>{getStatusBadge(apt.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Yeni Randevu Talep Et</h3>
            <form onSubmit={handleRequestAppointment} className="space-y-3">
              <div>
                <label className="form-label text-sm">Akademisyen</label>
                <select
                  value={appointmentForm.academic_id}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, academic_id: e.target.value })}
                  className="form-input text-sm"
                  required
                >
                  <option value="">Seçin...</option>
                  {academics.map((ac) => (
                    <option key={ac.id} value={ac.id}>{ac.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-sm">Tarih</label>
                <input
                  type="date"
                  value={appointmentForm.scheduled_date}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_date: e.target.value })}
                  className="form-input text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label text-sm">Başlangıç</label>
                  <input
                    type="time"
                    value={appointmentForm.start_time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="form-label text-sm">Bitiş</label>
                  <input
                    type="time"
                    value={appointmentForm.end_time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, end_time: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-sm">Konu</label>
                <input
                  type="text"
                  value={appointmentForm.topic}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, topic: e.target.value })}
                  className="form-input text-sm"
                  placeholder="Danışmak istediğiniz konu"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full button-primary text-sm py-2"
              >
                Talep Gönder
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cihaz Rezervasyonlarım</h2>
            {loading ? (
              <div className="text-center py-8">Yükleniyor...</div>
            ) : reservations.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-600">Henüz cihaz rezervasyonunuz yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((res) => (
                  <div key={res.id} className="card p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{res.device_name}</p>
                        <p className="text-sm text-gray-600">{res.purpose || 'Amaç belirtilmedi'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {res.reserved_date} | ⏰ {res.start_time} - {res.end_time} ({res.duration_minutes} min)
                        </p>
                      </div>
                      <div>{getStatusBadge(res.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Yeni Rezervasyon Talep Et</h3>
            <form onSubmit={handleRequestReservation} className="space-y-3">
              <div>
                <label className="form-label text-sm">Cihaz</label>
                <select
                  value={reservationForm.device_id}
                  onChange={(e) => setReservationForm({ ...reservationForm, device_id: e.target.value })}
                  className="form-input text-sm"
                  required
                >
                  <option value="">Seçin...</option>
                  {devices.map((dev) => (
                    <option key={dev.id} value={dev.id}>{dev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label text-sm">Tarih</label>
                <input
                  type="date"
                  value={reservationForm.reserved_date}
                  onChange={(e) => setReservationForm({ ...reservationForm, reserved_date: e.target.value })}
                  className="form-input text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label text-sm">Başlangıç</label>
                  <input
                    type="time"
                    value={reservationForm.start_time}
                    onChange={(e) => setReservationForm({ ...reservationForm, start_time: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="form-label text-sm">Bitiş</label>
                  <input
                    type="time"
                    value={reservationForm.end_time}
                    onChange={(e) => setReservationForm({ ...reservationForm, end_time: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-sm">Amaç</label>
                <input
                  type="text"
                  value={reservationForm.purpose}
                  onChange={(e) => setReservationForm({ ...reservationForm, purpose: e.target.value })}
                  className="form-input text-sm"
                  placeholder="Cihazı kullanma amacınız"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full button-primary text-sm py-2"
              >
                Talep Gönder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
