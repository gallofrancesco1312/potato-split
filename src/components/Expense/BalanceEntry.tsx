import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import { EntityAvatar } from '../ui/avatar';
import { ConvertibleBalance } from './ConvertibleBalance';

const emptyBalances: { currency: string; amount: bigint }[] = [];

export const BalanceEntry: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  balances?: { currency: string; amount: bigint }[];
  id: number;
  /**
   * Size of this balance relative to the largest one on screen, 0 to 1. When
   * given, the row draws a bar off the shared centre spine: right when the
   * friend owes you, left when you owe them. Direction stays readable without
   * relying on the bar colour.
   */
  magnitude?: number;
  /** Sign of the balance the magnitude belongs to. */
  direction?: 'positive' | 'negative';
  /** Row position, used only to stagger the load-in. */
  index?: number;
}> = ({ entity, balances = emptyBalances, id, magnitude, direction, index = 0 }) => {
  const { displayName } = useTranslationWithUtils();
  const router = useRouter();

  const currentRoute = router.pathname;

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const isPositive = 'positive' === direction;

  return (
    <Link
      className="focus-visible:ring-ring block rounded-sm focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent focus-visible:outline-none"
      href={`${currentRoute}/${id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <EntityAvatar entity={entity} size={32} />
          <div className="text-foreground truncate text-[0.9375rem]">{displayName(entity)}</div>
        </div>
        <div className="tnum text-right" onClick={stopPropagation}>
          <ConvertibleBalance withText balances={balances} entityId={id} />
        </div>
      </div>
      {undefined !== magnitude ? (
        <div className="relative mt-2 h-[3px]" aria-hidden>
          <div
            className={cn(
              'animate-balance-bar absolute h-[3px] rounded-full motion-reduce:animate-none',
              isPositive
                ? 'bg-positive left-1/2 origin-left'
                : 'bg-negative right-1/2 origin-right',
            )}
            style={{
              width: `${Math.max(magnitude, 0.012) * 50}%`,
              animationDelay: `${Math.min(index, 12) * 45}ms`,
            }}
          />
        </div>
      ) : null}
    </Link>
  );
};
