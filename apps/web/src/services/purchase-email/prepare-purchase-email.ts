import type {
  PrepareEmailResult,
  PurchaseEmailContact,
  PurchaseEmailInput,
} from '../../types/purchase-email';
import { formatEuroCents } from '../../utilities/currency';
import { validatePurchaseEmailInput } from './purchase-email.validation';

export function preparePurchaseEmail(
  input: PurchaseEmailInput,
  contact: PurchaseEmailContact,
): PrepareEmailResult {
  const validated = validatePurchaseEmailInput(input);
  if (!validated.success) return validated;
  const data = validated.data;
  const subject = `Projet d’achat de parts — ${contact.scpiName}`;
  const body = [
    'Bonjour,',
    '',
    `Je souhaite préparer un projet d’achat de parts de la SCPI ${contact.scpiName}, en pleine propriété, à titre personnel.`,
    '',
    `Prénom : ${data.firstName}`,
    `Nom : ${data.lastName}`,
    data.associateNumber === null
      ? 'Je ne suis pas encore associé de cette SCPI.'
      : `Numéro d’associé : ${data.associateNumber}`,
    `Nombre de parts souhaité : ${new Intl.NumberFormat('fr-FR').format(data.shares)}`,
    `Prix maximum proposé par part, hors frais : ${formatEuroCents(data.maxPricePerShareCents)}`,
    '',
    'Merci de m’indiquer la procédure à suivre, les documents à fournir et les frais applicables pour préparer cet achat.',
    'Ce message est une demande d’information et ne vaut pas transmission d’un ordre d’achat.',
    '',
    'Cordialement,',
    `${data.firstName} ${data.lastName}`,
  ].join('\n');
  return {
    success: true,
    draft: {
      recipient: contact.recipient,
      subject,
      body,
      text: `À : ${contact.recipient}\nObjet : ${subject}\n\n${body}`,
    },
  };
}
