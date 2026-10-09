import { Send } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'sonner';

import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AccountButton } from './AccountButton';
import { api } from '~/utils/api';

export const TelegramSettings: React.FC<{
  defaultChatId: string;
}> = ({ defaultChatId }) => {
  const { t } = useTranslation();
  const utils = api.useUtils();
  const updateUser = api.user.updateUserDetail.useMutation();

  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState(defaultChatId);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setChatId(defaultChatId);
      }
      setOpen(nextOpen);
    },
    [defaultChatId],
  );

  const onSave = useCallback(async () => {
    try {
      await updateUser.mutateAsync({ telegramChatId: chatId.trim() });
      utils.user.me.refetch().catch(console.error);
      toast.success(t('account.messages.submit_success'), { duration: 1500 });
      setOpen(false);
    } catch (error) {
      toast.error(t('account.messages.submit_error'));
      console.error(error);
    }
  }, [chatId, t, updateUser, utils.user.me]);

  return (
    <AppDrawer
      trigger={
        <AccountButton>
          <Send className="text-muted-foreground size-5" />
          {t('account.telegram.title')}
        </AccountButton>
      }
      open={open}
      onOpenChange={onOpenChange}
      leftAction={t('actions.close')}
      title={t('account.telegram.title')}
      shouldCloseOnAction={false}
      actionTitle={t('actions.save')}
      actionOnClick={onSave}
    >
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{t('account.telegram.description')}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telegram-chat-id">{t('account.telegram.chat_id')}</Label>
          <Input
            id="telegram-chat-id"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={t('account.telegram.chat_id_placeholder')}
          />
        </div>
      </div>
    </AppDrawer>
  );
};
