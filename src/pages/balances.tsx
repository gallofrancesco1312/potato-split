import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { Download, PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import MainLayout from '~/components/Layout/MainLayout';
import { NotificationModal } from '~/components/NotificationModal';
import { Button } from '~/components/ui/button';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useIsPwa } from '~/hooks/useIsPwa';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { useRankedBalances } from '~/hooks/useRankedBalances';
import { SHOW_ALL_VALUE } from '~/store/currencyPreferenceStore';

const BalancePage: NextPageWithUser = ({ user }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const isPwa = useIsPwa();
  const balanceQuery = api.expense.getBalances.useQuery();
  const cumulatedQuery = api.expense.getCumulatedBalances.useQuery();

  const balances = balanceQuery.data?.balances;
  const {
    rows,
    currencies: allNonZeroCurrencies,
    scaleCurrency,
    selectedCurrency,
  } = useRankedBalances(
    useMemo(() => balances ?? [], [balances]),
    user.defaultCurrency,
  );

  const showsEveryCurrency = !selectedCurrency || SHOW_ALL_VALUE === selectedCurrency;

  const shareWithFriends = useCallback(() => {
    if (navigator.share) {
      navigator
        .share({
          title: t('meta.application_name'),
          text: t('ui.share_text'),
          url: window.location.origin,
        })
        .then(() => console.info('Successful share'))
        .catch((error) => console.error('Error sharing', error));
    }
  }, [t]);

  const cumulatedBalances = useMemo(
    () => [cumulatedQuery.data?.youOwe ?? [], cumulatedQuery.data?.youGet ?? []].flat(),
    [cumulatedQuery.data],
  );

  return (
    <>
      <Head>
        <title>{t('meta.title')}</title>
      </Head>
      <MainLayout
        title={t('navigation.balances')}
        actions={
          'undefined' !== typeof window && 'share' in window.navigator ? (
            <Button variant="ghost" size="icon" onClick={shareWithFriends}>
              <ArrowUpOnSquareIcon className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-6 w-10" />
          )
        }
        loading={cumulatedQuery.isPending}
      >
        <NotificationModal />

        <header className="border-border border-b pb-6">
          <p className="eyebrow">{t('ui.total_balance')}</p>
          <div
            className={
              showsEveryCurrency
                ? 'font-display tnum mt-3 flex flex-wrap items-center text-2xl leading-none'
                : 'font-display tnum mt-3 flex items-center text-5xl leading-none tracking-tight'
            }
          >
            <ConvertibleBalance
              balances={cumulatedBalances}
              showMultiOption
              className="flex-wrap"
              overrideCurrencies={allNonZeroCurrencies}
              forceShowButton={1 < allNonZeroCurrencies.length}
            />
          </div>

          <dl className="border-border mt-6 grid grid-cols-2 border-t pt-4">
            <SummaryFigure
              label={`${t('actors.you')} ${t('ui.expense.you.lent')}`}
              balances={cumulatedQuery.data?.youGet ?? []}
              currencies={allNonZeroCurrencies}
            />
            <SummaryFigure
              label={`${t('actors.you')} ${t('ui.expense.you.owe')}`}
              balances={cumulatedQuery.data?.youOwe ?? []}
              currencies={allNonZeroCurrencies}
              align="right"
            />
          </dl>
        </header>

        {rows.length ? (
          <section className="pb-36">
            <div className="mt-7 flex items-baseline justify-between">
              <h2 className="eyebrow">{t('ui.outstanding_balances')}</h2>
              <span className="tnum text-muted-foreground text-xs">{rows.length}</span>
            </div>

            {/* The spine every bar measures from: right of it you are owed, left of it you owe. */}
            <div className="relative mt-5">
              <div className="bg-border absolute inset-y-0 left-1/2 w-px" aria-hidden />
              <ul className="flex flex-col gap-5">
                {rows.map(({ balance, direction, magnitude }, index) => (
                  <li key={balance.friend.id}>
                    <BalanceEntry
                      id={balance.friend.id}
                      entity={balance.friend}
                      balances={balance.currencies}
                      direction={direction}
                      magnitude={magnitude}
                      index={index}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {!balanceQuery.isPending && !rows.length ? (
          <div className="mt-24 flex flex-col items-center gap-8 pb-36 text-center">
            <p className="font-display text-3xl">
              {getCurrencyHelpersCached(scaleCurrency).toUIString(0n)}
            </p>
            <div className="flex w-full max-w-62.5 flex-col gap-3">
              <Link href="/add">
                <Button className="w-full">
                  <PlusIcon className="mr-2 h-5 w-5" />
                  {t('actions.add_expense')}
                </Button>
              </Link>
              {!isPwa && (
                <DownloadAppDrawer>
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-5 w-5" />
                    {t('account.download_app')}
                  </Button>
                </DownloadAppDrawer>
              )}
            </div>
          </div>
        ) : null}
      </MainLayout>
    </>
  );
};

const SummaryFigure: React.FC<{
  label: string;
  balances: { currency: string; amount: bigint }[];
  currencies: string[];
  align?: 'left' | 'right';
}> = ({ label, balances, currencies, align = 'left' }) => {
  const { t } = useTranslationWithUtils();
  const isEmpty = balances.every((b) => 0n === b.amount);

  return (
    <div className={'right' === align ? 'text-right' : ''}>
      <dt className="eyebrow">{label}</dt>
      <dd className={`tnum mt-2 flex flex-wrap text-base ${'right' === align ? 'justify-end' : ''}`}>
        {isEmpty ? (
          <span className="text-muted-foreground">{t('ui.nothing')}</span>
        ) : (
          <ConvertibleBalance
            balances={balances}
            showMultiOption
            hideSwitcher
            className="flex-wrap"
            overrideCurrencies={currencies}
          />
        )}
      </dd>
    </div>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default BalancePage;
