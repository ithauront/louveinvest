import { type FormEvent, useEffect, useRef } from 'react';

import type { PurchaseEmailErrors, PurchaseEmailInput } from '../../../types/purchase-email';

interface Props {
  values: PurchaseEmailInput;
  errors: PurchaseEmailErrors;
  onChange: (next: PurchaseEmailInput) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function PurchaseEmailForm({ values, errors, onChange, onSubmit, onClear }: Props) {
  const summary = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors);
  useEffect(() => {
    if (Object.keys(errors).length) summary.current?.focus();
  }, [errors]);

  function field(
    name: Exclude<keyof PurchaseEmailInput, 'existingAssociate'>,
    label: string,
    options: {
      autoComplete?: string;
      inputMode?: 'decimal' | 'numeric';
      hint?: string;
      maxLength?: number;
    } = {},
  ) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        {options.hint && (
          <p id={`${name}-hint`} className="field-hint">
            {options.hint}
          </p>
        )}
        <input
          id={name}
          name={name}
          type="text"
          required
          value={values[name]}
          autoComplete={options.autoComplete ?? 'off'}
          inputMode={options.inputMode}
          maxLength={options.maxLength}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={
            [options.hint ? `${name}-hint` : '', errors[name] ? `${name}-error` : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(event) => onChange({ ...values, [name]: event.target.value })}
        />
        {errors[name] && (
          <p className="field-error" id={`${name}-error`}>
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>Votre projet d’achat</h2>
      <p className="muted">
        Tous les champs affichés sont obligatoires, sauf la case « déjà associé ».
      </p>
      {entries.length > 0 && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={summary}>
          <p>Vérifiez les informations suivantes :</p>
          <ul>
            {entries.map(([name, message]) => (
              <li key={name}>
                <a href={`#${name}`}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <fieldset>
        <legend>Vos coordonnées</legend>
        <div className="field-grid">
          {field('firstName', 'Prénom', { autoComplete: 'given-name', maxLength: 100 })}
          {field('lastName', 'Nom', { autoComplete: 'family-name', maxLength: 100 })}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={values.existingAssociate}
            onChange={(event) =>
              onChange({ ...values, existingAssociate: event.target.checked, associateNumber: '' })
            }
          />
          Je suis déjà associé de Primopierre
        </label>
        {values.existingAssociate &&
          field('associateNumber', 'Numéro d’associé', { maxLength: 80 })}
      </fieldset>
      <fieldset>
        <legend>Votre achat souhaité</legend>
        <div className="field-grid">
          {field('shares', 'Nombre de parts souhaité', {
            inputMode: 'numeric',
            maxLength: 16,
            hint: 'Un nombre entier supérieur à zéro.',
          })}
          {field('maxPricePerShare', 'Prix maximum par part, hors frais (€)', {
            inputMode: 'decimal',
            maxLength: 30,
            hint: 'Votre prix proposé, par exemple 31,88. Ce n’est pas une estimation de confrontation.',
          })}
        </div>
      </fieldset>
      <div className="actions">
        <button type="submit" className="primary">
          Préparer mon email <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="secondary" onClick={onClear}>
          Effacer les informations
        </button>
      </div>
    </form>
  );
}
