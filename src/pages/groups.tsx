import { PlusIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useEffect, useMemo } from 'react';
import { useRankedBalances } from '~/hooks/useRankedBalances';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import { CreateGroup } from '~/components/group/CreateGroup';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';
import { isCurrencyCode } from '~/lib/currency';

// Helper to transform balances object to array format
function transformBalances(balances: Record<string, bigint>) {
  return Object.entries(balances)
    .filter(([_, amount]) => 0n !== amount)
    .map(([currency, amount]) => ({ currency, amount }));
}

const BalancePage: NextPageWithUser = ({ user }) => {
  const { t } = useTranslation();
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();
  const archivedGroupQuery = api.group.getAllGroupsWithBalances.useQuery({ getArchived: true });
  const setGroupDefaultCurrency = useCurrencyPreferenceStore((s) => s.setGroupDefaultCurrency);

  useEffect(() => {
    groupQuery.data?.forEach(({ id, defaultCurrency }) => {
      if (isCurrencyCode(defaultCurrency)) {
        setGroupDefaultCurrency(id, defaultCurrency);
      }
    });
  }, [groupQuery.data, setGroupDefaultCurrency]);

  const groups = useMemo(
    () =>
      (groupQuery.data ?? []).map((group) =>
        Object.assign({ currencies: transformBalances(group.balances) }, group),
      ),
    [groupQuery.data],
  );

  const { rows } = useRankedBalances(groups, user.defaultCurrency);

  const actions = useMemo(
    () => (
      <CreateGroup>
        <PlusIcon className="text-primary h-6 w-6" />
      </CreateGroup>
    ),
    [],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.groups')}</title>
      </Head>
      <MainLayout title={t('navigation.groups')} actions={actions} loading={groupQuery.isPending}>
        <div className="pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-24 flex flex-col items-center gap-8 text-center">
              <p className="font-display text-3xl">{t('group_details.create_group.title')}</p>
              <CreateGroup>
                <Button className="w-full max-w-62.5">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('actions.create')}
                </Button>
              </CreateGroup>
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-baseline justify-between">
                <h2 className="eyebrow">{t('ui.outstanding_balances')}</h2>
                <span className="tnum text-muted-foreground text-xs">{rows.length}</span>
              </div>

              {/* Same spine as the friends list: right of it you are owed, left of it you owe. */}
              <div className="relative mt-5">
                <div className="bg-border absolute inset-y-0 left-1/2 w-px" aria-hidden />
                <ul className="flex flex-col gap-5">
                  {rows.map(({ balance, direction, magnitude }, index) => (
                    <li key={balance.id}>
                      <BalanceEntry
                        id={balance.id}
                        entity={balance}
                        balances={balance.currencies}
                        direction={direction}
                        magnitude={magnitude}
                        index={index}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {archivedGroupQuery.data && archivedGroupQuery.data.length > 0 && (
                <Accordion type="single" collapsible className="mt-10 w-full">
                  <AccordionItem value="archived-groups" className="border-t">
                    <AccordionTrigger className="eyebrow text-left hover:no-underline">
                      {t('group_details.group_info.archived')} ({archivedGroupQuery.data.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="mt-2 flex flex-col gap-5">
                        {archivedGroupQuery.data.map((g) => (
                          <li key={g.id}>
                            <BalanceEntry id={g.id} entity={g} />
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </>
          )}
        </div>
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default BalancePage;
