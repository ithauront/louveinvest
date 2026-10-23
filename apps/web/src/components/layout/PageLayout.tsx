import type { ReactNode } from 'react';

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <div className="site-ribbon">
        <span>SCPI</span> Un regard clair sur le marché secondaire.
      </div>
      <header className="site-header">
        <div className="header-inner">
          <a href="#main" className="brand" aria-label="Louve Invest — accueil">
            <img
              src={`${import.meta.env.BASE_URL}brand/louve-invest.svg`}
              alt="Louve Invest"
              width="217"
              height="36"
            />
          </a>
          <span className="header-context">Marché secondaire des SCPI</span>
          <a href="#purchase-email" className="header-action">
            Mon projet d’achat <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">
              louve<span>invest</span>
              <span className="footer-arrow" aria-hidden="true">
                ↗
              </span>
            </p>
            <p>Observer. Comparer. Préparer.</p>
          </div>
          <div>
            <p className="footer-label">Marché secondaire · Primopierre</p>
            <p>Préparation uniquement · Aucun envoi d’email ni transmission d’ordre</p>
          </div>
        </div>
      </footer>
    </>
  );
}
