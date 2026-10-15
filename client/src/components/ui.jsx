// Small shared pieces used by many pages.
import { useCallback, useEffect, useState } from 'react';

export function Notice({ type = 'info', children }) {
  if (!children) return null;
  return <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Badge({ value }) {
  return <span className={`badge ${String(value).replace(/\s|\//g, '')}`}>{value}</span>;
}

export function money(n) {
  if (n === null || n === undefined || n === '') return 'Not set';
  return `Nu. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Room number shaped like a guest house key tag.
export function KeyTag({ number, closed }) {
  return <div className={`keytag ${closed ? 'closed' : ''}`} aria-hidden="true">{number}</div>;
}

// One small bed icon per bed: filled = taken, outline = free.
export function BedPips({ capacity, free }) {
  return (
    <div className="beds" aria-label={`${free} of ${capacity} beds free`}>
      {Array.from({ length: capacity }, (_, i) => (
        <span key={i} className={`bed ${i < capacity - free ? 'taken' : ''}`} />
      ))}
    </div>
  );
}

// A bill: each line, the subtotal, GST on its own line, and the total.
export function BillBox({ bill }) {
  if (!bill) return null;
  return (
    <div className="bill">
      {bill.lines.map((l, i) => (
        <div className="bill-line" key={i}>
          <span>
            {l.label}
            <span className="muted small"> | {money(l.rate)} x {l.nights ?? l.days} {l.nights !== undefined ? 'night(s)' : 'day(s)'}</span>
          </span>
          <span>{money(l.amount)}</span>
        </div>
      ))}
      <div className="bill-line"><span>Subtotal</span><span>{money(bill.subtotal)}</span></div>
      <div className="bill-line"><span>GST ({bill.gst_percent}%)</span><span>{money(bill.gst_amount)}</span></div>
      <div className="bill-line total"><span>Total to pay</span><span>{money(bill.total_amount)}</span></div>
    </div>
  );
}

export function Tabs({ value, options, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={value === o} className={value === o ? 'active' : ''} onClick={() => onChange(o)}>
          {o || 'All'}
        </button>
      ))}
    </div>
  );
}

// Loads data when the page opens (and when deps change). Gives { data, error, loading, reload }.
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ data: await load(), error: '', loading: false });
    } catch (err) {
      setState({ data: null, error: err.message, loading: false });
    }
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

// Runs a button action and stores its success or error message.
export function useAction() {
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const run = async (fn, successText) => {
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const result = await fn();
      setMsg({ type: 'success', text: successText || result?.message || 'Done.' });
      return result;
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { msg, setMsg, busy, run };
}

export const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const addDaysStr = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const nightsBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
