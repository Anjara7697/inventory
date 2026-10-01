/** Stock state with the three fixed names of the design system: En stock, Stock faible, Rupture. */
export function stockState(quantity: number, minimum: number): { tone: 'green' | 'amber' | 'red'; label: string } {
  if (quantity <= 0) return { tone: 'red', label: 'Rupture' };
  if (minimum > 0 && quantity <= minimum) return { tone: 'amber', label: 'Stock faible' };
  return { tone: 'green', label: 'En stock' };
}

/** Converts a quantity between two units of the same category (conversionFactor = value in the base unit). */
export const convert = (qty: number, from: { conversionFactor: string | number }, to: { conversionFactor: string | number }) =>
  (qty * Number(from.conversionFactor)) / Number(to.conversionFactor);

/** Material cost of one finished product from its bill of materials (material.unitCost is per material unit). */
export const bomUnitCost = (lines: { quantity: string | number; unit: any; material: { unitCost: string | number; unit: any } }[]) =>
  lines.reduce((sum, l) => sum + convert(Number(l.quantity), l.unit, l.material.unit) * Number(l.material.unitCost ?? 0), 0);

export const PRODUCTION_STATUS: Record<string, [string, 'green' | 'red' | 'gray' | 'amber']> = {
  COMPLETED: ['Terminée', 'green'], CANCELLED: ['Annulée', 'gray'], PENDING: ['En attente', 'gray'], IN_PROGRESS: ['En cours', 'amber'],
};

/** Quantity to order to bring a material back up: to its maximum if set, else to twice its minimum (at least 1). */
export const reorderQuantity = (quantity: number, minimum: number, maximum?: number | null) =>
  Math.max((Number(maximum) || minimum * 2) - quantity, minimum, 1);

/** /purchases/new pre-filled with one line per material (materialId:quantity:unitId). */
export const purchaseLink = (lines: { materialId: number; quantity: number; unitId: number }[]) =>
  `/purchases/new?lines=${lines.map((l) => `${l.materialId}:${l.quantity}:${l.unitId}`).join(',')}`;

/** Display value of a material characteristic: numbers in French format, booleans as Oui/Non. */
export const characteristicValue = (c: { value: string; characteristic: { dataType: string } }) =>
  c.characteristic.dataType === 'BOOLEAN' ? (c.value === 'true' ? 'Oui' : 'Non')
    : c.characteristic.dataType === 'NUMBER' && c.value !== '' && !Number.isNaN(Number(c.value)) ? Number(c.value).toLocaleString('fr-FR')
      : c.value;
