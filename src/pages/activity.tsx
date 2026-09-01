import { SplitType } from '@prisma/client';
import { type User } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { getCurrencyHelpers } from '~/utils/numbers';
import { type TFunction } from 'next-i18next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { RefreshCcwDot } from 'lucide-react';
import { Button } from '~/components/ui/button';
import React from 'react';

function getPaymentString(
  user: User,
  amount: bigint,
  paidBy: number,
  expenseUserAmt: bigint,
  isSettlement: boolean,
  t: TFunction,
  toUIString: (value: bigint) => string,
  isDeleted?: boolean,
) {
  if (isDeleted) {
    return null;
  } else if (0n === expenseUserAmt) {
    return <div className="text-muted-foreground text-xs">{t('ui.not_involved')}</div>;
  }

  const isPositive = isSettlement ? user.id === paidBy : (user.id === paidBy) !== amount < 0n;
  const verb = isSettlement
    ? user.id === paidBy
      ? t('ui.expense.you.paid')
      : t('ui.expense.you.received')
    : t(`ui.expense.you.${isPositive ? 'lent' : 'owe'}`);

  return (
    <div className={isPositive ? 'text-positive' : 'text-negative'}>
      <div className="text-[0.6875rem] whitespace-nowrap">
        {t('actors.you')} {verb}
      </div>
      <div className="tnum text-sm">{toUIString(isSettlement ? amount : expenseUserAmt)}</div>
    </div>
  );
}

const ActivityPage: NextPageWithUser = ({ user }) => {
  const { displayName, t, toUIDate, i18n } = useTranslationWithUtils();
  const expensesQuery = api.expense.getAllExpenses.useQuery();

  const days = React.useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof expensesQuery.data>>();
    for (const entry of expensesQuery.data ?? []) {
      const day = toUIDate(entry.expense.expenseDate);
      const bucket = grouped.get(day);
      if (bucket) {
        bucket.push(entry);
      } else {
        grouped.set(day, [entry]);
      }
    }
    return [...grouped.entries()];
  }, [expensesQuery.data, toUIDate]);

  const actions = React.useMemo(
    () => (
      <Link href="/recurring">
        <Button variant="ghost" size="sm">
          <RefreshCcwDot className="size-6" />
        </Button>
      </Link>
    ),
    [],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.activity')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={t('navigation.activity')}
        actions={actions}
        loading={expensesQuery.isPending}
      >
        {!expensesQuery.data?.length ? (
          <div className="text-muted-foreground mt-24 text-center">{t('ui.no_activity')}</div>
        ) : null}

        <div className="pb-36">
          {days.map(([day, entries]) => (
            <section key={day} className="mt-7 first:mt-2">
              <h2 className="eyebrow border-border border-b pb-3">{day}</h2>
              <ul className="mt-4 flex flex-col gap-5">
                {entries.map((e) => {
                  const { toUIString } = getCurrencyHelpers({
                    locale: i18n.language,
                    currency: e.expense.currency,
                  });

                  return (
                    <li key={e.expenseId}>
                      <Link
                        href={`/expenses/${e.expenseId}`}
                        className="focus-visible:ring-ring flex items-start justify-between gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="mt-0.5 shrink-0">
                            <EntityAvatar entity={e.expense.paidByUser} size={30} />
                          </div>
                          {e.expense.deletedByUser ? (
                            <p className="text-muted-foreground line-through">
                              <span className="font-medium">
                                {displayName(e.expense.deletedByUser, user.id)}
                              </span>{' '}
                              {t(
                                `ui.expense.${e.expense.deletedByUser.id === user.id ? 'you' : 'user'}.deleted`,
                              )}{' '}
                              <span className="font-medium">{e.expense.name}</span>
                            </p>
                          ) : (
                            <p className="text-muted-foreground text-[0.9375rem]">
                              <span className="text-foreground font-medium">
                                {displayName(e.expense.paidByUser, user.id)}
                              </span>{' '}
                              {t(
                                `ui.expense.${e.expense.paidByUser.id === user.id ? 'you' : 'user'}.${e.expense.amount > 0n ? 'paid' : 'received'}`,
                              )}{' '}
                              <span className="tnum">{toUIString(e.expense.amount)}</span>{' '}
                              {t('ui.expense.for')}{' '}
                              <span className="text-foreground font-medium">{e.expense.name}</span>
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {getPaymentString(
                            user,
                            e.expense.amount,
                            e.expense.paidBy,
                            e.amount,
                            e.expense.splitType === SplitType.SETTLEMENT,
                            t,
                            toUIString,
                            !!e.expense.deletedBy,
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </MainLayout>
    </>
  );
};

ActivityPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ActivityPage;
