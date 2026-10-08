// F-01 Make the look of the website (Tandin)
// One page that shows every ready-made part. Open it with `npm run dev`.
// Both frontend people should look at it before building pages.
import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import TextInput from '../../components/ui/TextInput.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Select from '../../components/ui/Select.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Table from '../../components/ui/Table.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

const COLOURS = [
  ['Primary', '--color-primary', '#2e4a7a'],
  ['Primary soft', '--color-primary-soft', '#e3ebf6'],
  ['Success', '--color-success', '#1e7b34'],
  ['Danger', '--color-danger', '#b03a3a'],
  ['Warning', '--color-warning', '#b45309'],
  ['Info', '--color-info', '#3b5b92'],
  ['Text', '--color-text', '#1a1a1a'],
  ['Muted', '--color-muted', '#666666'],
  ['Border', '--color-border', '#c8ceda'],
  ['Background', '--color-bg', '#f5f7fb'],
];

const SAMPLE_COLUMNS = [
  { key: 'id', header: 'Booking ID' },
  { key: 'room', header: 'Room' },
  { key: 'dates', header: 'Dates' },
  { key: 'status', header: 'Status', render: (row) => <strong style={{ color: `var(--status-${row.status.toLowerCase()})` }}>{row.status}</strong> },
];
const SAMPLE_ROWS = [
  { id: 'BK-101', room: '101', dates: '20 Oct - 22 Oct', status: 'Pending' },
  { id: 'BK-102', room: '203', dates: '25 Oct - 26 Oct', status: 'Approved' },
  { id: 'BK-103', room: '104', dates: '1 Nov - 3 Nov', status: 'Rejected' },
];

export default function StyleGuide() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fakeSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Saved');
    }, 1200);
  };

  return (
    <main className="container">
      <h1>G-Link style guide</h1>
      <p>Every ready-made part of the website, on one page. Build pages from these, not from scratch.</p>

      <section className="section">
        <h2>Colours</h2>
        <div className="swatches">
          {COLOURS.map(([name, variable, hex]) => (
            <div className="swatch" key={variable}>
              <div className="swatch__color" style={{ background: `var(${variable})` }} />
              <strong>{name}</strong>
              <br />
              <code>{variable}</code>
              <br />
              <code>{hex}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Text</h2>
        <h1>Heading 1 (2rem)</h1>
        <h2>Heading 2 (1.625rem)</h2>
        <h3>Heading 3 (1.25rem)</h3>
        <p>Body text (1rem). The font is the computer's own system font, so nothing has to be downloaded.</p>
      </section>

      <section className="section">
        <h2>Buttons</h2>
        <div className="row">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading={loading} onClick={fakeSave}>
            {loading ? 'Saving' : 'Click: loading'}
          </Button>
        </div>
      </section>

      <section className="section">
        <h2>Form parts</h2>
        <div className="row">
          <TextInput label="Email" type="email" placeholder="you@rub.edu.bt" help="Use your official RUB email." />
          <TextInput label="Phone number" error="Phone number must be 8 digits" defaultValue="123" />
        </div>
        <div className="row">
          <PasswordInput label="Password" help="At least 8 characters." />
          <PasswordInput label="Confirm password" error="Passwords do not match" defaultValue="abc" />
        </div>
        <div className="row">
          <Select
            label="Gender"
            placeholder="Choose..."
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <DatePicker label="Check-in date" />
          <DatePicker label="Check-out date" error="Check-out must be after check-in" />
        </div>
      </section>

      <section className="section">
        <h2>Table</h2>
        <Table columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} />
        <br />
        <Table columns={SAMPLE_COLUMNS} rows={[]} emptyMessage="No bookings yet" />
      </section>

      <section className="section">
        <h2>Pop-up and short messages</h2>
        <div className="row">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open pop-up
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Profile saved')}>
            Success message
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Wrong email or password')}>
            Error message
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Check your email')}>
            Info message
          </Button>
        </div>
      </section>

      <Modal
        open={modalOpen}
        title="Are you sure?"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast.success('Done');
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        This is the pop-up. Press Escape or click the dark area to close it.
      </Modal>
    </main>
  );
}
