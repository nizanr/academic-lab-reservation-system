import React, { useCallback, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useAuth } from '../App.jsx';
import { api, fmt, STATUS_TR } from '../api.js';
import useLiveData from '../useLiveData.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function AcademicDashboard() {
  const { token, user } = useAuth();
  const [error, setError] = useState('');
  const isAdmin = user.role === 'SUPER_ADMIN';

  const fIncoming = useCallback(() => api('/reservations/incoming', { token }), [token]);
  const fDevices = useCallback(() => api('/reservations/stats/devices', { token }), [token]);
  const fStatus = useCallback(() => api('/reservations/stats/status', { token }), [token]);
  const fUsers = useCallback(() => (isAdmin ? api('/reservations/admin/users', { token }) : Promise.resolve([])), [token, isAdmin]);
  const { data: incoming, refresh } = useLiveData(fIncoming, 5000);
  const { data: devStats, refresh: rDev } = useLiveData(fDevices, 10000);
  const { data: statusStats, refresh: rStat } = useLiveData(fStatus, 10000);
  const { data: users, refresh: rUsers } = useLiveData(fUsers, 15000);

  const update = async (id, status) => {
    try { await api(`/reservations/${id}/status`, { method: 'PATCH', token, body: { status } }); setError(''); }
    catch (e) { setError(e.message); }
    refresh(); rDev(); rStat();
  };

  const changeRole = async (id, role) => {
    try { await api(`/reservations/admin/users/${id}/role`, { method: 'PATCH', token, body: { role } }); setError(''); }
    catch (e) { setError(e.message); }
    rUsers();
  };

  const [devName, setDevName] = useState('');
  const addDevice = async (e) => {
    e.preventDefault();
    try { await api('/reservations/admin/devices', { method: 'POST', token, body: { name: devName } }); setDevName(''); setError(''); }
    catch (err) { setError(err.message); }
    rDev();
  };

  const pending = (incoming || []).filter((r) => r.status === 'PENDING');
  const others = (incoming || []).filter((r) => r.status !== 'PENDING');

  const Row = ({ r, actions }) => (
    <tr>
      <td>{r.student_name}<br /><small>{r.student_email}</small></td>
      <td>{r.type === 'DEVICE' ? `🖥️ ${r.device_name}` : `👤 ${r.academic_name}`}</td>
      <td>{fmt(r.start_time)}<br />{fmt(r.end_time)}</td>
      <td>{r.note}</td>
      <td>{actions ? (
        <>
          <button className="btn" onClick={() => update(r.id, 'APPROVED')}>Onayla</button>{' '}
          <button className="btn btn-danger" onClick={() => update(r.id, 'REJECTED')}>Reddet</button>
        </>
      ) : <span className={`status ${r.status}`}>{STATUS_TR[r.status]}</span>}</td>
    </tr>
  );

  const head = <thead><tr><th>Öğrenci</th><th>Kaynak</th><th>Zaman</th><th>Not</th><th>{''}</th></tr></thead>;

  return (
    <div>
      {error && <div className="alert">{error}</div>}
      <div className="grid">
        <div className="card">
          <h2>Cihaz Kullanım Oranı (son 30 gün, %)</h2>
          {devStats?.length ? (
            <Bar
              data={{ labels: devStats.map((d) => d.name), datasets: [{ label: 'Kullanım %', data: devStats.map((d) => d.utilization), backgroundColor: '#4f46e5' }] }}
              options={{ scales: { y: { beginAtZero: true, max: 100 } } }}
            />
          ) : <p>Veri yok.</p>}
        </div>
        <div className="card">
          <h2>Randevu İstatistikleri (duruma göre)</h2>
          {statusStats ? (
            <Doughnut
              data={{
                labels: Object.keys(statusStats.totals).map((s) => STATUS_TR[s]),
                datasets: [{ data: Object.values(statusStats.totals), backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#9ca3af'] }]
              }}
            />
          ) : <p>Veri yok.</p>}
        </div>
      </div>

      <div className="card">
        <h2>Bekleyen Talepler ({pending.length})</h2>
        {pending.length ? <div className="table-wrap"><table>{head}<tbody>{pending.map((r) => <Row key={r.id} r={r} actions />)}</tbody></table></div> : <p>Bekleyen talep yok.</p>}
      </div>

      <div className="card">
        <h2>Geçmiş Talepler</h2>
        {others.length ? <div className="table-wrap"><table>{head}<tbody>{others.map((r) => <Row key={r.id} r={r} />)}</tbody></table></div> : <p>Kayıt yok.</p>}
      </div>

      {isAdmin && (
        <div className="grid">
          <div className="card">
            <h2>Kullanıcı Rolleri</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th></tr></thead>
                <tbody>
                  {(users || []).map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td><td>{u.email}</td>
                      <td>
                        <select value={u.role} disabled={u.id === user.id} onChange={(e) => changeRole(u.id, e.target.value)}>
                          <option value="STUDENT">STUDENT</option>
                          <option value="ACADEMIC">ACADEMIC</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <form className="card" onSubmit={addDevice}>
            <h2>Cihaz Ekle</h2>
            <label>Cihaz adı<input required value={devName} onChange={(e) => setDevName(e.target.value)} /></label>
            <button className="btn" type="submit">Ekle</button>
          </form>
        </div>
      )}
    </div>
  );
}
