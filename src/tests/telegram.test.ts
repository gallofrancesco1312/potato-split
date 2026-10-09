import { env } from '~/env';
import { sendTelegramMessage } from '~/server/telegram';

jest.mock('~/env', () => ({
  env: { TELEGRAM_BOT_TOKEN: undefined },
}));

const mockEnv = env as unknown as Record<string, string | undefined>;

describe('sendTelegramMessage', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockEnv.TELEGRAM_BOT_TOKEN = undefined;
  });

  it('does not call fetch when TELEGRAM_BOT_TOKEN is unset', async () => {
    await sendTelegramMessage('123', { title: 'Hi', message: 'Body' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts chat_id/text to the Telegram API when token is set', async () => {
    mockEnv.TELEGRAM_BOT_TOKEN = 'test-token';

    await sendTelegramMessage('456', { title: 'New expense', message: 'Dinner added' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chat_id: '456', text: 'New expense\nDinner added' }),
      }),
    );
  });
});
