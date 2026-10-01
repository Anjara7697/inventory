/** Labels of stock movement types, as shown to users. */
export const MOVE_LABEL: Record<string, string> = {
  ENTRY: 'Entrée', EXIT: 'Sortie', PRODUCTION: 'Production', LOSS: 'Perte', RETURN: 'Retour', ADJUSTMENT: 'Ajustement',
};

/** Badge tone per movement type: green = stock comes in, red = loss, amber = correction, blue = goes out. */
export const MOVE_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray'> = {
  ENTRY: 'green', RETURN: 'green', EXIT: 'blue', PRODUCTION: 'blue', LOSS: 'red', ADJUSTMENT: 'amber',
};

/** "14:05" today, "Hier", else "27 sept." */
export function relativeDay(iso: string | null | undefined, todayAsTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return todayAsTime ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "Aujourd'hui";
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** "1 oct., 10:42" */
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Production reference, same format as the backend (stock movements carry it). */
export const productionRef = (id: number) => `PROD-${String(id).padStart(5, '0')}`;

/** Purchase order statuses: label and badge tone. */
export const PURCHASE_STATUS: Record<string, [string, 'gray' | 'amber' | 'green' | 'red']> = {
  DRAFT: ['Brouillon', 'gray'], ORDERED: ['Commandée', 'amber'], RECEIVED: ['Reçue', 'green'], CANCELLED: ['Annulée', 'red'],
};
export const purchaseRef = (id: number) => `PO-${String(id).padStart(5, '0')}`;

/** Total of the priced lines of a purchase order (lines without price count 0). */
export const orderTotal = (o: { lines: { unitPrice?: string | number | null; quantity: string | number }[] }) =>
  o.lines.reduce((t, l) => t + (l.unitPrice == null ? 0 : Number(l.unitPrice) * Number(l.quantity)), 0);

/** "29 sept." */
export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';

/** User roles as shown to people, with what each one can do. */
export const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrateur', MANAGER: 'Responsable', OPERATOR: 'Opérateur', VIEWER: 'Lecture seule' };
export const ROLE_HELP: [string, string][] = [
  ['ADMIN', 'Tout, y compris la gestion des utilisateurs.'],
  ['MANAGER', 'Référentiel, achats, rapports, ajustements de stock.'],
  ['OPERATOR', 'Mouvements de stock, production, réceptions.'],
  ['VIEWER', 'Consulte tout, ne modifie rien.'],
];
export const initials = (u: { firstName?: string; lastName?: string }) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
