/** Stock state with the three fixed names of the design system: En stock, Stock faible, Rupture. */
export function stockState(quantity: number, minimum: number): { tone: 'green' | 'amber' | 'red'; label: string } {
  if (quantity <= 0) return { tone: 'red', label: 'Rupture' };
  if (minimum > 0 && quantity <= minimum) return { tone: 'amber', label: 'Stock faible' };
  return { tone: 'green', label: 'En stock' };
}
