import axios from 'axios'

const API_BASE_URL = '/api'

const getAuthHeader = (token) => {
  if (!token) return {}
  return { Authorization: 'Bearer ' + token }
}

// Auth API calls
export const authAPI = {
  login: (email, password) => axios.post(`${API_BASE_URL}/auth/login`, { email, password }),
  register: (data) => axios.post(`${API_BASE_URL}/auth/register`, data),
  getProfile: (token) => axios.get(`${API_BASE_URL}/auth/profile`, { headers: getAuthHeader(token) }),
  updateProfile: (data, token) => axios.put(`${API_BASE_URL}/auth/profile`, data, { headers: getAuthHeader(token) }),
  getAllUsers: (token) => axios.get(`${API_BASE_URL}/auth/users`, { headers: getAuthHeader(token) }),
}

// Reservation API calls
export const reservationAPI = {
  requestAppointment: (data, token) =>
    axios.post(`${API_BASE_URL}/reservations/appointments/request`, data, { headers: getAuthHeader(token) }),
  getMyAppointments: (token) =>
    axios.get(`${API_BASE_URL}/reservations/appointments`, { headers: getAuthHeader(token) }),
  approveAppointment: (appointmentId, token) =>
    axios.put(`${API_BASE_URL}/reservations/appointments/${appointmentId}/approve`, {}, { headers: getAuthHeader(token) }),
  rejectAppointment: (appointmentId, reason, token) =>
    axios.put(`${API_BASE_URL}/reservations/appointments/${appointmentId}/reject`, { reason }, { headers: getAuthHeader(token) }),
  requestDeviceReservation: (data, token) =>
    axios.post(`${API_BASE_URL}/reservations/reservations/request`, data, { headers: getAuthHeader(token) }),
  getMyReservations: (token) =>
    axios.get(`${API_BASE_URL}/reservations/reservations`, { headers: getAuthHeader(token) }),
  getPendingReservations: (token) =>
    axios.get(`${API_BASE_URL}/reservations/reservations/pending`, { headers: getAuthHeader(token) }),
  approveReservation: (reservationId, token) =>
    axios.put(`${API_BASE_URL}/reservations/reservations/${reservationId}/approve`, {}, { headers: getAuthHeader(token) }),
  rejectReservation: (reservationId, reason, token) =>
    axios.put(`${API_BASE_URL}/reservations/reservations/${reservationId}/reject`, { reason }, { headers: getAuthHeader(token) }),
  getAvailableAcademics: (date, token) =>
    axios.get(`${API_BASE_URL}/reservations/academics/available`, { params: { date }, headers: getAuthHeader(token) }),
  getAvailableDevices: (token) =>
    axios.get(`${API_BASE_URL}/reservations/devices/available`, { headers: getAuthHeader(token) }),
  getStatistics: (token) =>
    axios.get(`${API_BASE_URL}/reservations/statistics`, { headers: getAuthHeader(token) }),
  getDeviceUsageStats: (token) =>
    axios.get(`${API_BASE_URL}/reservations/devices/usage/stats`, { headers: getAuthHeader(token) }),
}

export default { authAPI, reservationAPI }
