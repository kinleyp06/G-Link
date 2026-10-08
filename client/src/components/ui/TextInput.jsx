// <TextInput label="Email" type="email" error="Message" help="Hint" />
import { useId } from 'react';

export default function TextInput({ label, error, help, id, type = 'text', className = '', ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = error ? errorId : help ? helpId : undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
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
}c