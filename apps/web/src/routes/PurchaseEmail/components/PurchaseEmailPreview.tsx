import { useEffect, useRef, useState } from 'react';

import { copyDraft, downloadDraft } from '../../../services/purchase-email/draft-export';
import type { PurchaseEmailDraft } from '../../../types/purchase-email';

interface Props {
  draft: PurchaseEmailDraft;
  filename: string;
  onEdit: () => void;
  onClear: () => void;
}

export function PurchaseEmailPreview({ draft, filename, onEdit, onClear }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);

  async function copy() {
    if (copying) return;
    setCopying(true);
    setFeedback(null);
    try {
      await copyDraft(draft.text);
      setFeedback({ error: false, text: 'Email copié dans le presse-papiers.' });
    } catch {
      text.current?.focus();
      text.current?.select();
      setFeedback({
        error: true,
        text: 'La copie automatique est indisponible. Le texte est sélectionné : copiez-le manuellement ou téléchargez-le.',
      });
    } finally {
      setCopying(false);
    }
  }

  function download() {
    try {
      downloadDraft(draft.text, filename);
      setFeedback({ error: false, text: 'Téléchargement du brouillon demandé.' });
    } catch {
      setFeedback({
        error: true,
        text: 'Le téléchargement a échoué. Vous pouvez copier le texte du brouillon.',
      });
    }
  }

  return (
    <section aria-labelledby="preview-title">
      <h2 id="preview-title" tabIndex={-1} ref={title}>
        Votre email est prêt à relire
      </h2>
      <p className="muted">
        Vérifiez le destinataire, vos coordonnées, le nombre de parts et le prix hors frais avant de
        récupérer le texte.
      </p>
      <dl className="draft-summary">
        <dt>À</dt>
        <dd>{draft.recipient}</dd>
        <dt>Objet</dt>
        <dd>{draft.subject}</dd>
      </dl>
      <label htmlFor="draft-text">Texte complet de l’email</label>
      <textarea
        id="draft-text"
        ref={text}
        readOnly
        value={draft.text}
        rows={20}
        spellCheck={false}
      />
      <p className="draft-notice">
        Aucun email n’a été envoyé. Ce brouillon ne transmet pas d’ordre d’achat.
      </p>
      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={feedback.error ? 'field-error' : 'success-message'}
        >
          {feedback.text}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="primary"
          aria-disabled={copying}
          onClick={() => {
            void copy();
          }}
        >
          {copying ? 'Copie en cours…' : 'Copier l’email'}
        </button>
        <button type="button" className="secondary" onClick={download}>
          Télécharger le texte (.txt)
        </button>
        <button type="button" className="secondary" onClick={onEdit}>
          Modifier les informations
        </button>
        <button type="button" className="text-button" onClick={onClear}>
          Effacer et recommencer
        </button>
      </div>
    </section>
  );
}
