// Payments: the bill for each room or hall booking and whether it was paid.
// There is no online payment; the admin marks a bill as paid when the money is received.
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { Badge, Empty, Notice, Tabs, money, useAction, useLoad } from '../../components/ui.jsx';

export default function Payments() {
  const [status, setStatus] = useState('Unpaid');
  const { data, error, reload } = useLoad(async () => (await api.get(`/admin/payments${qs({ status })}`)).payments, [status]);
  const act = useAction();
  const mark = async (id, what) => { if (await act.run(() => api.post(`/admin/payments/${id}/${what}`))) reload(); };

  return (
    <>
      <div className="page-head"><div><h1>Payments</h1><p>Bills are created when a booking, extension or hall booking is approved.</p></div></div>
      <Tabs value={status} options={['Unpaid', 'Paid', '']} onChange={setStatus} />
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      {data && data.length === 0 && <Empty>No bills here.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bill</th><th>For</th><th>Payer</th><th className="right">Subtotal</th><th className="right">GST</th><th className="right">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.payment_id}>
                  <td>#{p.payment_id}<div className="small muted">{p.description}</div></td>
                  <td>{p.booking_id ? `Room ${p.room_number} (booking #${p.booking_id})` : `${p.hall_name} (hall #${p.hall_booking_id})`}</td>
                  <td>{p.payer_name}</td>
                  <td className="right">{money(p.subtotal)}</td>
                  <td className="right">{money(p.gst_amount)}</td>
                  <td className="right"><strong>{money(p.total_amount)}</strong></td>
                  <td><Badge value={p.payment_status} />{p.paid_at && <div className="small muted">{p.paid_at}</div>}</td>
                  <td>
                    {p.payment_status === 'Unpaid'
                      ? <button className="btn small" disabled={act.busy} onClick={() => mark(p.payment_id, 'paid')}>Mark paid</button>
                      : <button className="btn secondary small" disabled={act.busy} onClick={() => mark(p.payment_id, 'unpaid')}>Undo</button>}
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
