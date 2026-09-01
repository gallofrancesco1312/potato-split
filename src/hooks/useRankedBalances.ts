import { useEffect, useMemo } from 'react';
import { isCurrencyCode } from '~/lib/currency';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';
import { api } from '~/utils/api';
import { rankBalances } from '~/utils/balances';

/**
 * Sizes a set of balances against each other so a list can draw them off a
 * shared spine. Everything is scaled in the currency currently on display, or
 * the user's default when several currencies are shown side by side.
 */
export const useRankedBalances = <T extends { currencies: { currency: string; amount: bigint }[] }>(
  items: T[],
  userDefaultCurrency?: string | null,
) => {
  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference());
  const setUserDefaultCurrency = useCurrencyPreferenceStore((s) => s.setUserDefaultCurrency);

  useEffect(() => {
    if (isCurrencyCode(userDefaultCurrency)) {
      setUserDefaultCurrency(userDefaultCurrency);
    }
  }, [userDefaultCurrency, setUserDefaultCurrency]);

  const currencies = useMemo(
    () => [
      ...new Set(
        items.flatMap((item) =>
          item.currencies.filter(({ amount }) => 0n !== amount).map(({ currency }) => currency),
        ),
      ),
    ],
    [items],
  );

  const scaleCurrency = isCurrencyCode(selectedCurrency)
    ? selectedCurrency
    : isCurrencyCode(userDefaultCurrency)
      ? userDefaultCurrency
      : 'USD';

  // Rates move by the day, so a day-precision key keeps this cached.
  const rateDate = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);

  const ratesQuery = api.expense.getBatchCurrencyRates.useQuery(
    { from: currencies, to: scaleCurrency, date: rateDate },
    { enabled: currencies.some((currency) => currency !== scaleCurrency) },
  );

  const rows = useMemo(
    () => rankBalances(items, scaleCurrency, ratesQuery.data?.rates),
    [items, scaleCurrency, ratesQuery.data?.rates],
  );

  return { rows, currencies, scaleCurrency, selectedCurrency };
};
