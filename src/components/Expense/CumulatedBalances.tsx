import { useMemo } from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

export const CumulatedBalances: React.FC<{
  entityId: number;
  entityType?: 'group';
  balances?: { currency: string; amount: bigint }[];
}> = ({ entityId, entityType, balances }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference(entityId, entityType));
  const userDefaultCurrency = useCurrencyPreferenceStore((s) => s.userDefaultCurrency);
  const zeroCurrency = isCurrencyCode(selectedCurrency)
    ? selectedCurrency
    : (userDefaultCurrency ?? 'USD');

  const allNonZeroCurrencies = useMemo(() => {
    const nonZeroBalances = balances?.filter((b) => b.amount !== 0n);
    return nonZeroBalances ? [...new Set(nonZeroBalances.map((b) => b.currency))] : [];
  }, [balances]);

  const youLent = useMemo(() => balances?.filter((b) => 0 < b.amount) ?? [], [balances]);
  const youOwe = useMemo(() => balances?.filter((b) => 0 > b.amount) ?? [], [balances]);

  if (!balances) {
    return null;
  }

  return (
    <header className="border-border border-b pb-6">
      {isCurrencyCode(selectedCurrency) ? (
        <>
          <p className="eyebrow">{t('ui.total_balance')}</p>
          <div className="font-display tnum mt-3 flex items-center text-5xl leading-none tracking-tight">
            {0 === balances.length ? (
              <span className="text-muted-foreground">
                {getCurrencyHelpersCached(zeroCurrency).toUIString(0n)}
              </span>
            ) : (
              <CumulatedBalanceDisplay
                entityId={entityId}
                entityType={entityType}
                cumulatedBalances={balances}
                currencies={allNonZeroCurrencies}
              />
            )}
          </div>
        </>
      ) : (
        <dl className="grid grid-cols-2">
          <div>
            <dt className="eyebrow">
              {t('actors.you')} {t('ui.expense.you.lent')}
            </dt>
            <dd className="tnum mt-2 flex flex-wrap text-base">
              {youLent.length ? (
                <CumulatedBalanceDisplay
                  entityId={entityId}
                  entityType={entityType}
                  cumulatedBalances={youLent}
                  currencies={allNonZeroCurrencies}
                  hideSwitcher
                />
              ) : (
                <span className="text-muted-foreground">
                  {getCurrencyHelpersCached(zeroCurrency).toUIString(0n)}
                </span>
              )}
            </dd>
          </div>
          <div className="text-right">
            <dt className="eyebrow">
              {t('actors.you')} {t('ui.expense.you.owe')}
            </dt>
            <dd className="tnum mt-2 flex flex-wrap justify-end text-base">
              {youOwe.length ? (
                <CumulatedBalanceDisplay
                  entityId={entityId}
                  entityType={entityType}
                  cumulatedBalances={youOwe}
                  currencies={allNonZeroCurrencies}
                  hideSwitcher
                />
              ) : (
                <span className="text-muted-foreground">
                  {getCurrencyHelpersCached(zeroCurrency).toUIString(0n)}
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </header>
  );
};

const CumulatedBalanceDisplay: React.FC<{
  entityId: number;
  entityType?: 'group';
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
  hideSwitcher?: boolean;
  currencies: string[];
}> = ({
  entityId,
  entityType,
  className = '',
  cumulatedBalances,
  hideSwitcher = false,
  currencies,
}) => {
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <ConvertibleBalance
        balances={cumulatedBalances}
        entityId={entityId}
        entityType={entityType}
        forceShowButton={!hideSwitcher && 1 < currencies.length}
        hideSwitcher={hideSwitcher}
        showMultiOption
        overrideCurrencies={currencies}
      />
    </div>
  );
};
