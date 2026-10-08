// F-01 Make the look of the website (Tandin)
// Same as TextInput, with a Show / Hide button.
import { useId, useState } from 'react';

export default function PasswordInput({ label = 'Password', error, help, id, className = '', ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const describedBy = error ? errorId : help ? helpId : undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoComplete="current-password"
          {...rest}
        />
        <button
          type="button"
          className="field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
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
