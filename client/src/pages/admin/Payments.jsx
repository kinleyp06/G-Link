// Payments: the bill for each room or hall booking, whether it was paid, and how.
// G-Link takes no money itself. When the guest pays (online payment such as mBOB, or cash),
// the admin marks the bill paid and chooses the payment method. Room bills are also settled at check-out.
import { useState } from 'react';
import { api, qs } from '../../api.js';
import { Badge, Empty, Notice, PaymentMethodSelect, Tabs, money, useAction, useLoad } from '../../components/ui.jsx';

export default function Payments() {
  const [status, setStatus] = useState('Unpaid');
  const { data, error, reload } = useLoad(async () => (await api.get(`/admin/payments${qs({ status })}`)).payments, [status]);
  const act = useAction();
  const [methods, setMethods] = useState({}); // payment_id -> chosen payment method
  const mark = async (id, what, body) => { if (await act.run(() => api.post(`/admin/payments/${id}/${what}`, body))) reload(); };

  return (
    <>
      <div className="page-head"><div><h1>Payments</h1><p>Bills are created when a booking, extension or hall booking is approved. Room bills are usually paid at check-out.</p></div></div>
      <Tabs value={status} options={['Unpaid', 'Paid', '']} onChange={setStatus} />
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      {data && data.length === 0 && <Empty>No bills here.</Empty>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bill</th><th>For</th><th>Payer</th><th className="right">Subtotal</th><th className="right">GST</th><th className="right">Total</th><th>Status</th><th>Paid by</th><th></th></tr></thead>
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
                    {p.payment_status === 'Paid'
                      ? (p.payment_method || <span className="muted small">Not recorded</span>)
                      : <PaymentMethodSelect id={`method-${p.payment_id}`} value={methods[p.payment_id] || ''} onChange={(m) => setMethods({ ...methods, [p.payment_id]: m })} />}
                  </td>
                  <td>
                    {p.payment_status === 'Unpaid'
                      ? <button className="btn small" disabled={act.busy || !methods[p.payment_id]} title={methods[p.payment_id] ? '' : 'Choose the payment method first'} onClick={() => mark(p.payment_id, 'paid', { payment_method: methods[p.payment_id] })}>Mark paid</button>
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
