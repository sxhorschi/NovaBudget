import { useDisplaySettings, applyInflation } from '../context/DisplaySettingsContext';

/**
 * Returns the inflated display amount for a cost item.
 * If inflation is disabled or no cashOutDate is provided, returns the raw amount.
 */
export function useInflatedAmount(amount: number, cashOutDate?: string): number {
  const { inflationEnabled, inflationRate } = useDisplaySettings();
  if (!inflationEnabled || !cashOutDate) return amount;
  return applyInflation(amount, cashOutDate, inflationRate, new Date().getFullYear());
}
