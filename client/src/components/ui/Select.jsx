// F-01 Make the look of the website (Tandin)
// <Select label="Gender" options={[{ value: 'Male', label: 'Male' }]} placeholder="Choose..." error="..." />
import { useId } from 'react';

export default function Select({ label, options = [], placeholder, error, help, id, className = '', ...rest }) {
  const autoId = useId();
  const selectId = id || autoId;
  const errorId = `${selectId}-error`;
  const helpId = `${selectId}-help`;
  const describedBy = error ? errorId : help ? helpId : undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="field__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && !error && (
        <p id={helpId} className="field__help">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
