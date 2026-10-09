import { env } from '~/env';
import { type PushMessage } from '~/types';

export async function publishToNtfy(message: PushMessage) {
  if (!env.NTFY_URL || !env.NTFY_TOPIC) {
    return;
  }

  try {
    await fetch(env.NTFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.NTFY_TOKEN ? { Authorization: `Bearer ${env.NTFY_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        topic: env.NTFY_TOPIC,
        title: message.title,
        message: message.message,
        ...(message.data?.url ? { click: `${env.NEXTAUTH_URL}${message.data.url}` } : {}),
      }),
    });
  } catch (error) {
    console.error('Error publishing to ntfy', error);
  }
}
