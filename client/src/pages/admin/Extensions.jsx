// Approve stay extensions: if beds are free for the extra nights, check-out moves,
// extension count +1, and extra nights are billed + 5% GST.
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { Badge, Empty, Notice, Tabs, useAction, useLoad } from '../../components/ui.jsx';

export default function Extensions() {
  const [status, setStatus] = useState('Pending');
  const { data, error, reload } = useLoad(async () => (await api.get(`/admin/extensions${qs({ status })}`)).extensions, [status]);
  const act = useAction();
  const decide = async (id, what) => { if (await act.run(() => api.post(`/admin/extensions/${id}/${what}`))) reload(); };

  return (
    <>
      <div className="page-head"><div><h1>Stay extensions</h1><p>Guests asking to stay past their check-out date.</p></div></div>
      <Tabs value={status} options={['Pending', 'Approved', 'Rejected']} onChange={setStatus} />
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      {data && data.length === 0 && <Empty>No {status.toLowerCase()} extension requests.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Check-out now</th><th>New check-out</th><th>Extra nights</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.extension_id}>
                  <td>#{e.booking_id}</td>
                  <td>{e.booker_name}</td>
                  <td>{e.room_number}<div className="small muted">{e.booking_type}, {e.number_of_guests} guest(s)</div></td>
                  <td>{e.previous_check_out_date}</td>
                  <td>{e.new_check_out_date}</td>
                  <td>{e.extra_nights}</td>
                  <td><Badge value={e.extension_status} /></td>
                  <td>
                    {e.extension_status === 'Pending' && (
                      <div className="actions">
                        <button className="btn small" disabled={act.busy} onClick={() => decide(e.extension_id, 'approve')}>Approve</button>
                        <button className="btn danger small" disabled={act.busy} onClick={() => decide(e.extension_id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
