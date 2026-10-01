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
