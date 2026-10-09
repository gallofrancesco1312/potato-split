import { CalendarClock } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'sonner';

import { AppDrawer } from '../ui/drawer';
import { Label } from '../ui/label';
import { NativeSelect, NativeSelectOption } from '../ui/native-select';
import { Switch } from '../ui/switch';
import { AccountButton } from './AccountButton';
import { api } from '~/utils/api';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const MonthlySummarySettings: React.FC<{
  defaultEnabled: boolean;
  defaultDay: number;
  defaultHour: number;
}> = ({ defaultEnabled, defaultDay, defaultHour }) => {
  const { t } = useTranslation();
  const utils = api.useUtils();
  const updateUser = api.user.updateUserDetail.useMutation();

  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [day, setDay] = useState(defaultDay);
  const [hour, setHour] = useState(defaultHour);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setEnabled(defaultEnabled);
        setDay(defaultDay);
        setHour(defaultHour);
      }
      setOpen(nextOpen);
    },
    [defaultDay, defaultEnabled, defaultHour],
  );

  const onSave = useCallback(async () => {
    try {
      await updateUser.mutateAsync({
        monthlySummaryEnabled: enabled,
        monthlySummaryDay: day,
        monthlySummaryHour: hour,
      });
      utils.user.me.refetch().catch(console.error);
      toast.success(t('account.messages.submit_success'), { duration: 1500 });
      setOpen(false);
    } catch (error) {
      toast.error(t('account.messages.submit_error'));
      console.error(error);
    }
  }, [day, enabled, hour, t, updateUser, utils.user.me]);

  return (
    <AppDrawer
      trigger={
        <AccountButton>
          <CalendarClock className="text-muted-foreground size-5" />
          {t('account.monthly_summary.title')}
        </AccountButton>
      }
      open={open}
      onOpenChange={onOpenChange}
      leftAction={t('actions.close')}
      title={t('account.monthly_summary.title')}
      shouldCloseOnAction={false}
      actionTitle={t('actions.save')}
      actionOnClick={onSave}
    >
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="monthly-summary-enabled">{t('account.monthly_summary.enable')}</Label>
          <Switch id="monthly-summary-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="monthly-summary-day">{t('account.monthly_summary.day')}</Label>
          <NativeSelect
            id="monthly-summary-day"
            className="w-24"
            disabled={!enabled}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {DAYS.map((d) => (
              <NativeSelectOption key={d} value={d}>
                {d}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="monthly-summary-hour">{t('account.monthly_summary.hour')}</Label>
          <NativeSelect
            id="monthly-summary-hour"
            className="w-24"
            disabled={!enabled}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <NativeSelectOption key={h} value={h}>
                {h.toString().padStart(2, '0')}:00
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
    </AppDrawer>
  );
};
