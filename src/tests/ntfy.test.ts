import { env } from '~/env';
import { publishToNtfy } from '~/server/ntfy';

jest.mock('~/env', () => ({
  env: {
    NTFY_URL: undefined,
    NTFY_TOPIC: undefined,
    NTFY_TOKEN: undefined,
    NEXTAUTH_URL: 'https://splitpro.example.com',
  },
}));

const mockEnv = env as unknown as Record<string, string | undefined>;

describe('publishToNtfy', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockEnv.NTFY_URL = undefined;
    mockEnv.NTFY_TOPIC = undefined;
    mockEnv.NTFY_TOKEN = undefined;
  });

  it('does not call fetch when NTFY_URL/NTFY_TOPIC are unset', async () => {
    await publishToNtfy({ title: 'Hi', message: 'Body' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts JSON with topic/title/message/click when env is set', async () => {
    mockEnv.NTFY_URL = 'https://ntfy.example.com';
    mockEnv.NTFY_TOPIC = 'splitpro';

    await publishToNtfy({ title: 'New expense', message: 'Dinner added', data: { url: '/e/1' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ntfy.example.com',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          topic: 'splitpro',
          title: 'New expense',
          message: 'Dinner added',
          click: 'https://splitpro.example.com/e/1',
        }),
      }),
    );
  });
});
