import { Badge } from '@/components/ui';

const LABEL: Record<string, [string, 'gray' | 'amber' | 'green' | 'red']> = {
  DRAFT: ['Brouillon', 'gray'], ORDERED: ['Commandée', 'amber'], RECEIVED: ['Reçue', 'green'], CANCELLED: ['Annulée', 'red'],
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={LABEL[status][1]}>{LABEL[status][0]}</Badge>;
export const ref = (id: number) => `PO-${String(id).padStart(5, '0')}`;
