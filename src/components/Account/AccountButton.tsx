import React from 'react';
import { Button, type ButtonProps } from '../ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';

export const AccountButton: React.FC<React.PropsWithChildren<ButtonProps> & { href?: string }> = ({
  children,
  href,
  className,
  ...buttonProps
}) => (
  <WithLink href={href}>
    <Button
      variant="ghost"
      className={cn(
        className,
        'hover:text-foreground/80 h-auto w-full justify-between px-0 py-4 text-[0.9375rem] font-normal',
      )}
      {...buttonProps}
    >
      <div className="flex items-center gap-4">{children}</div>
      <ChevronRight className="text-muted-foreground h-5 w-5" />
    </Button>
  </WithLink>
);

export const WithLink: React.FC<React.PropsWithChildren<{ href?: string }>> = ({
  href,
  children,
}) =>
  href ? (
    <Link href={href} target={href.startsWith('http') ? '_blank' : undefined}>
      {children}
    </Link>
  ) : (
    children
  );
