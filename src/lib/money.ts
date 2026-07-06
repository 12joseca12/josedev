/**
 * Parsea un input de monto en texto (acepta coma o punto decimal, p. ej.
 * "12,50" o "12.50") a number. `null` si está vacío o no es un número finito
 * — dejale al caller decidir cómo tratar el caso inválido (bloquear submit,
 * mostrar error, etc.), este helper no lanza.
 */
export function parseMoney(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
