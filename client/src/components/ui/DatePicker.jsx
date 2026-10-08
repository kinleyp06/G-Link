// <DatePicker label="Check-in" min="2026-10-20" error="..." />
// Dates are text in the form YYYY-MM-DD, the same form the backend and database use.
import TextInput from './TextInput.jsx';

export default function DatePicker(props) {
  return <TextInput {...props} type="date" />;
}