import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../App.jsx';
import { api, fmt, STATUS_TR } from '../api.js';
import useLiveData from '../useLiveData.js';

const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function StudentDashboard() {
  const { token } = useAuth();
  const [type, setType] = useState('APPOINTMENT');
  const [resourceId, setResourceId] = useState('');
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() + 3600000)));
  const [end, setEnd] = useState(toLocalInput(new Date(Date.now() + 2 * 3600000)));
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState({ kind: '', text: '' });

  const fetchResources = useCallback(() => api('/reservations/resources', { token }), [token]);
  const fetchMine = useCallback(() => api('/reservations/mine', { token }), [token]);
  const { data: resources } = useLiveData(fetchResources, 30000);
  const { data: mine, refresh } = useLiveData(fetchMine, 5000);

  const fetchBusy = useCallback(
    () => (resourceId ? api(`/reservations/busy?type=${type}&resourceId=${resourceId}`, { token }) : Promise.resolve([])),
    [token, type, resourceId]
  );
  const { data: busy, refresh: refreshBusy } = useLiveData(fetchBusy, 5000);

  const options = type === 'DEVICE' ? resources?.devices : resources?.academics;
  useEffect(() => { setResourceId(''); }, [type]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api('/reservations', {
        method: 'POST', token,
        body: { type, resourceId: Number(resourceId), startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), note }
      });
      setMsg({ kind: 'ok', text: 'Talep oluşturuldu, onay bekleniyor.' });
      setNote('');
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    }
    refresh(); refreshBusy();
  };

  const cancel = async (id) => {
    try { await api(`/reservations/${id}/cancel`, { method: 'PATCH', token }); } catch (err) { setMsg({ kind: 'err', text: err.message }); }
    refresh(); refreshBusy();
  };

  return (
    <div className="grid">
      <form className="card" onSubmit={submit}>
        <h2>Yeni Rezervasyon</h2>
        {msg.text && <div className={msg.kind === 'ok' ? 'alert ok' : 'alert'}>{msg.text}</div>}
        <label>Tür
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="APPOINTMENT">Akademisyen Randevusu</option>
            <option value="DEVICE">Lab Cihazı</option>
          </select>
        </label>
        <label>{type === 'DEVICE' ? 'Cihaz' : 'Akademisyen'}
          <select required value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">Seçiniz…</option>
            {(options || []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}{o.department ? ` — ${o.department}` : ''}{o.location ? ` (${o.location})` : ''}</option>
            ))}
          </select>
        </label>
        <label>Başlangıç
          <input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>Bitiş
          <input type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>Not
          <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="btn" type="submit">Talep Gönder</button>
        {resourceId && (
          <div className="busy">
            <strong>Dolu zaman aralıkları:</strong>
            {busy && busy.length ? (
              <ul>{busy.map((b, i) => <li key={i}>{fmt(b.start_time)} → {fmt(b.end_time)}</li>)}</ul>
            ) : <p>Önümüzdeki dönemde dolu aralık yok.</p>}
          </div>
        )}
      </form>

      <div className="card">
        <h2>Rezervasyonlarım</h2>
        {!mine?.length ? <p>Henüz rezervasyonunuz yok.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kaynak</th><th>Zaman</th><th>Durum</th><th></th></tr></thead>
              <tbody>
                {mine.map((r) => (
                  <tr key={r.id}>
                    <td>{r.type === 'DEVICE' ? `🖥️ ${r.device_name}` : `👤 ${r.academic_name}`}</td>
                    <td>{fmt(r.start_time)}<br />{fmt(r.end_time)}</td>
                    <td><span className={`status ${r.status}`}>{STATUS_TR[r.status]}</span></td>
                    <td>{['PENDING', 'APPROVED'].includes(r.status) && <button className="btn btn-outline" onClick={() => cancel(r.id)}>İptal</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
