// F-01 Make the look of the website (Tandin)
// <DatePicker label="Check-in" value="2026-10-20" min="2026-10-07" onChange={...} error="..." />
// Dates are text in the form YYYY-MM-DD, the same form the backend and database use.
import TextInput from './TextInput.jsx';

export default function DatePicker(props) {
  return <TextInput {...props} type="date" />;
}
