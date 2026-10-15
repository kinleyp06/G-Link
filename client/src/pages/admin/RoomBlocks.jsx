// Block rooms or beds for VIP / official guests. No booking is made; only the block is recorded
// (room number, dates, reason, who blocked it).
import { useState } from 'react';
import { api } from '../../api.js';
import { Empty, Field, Notice, addDaysStr, todayStr, useAction, useLoad } from '../../components/ui.jsx';

export default function RoomBlocks() {
  const { data, error, reload } = useLoad(async () => {
    const [rooms, blocks] = await Promise.all([api.get('/admin/rooms'), api.get('/admin/blocks')]);
    return { rooms: rooms.rooms, blocks: blocks.blocks };
  });
  const [form, setForm] = useState({ room_id: '', beds_blocked: 3, start_date: todayStr(), end_date: addDaysStr(todayStr(), 1), reason: 'VIP/official reservation' });
  const act = useAction();

  const save = async (e) => {
    e.preventDefault();
    if (await act.run(() => api.post('/admin/blocks', form))) reload();
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this block? The beds become bookable again.')) return;
    if (await act.run(() => api.del(`/admin/blocks/${id}`))) reload();
  };

  return (
    <>
      <div className="page-head"><div><h1>Room blocks</h1><p>For VIP or official guests: block beds so nobody else can book them.</p></div></div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      <form className="panel stack" onSubmit={save}>
        <div className="row">
          <Field label="Room">
            <select required value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
              <option value="">Choose a room</option>
              {(data?.rooms || []).map((r) => <option key={r.room_id} value={r.room_id}>{r.guesthouse_name} - Room {r.room_number}</option>)}
            </select>
          </Field>
          <Field label="Beds to block" hint="3 = whole room">
            <input type="number" min={1} max={3} required value={form.beds_blocked} onChange={(e) => setForm({ ...form, beds_blocked: e.target.value })} />
          </Field>
          <Field label="From"><input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="Until (like a check-out date)"><input type="date" required min={addDaysStr(form.start_date, 1)} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        </div>
        <Field label="Reason"><input required maxLength={100} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <div><button className="btn" disabled={act.busy}>Block beds</button></div>
      </form>

      <h2>Current and upcoming blocks</h2>
      {data?.blocks.length === 0 && <Empty>No rooms are blocked.</Empty>}
      {data?.blocks.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Room</th><th>Beds</th><th>Dates</th><th>Reason</th><th>Blocked by</th><th></th></tr></thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr key={b.block_id}>
                  <td>{b.room_number}<div className="small muted">{b.guesthouse_name}</div></td>
                  <td>{b.beds_blocked}</td>
                  <td>{b.start_date} to {b.end_date}</td>
                  <td>{b.reason}</td>
                  <td>{b.blocked_by_name}<div className="small muted">{b.created_at}</div></td>
                  <td><button className="btn danger small" onClick={() => remove(b.block_id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
