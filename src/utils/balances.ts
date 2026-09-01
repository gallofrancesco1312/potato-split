import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { currencyConversion } from './numbers';

const absolute = (value: bigint) => (0n > value ? -value : value);

export interface RankedBalance<T> {
  balance: T;
  /** Whether the friend owes you (positive) or you owe them (negative). */
  direction: 'positive' | 'negative';
  /** Size relative to the largest balance on screen, 0 to 1. */
  magnitude: number;
}

/**
 * Orders balances into a wedge — largest owed to you first, largest you owe
 * last — and sizes each one against the biggest balance in the set. Amounts in
 * other currencies are converted to `scaleCurrency` first so the sizes are
 * comparable; a balance whose rate has not arrived yet contributes nothing.
 */
export const rankBalances = <T extends { currencies: { currency: string; amount: bigint }[] }>(
  balances: T[],
  scaleCurrency: CurrencyCode,
  rates?: Map<string, number>,
): RankedBalance<T>[] => {
  const valued = balances.map((balance) => ({
    balance,
    value: balance.currencies.reduce((total, { currency, amount }) => {
      if (currency === scaleCurrency) {
        return total + amount;
      }
      const rate = rates?.get(currency);
      if (!rate || !isCurrencyCode(currency)) {
        return total;
      }
      return total + currencyConversion({ from: currency, to: scaleCurrency, amount, rate });
    }, 0n),
  }));

  const largest = valued.reduce((max, { value }) => {
    const size = absolute(value);
    return size > max ? size : max;
  }, 0n);

  return valued
    .sort((a, b) => (a.value === b.value ? 0 : a.value > b.value ? -1 : 1))
    .map(({ balance, value }) => ({
      balance,
      direction: 0n <= value ? ('positive' as const) : ('negative' as const),
      magnitude: 0n < largest ? Number((absolute(value) * 10000n) / largest) / 10000 : 0,
    }));
};
