import { env } from '~/env';
import { type PushMessage } from '~/types';

export async function sendTelegramMessage(chatId: string, message: PushMessage) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${message.title}\n${message.message}`,
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram message', error);
  }
}
