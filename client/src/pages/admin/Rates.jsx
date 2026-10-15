// Edit the rate table (rates per night before GST, and GST %).
// International stays empty until the administration sets it; then it appears on the booking form.
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Notice, useAction, useLoad } from '../../components/ui.jsx';

export default function Rates() {
  const { data, error, reload } = useLoad(async () => (await api.get('/admin/rates')).rates);
  const [rows, setRows] = useState([]);
  const act = useAction();
  useEffect(() => { if (data) setRows(data.map((r) => ({ ...r, rate: r.rate ?? '' }))); }, [data]);

  const setRow = (id, patch) => setRows(rows.map((r) => (r.rate_id === id ? { ...r, ...patch } : r)));
  const save = async (r) => {
    if (await act.run(() => api.put(`/admin/rates/${r.rate_id}`, { rate: r.rate, gst_percent: r.gst_percent }))) reload();
  };

  return (
    <>
      <div className="page-head"><div><h1>Rates</h1><p>Picked automatically from the guest category. Total = rate x beds x nights + GST.</p></div></div>
      <Notice type={act.msg.type}>{act.msg.text}</Notice>
      <Notice type="error">{error}</Notice>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Guest category</th><th>Charge type</th><th>Rate per night (Nu.)</th><th>GST %</th><th>Last change</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rate_id}>
                <td>{r.guest_category}</td>
                <td>{r.charge_type}</td>
                <td><input type="number" min={0} step="0.01" placeholder="Not set" value={r.rate} onChange={(e) => setRow(r.rate_id, { rate: e.target.value })} aria-label={`${r.guest_category} ${r.charge_type} rate`} /></td>
                <td><input type="number" min={0} max={99.99} step="0.01" value={r.gst_percent} onChange={(e) => setRow(r.rate_id, { gst_percent: e.target.value })} aria-label="GST percent" /></td>
                <td className="small muted">{r.updated_by_name ? `${r.updated_by_name}, ` : ''}{r.updated_at}</td>
                <td><button className="btn secondary small" disabled={act.busy} onClick={() => save(r)}>Save</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
