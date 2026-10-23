import type { PurchaseEmailContact } from '../types/purchase-email';

/** Customer service contact verified in the official mandate; not an order submission API. */
export const primopierreEmailContact = {
  scpiName: 'Primopierre',
  managerName: 'Praemia REIM France',
  recipient: 'serviceclients@praemiareim.com',
  sourceUrl:
    "https://www.praemiareim.fr/documents/14836074/1099398036/PRIMOPIERRE%20-%20Mandat%20d'achat%20-%20Personne%20Physique/dc631e45-bbdd-40fa-23b6-9d52b2160104",
  sourcePage: 6,
  downloadFilename: 'projet-achat-primopierre.txt',
} satisfies PurchaseEmailContact & {
  sourceUrl: string;
  sourcePage: number;
  downloadFilename: string;
};
