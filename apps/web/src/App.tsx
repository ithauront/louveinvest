import { PageLayout } from './components/layout/PageLayout';
import { MarketPage } from './routes/Market/Market';
import { PurchaseEmailPage } from './routes/PurchaseEmail/PurchaseEmail';

export function App() {
  return (
    <PageLayout>
      <nav className="page-navigation" aria-label="Parcours d’achat">
        <a href="#market">Consulter le marché</a>
        <a href="#purchase-email">Préparer un email</a>
      </nav>
      <MarketPage />
      <section id="purchase-email" aria-label="Préparation de l’email">
        <PurchaseEmailPage />
      </section>
    </PageLayout>
  );
}
