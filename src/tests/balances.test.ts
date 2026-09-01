import { rankBalances } from '~/utils/balances';

const entry = (id: string, currencies: { currency: string; amount: bigint }[]) => ({
  id,
  currencies,
});

describe('rankBalances', () => {
  it('sorts owed-to-you first and scales against the largest balance', () => {
    const ranked = rankBalances(
      [
        entry('marco', [{ currency: 'USD', amount: -4500n }]),
        entry('ana', [{ currency: 'USD', amount: 12000n }]),
        entry('lena', [{ currency: 'USD', amount: -18000n }]),
      ],
      'USD',
    );

    expect(ranked.map((r) => r.balance.id)).toEqual(['ana', 'marco', 'lena']);
    expect(ranked.map((r) => r.direction)).toEqual(['positive', 'negative', 'negative']);
    expect(ranked[2]!.magnitude).toBe(1);
    expect(ranked[0]!.magnitude).toBeCloseTo(12000 / 18000, 3);
  });

  it('converts other currencies before comparing', () => {
    const ranked = rankBalances(
      [
        entry('ana', [{ currency: 'USD', amount: 1000n }]),
        entry('priya', [{ currency: 'EUR', amount: 1000n }]),
      ],
      'USD',
      new Map([['EUR', 2]]),
    );

    expect(ranked.map((r) => r.balance.id)).toEqual(['priya', 'ana']);
    expect(ranked[1]!.magnitude).toBeCloseTo(0.5, 3);
  });

  it('returns zero magnitudes when every balance is settled', () => {
    const ranked = rankBalances([entry('ana', [{ currency: 'USD', amount: 0n }])], 'USD');

    expect(ranked[0]!.magnitude).toBe(0);
    expect(ranked[0]!.direction).toBe('positive');
  });
});
