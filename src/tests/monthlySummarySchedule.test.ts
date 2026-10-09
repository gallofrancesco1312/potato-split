import { isMonthlySummaryDue } from '~/lib/monthlySummarySchedule';

describe('isMonthlySummaryDue', () => {
  const baseUser = { monthlySummaryDay: 15, monthlySummaryHour: 9, monthlySummaryLastSentAt: null };

  it('is not due before the configured day', () => {
    expect(isMonthlySummaryDue(baseUser, new Date('2026-09-14T23:00:00'))).toBe(false);
  });

  it('is not due on the configured day before the configured hour', () => {
    expect(isMonthlySummaryDue(baseUser, new Date('2026-09-15T08:59:00'))).toBe(false);
  });

  it('is due on the configured day at/after the configured hour', () => {
    expect(isMonthlySummaryDue(baseUser, new Date('2026-09-15T09:00:00'))).toBe(true);
  });

  it('is still due if checked days after the configured day (missed tick catch-up)', () => {
    expect(isMonthlySummaryDue(baseUser, new Date('2026-09-20T00:00:00'))).toBe(true);
  });

  it('is not due again the same month once already sent', () => {
    const user = { ...baseUser, monthlySummaryLastSentAt: new Date('2026-09-15T09:00:00') };
    expect(isMonthlySummaryDue(user, new Date('2026-09-20T00:00:00'))).toBe(false);
  });

  it('is due again once a new month starts', () => {
    const user = { ...baseUser, monthlySummaryLastSentAt: new Date('2026-09-15T09:00:00') };
    expect(isMonthlySummaryDue(user, new Date('2026-10-15T09:00:00'))).toBe(true);
  });
});
