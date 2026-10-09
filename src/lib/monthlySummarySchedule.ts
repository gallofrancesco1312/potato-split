// Same day-of-month/hour bucket the user last got a summary for, or null if never sent.
const summaryBucketOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

export function isMonthlySummaryDue(
  user: {
    monthlySummaryDay: number;
    monthlySummaryHour: number;
    monthlySummaryLastSentAt: Date | null;
  },
  now: Date,
) {
  if (
    user.monthlySummaryLastSentAt &&
    summaryBucketOf(user.monthlySummaryLastSentAt) === summaryBucketOf(now)
  ) {
    return false;
  }

  if (now.getDate() < user.monthlySummaryDay) {
    return false;
  }

  return now.getDate() > user.monthlySummaryDay || now.getHours() >= user.monthlySummaryHour;
}
