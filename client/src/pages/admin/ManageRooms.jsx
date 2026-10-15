// Manage guest houses and rooms (room availability: Available / Occupied / Maintenance).
import { useState } from 'react';
import { api } from '../../api.js';
import { Badge, Field, Notice, useAction, useLoad } from '../../components/ui.jsx';

const newGh = { guesthouse_name: '', location: '', description: '', contact_number: '', status: 'Available' };
const newRoom = { guesthouse_id: '', room_number: '', room_type: 'Double', capacity: 3, room_status: 'Available', description: '' };

export default function ManageRooms() {
  const { data, error, reload } = useLoad(async () => {
    const [gh, rooms] = await Promise.all([api.get('/admin/guesthouses'), api.get('/admin/rooms')]);
    return { guesthouses: gh.guesthouses, rooms: rooms.rooms };
  });
  const [gh, setGh] = useState(newGh);
  const [room, setRoom] = useState(newRoom);
  const act = useAction();

  const saveGh = async (e) => {
    e.preventDefault();
    const res = await act.run(() => (gh.guesthouse_id ? api.put(`/admin/guesthouses/${gh.guesthouse_id}`, gh) : api.post('/admin/guesthouses', gh)));
    if (res) { setGh(newGh); reload(); }
  };
  const saveRoom = async (e) => {
    e.preventDefault();
    const res = await act.run(() => (room.room_id ? api.put(`/admin/rooms/${room.room_id}`, room) : api.post('/admin/rooms', room)));
    if (res) { setRoom(newRoom); reload(); }
  };
  const quickStatus = async (r, room_status) => {
    if (await act.run(() => api.put(`/admin/rooms/${r.room_id}`, { ...r, room_status }))) reload();
  };

  return (
    <>
      <div className="page-head"><div><h1>Guest houses and rooms</h1><p>Rooms are 3-bedded. Put a room in Maintenance to stop new bookings.</p></div></div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>

      <h2>Guest houses</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Location</th><th>Contact</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(data?.guesthouses || []).map((g) => (
              <tr key={g.guesthouse_id}>
                <td>{g.guesthouse_name}</td><td>{g.location}</td><td>{g.contact_number}</td><td><Badge value={g.status} /></td>
                <td><button className="btn secondary small" onClick={() => setGh({ ...g, description: g.description || '', contact_number: g.contact_number || '' })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="panel stack" onSubmit={saveGh} style={{ marginTop: '1rem' }}>
        <h3>{gh.guesthouse_id ? `Edit ${gh.guesthouse_name}` : 'Add a guest house'}</h3>
        <div className="row">
          <Field label="Name"><input required maxLength={50} value={gh.guesthouse_name} onChange={(e) => setGh({ ...gh, guesthouse_name: e.target.value })} /></Field>
          <Field label="Location"><input required maxLength={50} value={gh.location} onChange={(e) => setGh({ ...gh, location: e.target.value })} /></Field>
          <Field label="Contact number"><input maxLength={20} value={gh.contact_number} onChange={(e) => setGh({ ...gh, contact_number: e.target.value })} /></Field>
          <Field label="Status">
            <select value={gh.status} onChange={(e) => setGh({ ...gh, status: e.target.value })}><option>Available</option><option>Closed</option><option>Maintenance</option></select>
          </Field>
        </div>
        <Field label="Description"><textarea rows={2} value={gh.description} onChange={(e) => setGh({ ...gh, description: e.target.value })} /></Field>
        <div className="actions">
          <button className="btn" disabled={act.busy}>{gh.guesthouse_id ? 'Save guest house' : 'Add guest house'}</button>
          {gh.guesthouse_id && <button type="button" className="btn secondary" onClick={() => setGh(newGh)}>Cancel edit</button>}
        </div>
      </form>

      <h2>Rooms</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Guest house</th><th>Room</th><th>Type</th><th>Beds</th><th>Status</th><th>Set status</th><th></th></tr></thead>
          <tbody>
            {(data?.rooms || []).map((r) => (
              <tr key={r.room_id}>
                <td>{r.guesthouse_name}</td><td>{r.room_number}</td><td>{r.room_type}</td><td>{r.capacity}</td>
                <td><Badge value={r.room_status} /></td>
                <td>
                  <select value={r.room_status} onChange={(e) => quickStatus(r, e.target.value)} aria-label={`Status of room ${r.room_number}`}>
                    <option>Available</option><option>Occupied</option><option>Maintenance</option>
                  </select>
                </td>
                <td><button className="btn secondary small" onClick={() => setRoom({ ...r, description: r.description || '' })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="panel stack" onSubmit={saveRoom} style={{ marginTop: '1rem' }}>
        <h3>{room.room_id ? `Edit room ${room.room_number}` : 'Add a room'}</h3>
        <div className="row">
          <Field label="Guest house">
            <select required value={room.guesthouse_id} onChange={(e) => setRoom({ ...room, guesthouse_id: e.target.value })}>
              <option value="">Choose</option>
              {(data?.guesthouses || []).map((g) => <option key={g.guesthouse_id} value={g.guesthouse_id}>{g.guesthouse_name}</option>)}
            </select>
          </Field>
          <Field label="Room number"><input required maxLength={10} value={room.room_number} onChange={(e) => setRoom({ ...room, room_number: e.target.value })} /></Field>
          <Field label="Room type">
            <select value={room.room_type} onChange={(e) => setRoom({ ...room, room_type: e.target.value })}><option>Single</option><option>Double</option><option>Suite</option></select>
          </Field>
          <Field label="Beds"><input type="number" min={1} max={10} required value={room.capacity} onChange={(e) => setRoom({ ...room, capacity: e.target.value })} /></Field>
          <Field label="Status">
            <select value={room.room_status} onChange={(e) => setRoom({ ...room, room_status: e.target.value })}><option>Available</option><option>Occupied</option><option>Maintenance</option></select>
          </Field>
        </div>
        <Field label="Description"><textarea rows={2} value={room.description} onChange={(e) => setRoom({ ...room, description: e.target.value })} /></Field>
        <div className="actions">
          <button className="btn" disabled={act.busy}>{room.room_id ? 'Save room' : 'Add room'}</button>
          {room.room_id && <button type="button" className="btn secondary" onClick={() => setRoom(newRoom)}>Cancel edit</button>}
        </div>
      </form>
    </>
  );
}
