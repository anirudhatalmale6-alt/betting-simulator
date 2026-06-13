export function formatAmericanOdds(odds: number): string {
  if (odds >= 0) return `+${Math.round(odds)}`;
  return `${Math.round(odds)}`;
}

export function americanToDecimal(odds: number): number {
  if (odds >= 0) return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

export function calculatePayout(amount: number, americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return Math.round(amount * decimal * 100) / 100;
}
