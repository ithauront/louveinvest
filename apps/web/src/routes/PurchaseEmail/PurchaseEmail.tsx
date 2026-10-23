import { primopierreEmailContact } from '../../constants/primopierre-email';
import { PurchaseEmailForm } from './components/PurchaseEmailForm';
import { PurchaseEmailPreview } from './components/PurchaseEmailPreview';
import { usePurchaseEmail } from './hooks/usePurchaseEmail';

export function PurchaseEmailPage() {
  const { values, errors, draft, container, setValues, prepare, clear, edit } = usePurchaseEmail();
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">Préparer votre achat</p>
        <h2 className="page-title">Votre projet, prêt à être partagé.</h2>
        <p>
          Rassemblez les informations de votre achat de parts Primopierre dans un email à relire et
          à récupérer.
        </p>
      </div>
      <div className="purchase-layout" ref={container}>
        <aside className="project-context" aria-label="Informations sur le projet">
          <p className="eyebrow">SCPI · Marché secondaire</p>
          <h2>Primopierre</h2>
          <p>{primopierreEmailContact.managerName}</p>
          <ol className="steps">
            <li aria-current={!draft ? 'step' : undefined}>Renseigner votre projet</li>
            <li aria-current={draft ? 'step' : undefined}>Relire le brouillon</li>
            <li>Copier ou télécharger</li>
          </ol>
          <p>Un projet de préparation d’achat, en pleine propriété, pour un particulier.</p>
          <p className="muted">
            Vos informations restent dans cette page, sans enregistrement par l’application. Vous
            pouvez les effacer à tout moment.
          </p>
          <a href={primopierreEmailContact.sourceUrl} target="_blank" rel="noreferrer">
            Contact de la société de gestion · mandat officiel, p.{' '}
            {primopierreEmailContact.sourcePage}
          </a>
        </aside>
        <div className="purchase-card">
          {draft ? (
            <PurchaseEmailPreview
              draft={draft}
              filename={primopierreEmailContact.downloadFilename}
              onEdit={edit}
              onClear={clear}
            />
          ) : (
            <PurchaseEmailForm
              values={values}
              errors={errors}
              onChange={setValues}
              onSubmit={prepare}
              onClear={clear}
            />
          )}
        </div>
      </div>
    </>
  );
}
