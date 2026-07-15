export interface CurrencyPreset {
  code: string;
  symbol: string;
  suggestedRate: number; // relative to HKD (1 Preset Currency = X HKD)
}

// Single Source of Truth for all pre-defined currency rates (vs HKD)
export const INITIAL_RATES_TO_HKD: Record<string, number> = {
  AUD: 5.44,
  CNY: 1.08,
  EUR: 8.96,
  GBP: 10.49,
  HKD: 1.0,
  JPY: 0.051,
  KRW: 0.0053,
  SGD: 6.07,
  TWD: 0.24,
  USD: 7.84,
};

export const COMMON_CURRENCIES: CurrencyPreset[] = [
  { code: 'AUD', symbol: 'A$', suggestedRate: INITIAL_RATES_TO_HKD.AUD },
  { code: 'CNY', symbol: '¥', suggestedRate: INITIAL_RATES_TO_HKD.CNY },
  { code: 'EUR', symbol: '€', suggestedRate: INITIAL_RATES_TO_HKD.EUR },
  { code: 'GBP', symbol: '£', suggestedRate: INITIAL_RATES_TO_HKD.GBP },
  { code: 'HKD', symbol: '$', suggestedRate: INITIAL_RATES_TO_HKD.HKD },
  { code: 'JPY', symbol: '¥', suggestedRate: INITIAL_RATES_TO_HKD.JPY },
  { code: 'KRW', symbol: '₩', suggestedRate: INITIAL_RATES_TO_HKD.KRW },
  { code: 'SGD', symbol: 'S$', suggestedRate: INITIAL_RATES_TO_HKD.SGD },
  { code: 'TWD', symbol: 'NT$', suggestedRate: INITIAL_RATES_TO_HKD.TWD },
  { code: 'USD', symbol: '$', suggestedRate: INITIAL_RATES_TO_HKD.USD },
];

export function getAvailablePresets(existingCodes: string[]): CurrencyPreset[] {
  const upperExisting = existingCodes.map(c => c.toUpperCase());
  return COMMON_CURRENCIES.filter(c => !upperExisting.includes(c.code.toUpperCase()));
}
