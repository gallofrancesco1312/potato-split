import { SplitType } from '@prisma/client';
import { isCurrencyCode } from '~/lib/currency';
import { isMonthlySummaryDue } from '~/lib/monthlySummarySchedule';
import { type PushMessage } from '~/types';

import { db } from '~/server/db';
import { publishToNtfy } from '~/server/ntfy';
import { pushNotification } from '~/server/notification';
import { sendTelegramMessage } from '~/server/telegram';
import { getCurrencyHelpers } from '~/utils/numbers';

export const getSubscriptionEndpoint = (subscription: string) => {
  try {
    const parsed = JSON.parse(subscription) as { endpoint?: string };
    if ('string' === typeof parsed.endpoint && '' !== parsed.endpoint) {
      return parsed.endpoint;
    }
  } catch {
    return null;
  }

  return null;
};

const removeStalePushSubscriptions = async (
  subscriptions: { userId: number; endpoint: string }[],
) => {
  if (0 === subscriptions.length) {
    return;
  }

  await db.pushNotification.deleteMany({
    where: {
      OR: subscriptions.map((subscription) => ({
        userId: subscription.userId,
        endpoint: subscription.endpoint,
      })),
    },
  });
};

const isPermanentPushFailure = (statusCode: number | undefined) =>
  404 === statusCode || 410 === statusCode;

export const sendPushNotificationToUsers = async (userIds: number[], pushData: PushMessage) => {
  if (0 === userIds.length) {
    return { sentCount: 0 };
  }

  void publishToNtfy(pushData);

  const telegramRecipients = await db.user.findMany({
    where: { id: { in: userIds }, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  await Promise.all(
    telegramRecipients.map((u) => sendTelegramMessage(u.telegramChatId!, pushData)),
  );

  const subscriptions = await db.pushNotification.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  const pushResults = await Promise.all(
    subscriptions.map(async (s) => {
      const result = await pushNotification(s.subscription, pushData);
      return { ...result, userId: s.userId, endpoint: s.endpoint };
    }),
  );

  await removeStalePushSubscriptions(
    pushResults
      .filter((result) => !result.ok && isPermanentPushFailure(result.statusCode))
      .map((result) => ({ userId: result.userId, endpoint: result.endpoint })),
  );

  return { sentCount: pushResults.filter((result) => result.ok).length };
};

export async function sendExpensePushNotification(expenseId: string) {
  const expense = await db.expense.findUnique({
    where: {
      id: expenseId,
    },
    select: {
      paidBy: true,
      amount: true,
      currency: true,
      addedBy: true,
      name: true,
      deletedBy: true,
      splitType: true,
      deletedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      expenseParticipants: {
        select: {
          userId: true,
          amount: true,
        },
      },
      paidByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      addedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      updatedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      conversionTo: {
        select: {
          currency: true,
          amount: true,
        },
      },
    },
  });

  if (!expense) {
    return;
  }

  const participants = expense.deletedBy
    ? expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.deletedBy && 0n !== amount,
      )
    : expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.addedBy && 0n !== amount,
      );

  // A way to localize it and reuse our utils would be ideal
  const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
    user?.name ?? user?.email ?? '';

  const formatAmount = formatAmountForCurrency;

  const getNotificationContent = (): { title: string; message: string } => {
    const payer = getUserDisplayName(expense.paidByUser);
    const adder = getUserDisplayName(expense.addedByUser);
    const amount = formatAmount(expense.currency, expense.amount);

    // Deleted expense
    if (expense.deletedBy) {
      return {
        title: getUserDisplayName(expense.deletedByUser),
        message: `Deleted ${expense.name}`,
      };
    }

    // Updated expense
    if (expense.updatedByUser) {
      return {
        title: getUserDisplayName(expense.updatedByUser),
        message: `Updated ${expense.name} ${amount}`,
      };
    }

    // Currency conversion
    if (expense.splitType === SplitType.CURRENCY_CONVERSION && expense.conversionTo) {
      const toAmount = formatAmount(expense.conversionTo.currency, expense.conversionTo.amount);
      return {
        title: adder,
        message: `${payer} converted ${amount} → ${toAmount}`,
      };
    }

    // Settlement
    if (expense.splitType === SplitType.SETTLEMENT) {
      return {
        title: adder,
        message: `${payer} settled up ${amount}`,
      };
    }

    // Regular expense
    return {
      title: adder,
      message: `${payer} paid ${amount} for ${expense.name}`,
    };
  };

  const pushData = {
    ...getNotificationContent(),
    data: {
      url: `/expenses/${expenseId}`,
    },
  };

  await sendPushNotificationToUsers(
    participants.map((p) => p.userId),
    pushData,
  );
}

export async function sendGroupSimplifyDebtsToggleNotification(
  groupId: number,
  togglerUserId: number,
  newState: boolean,
) {
  try {
    const group = await db.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        name: true,
        groupUsers: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return;
    }

    const togglerUser = await db.user.findUnique({
      where: {
        id: togglerUserId,
      },
      select: {
        name: true,
        email: true,
      },
    });

    if (!togglerUser) {
      return;
    }

    // Filter out the toggler from recipients
    const recipients = group.groupUsers.filter((gu) => gu.userId !== togglerUserId);

    if (recipients.length === 0) {
      return;
    }

    const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
      user?.name ?? user?.email ?? '';

    const togglerName = getUserDisplayName(togglerUser);
    const stateText = newState ? 'on' : 'off';

    const pushData = {
      title: togglerName,
      message: `turned ${stateText} debt simplification for ${group.name}`,
      data: {
        url: `/groups/${groupId}`,
      },
    };

    await sendPushNotificationToUsers(
      recipients.map((r) => r.userId),
      pushData,
    );
  } catch (error) {
    console.error('Error sending group simplify debts toggle notifications', error);
  }
}

export async function getCumulatedBalancesForUser(userId: number) {
  const cumulatedBalances = await db.balanceView.groupBy({
    by: ['currency'],
    _sum: { amount: true },
    where: { userId, amount: { not: 0 } },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const youOwe = cumulatedBalances
    .filter((b) => b._sum.amount && 0 > b._sum.amount)
    .map((b) => ({ currency: b.currency, amount: b._sum.amount! }))
    .reverse();

  const youGet = cumulatedBalances
    .filter((b) => b._sum.amount && 0 < b._sum.amount)
    .map((b) => ({ currency: b.currency, amount: b._sum.amount! }));

  return { youOwe, youGet };
}

const formatAmountForCurrency = (currency: string, amount: bigint) =>
  getCurrencyHelpers({ currency: isCurrencyCode(currency) ? currency : 'USD' }).toUIString(amount);

async function sendMonthlySummaryNotification(userId: number) {
  const { youOwe, youGet } = await getCumulatedBalancesForUser(userId);

  if (0 === youOwe.length && 0 === youGet.length) {
    return;
  }

  const oweText = youOwe
    .map(({ currency, amount }) => `devi ${formatAmountForCurrency(currency, amount)}`)
    .join(', ');
  const getText = youGet
    .map(({ currency, amount }) => `ti devono ${formatAmountForCurrency(currency, amount)}`)
    .join(', ');

  const pushData = {
    title: 'Resoconto del mese',
    message: [oweText, getText].filter(Boolean).join(' • '),
    data: { url: '/balances' },
  };

  await sendPushNotificationToUsers([userId], pushData);
}

export async function checkMonthlySummaryNotifications() {
  try {
    const now = new Date();

    const users = await db.user.findMany({
      where: { monthlySummaryEnabled: true },
      select: {
        id: true,
        monthlySummaryDay: true,
        monthlySummaryHour: true,
        monthlySummaryLastSentAt: true,
      },
    });

    const dueUsers = users.filter((user) => isMonthlySummaryDue(user, now));

    await Promise.all(
      dueUsers.map(async (user) => {
        await sendMonthlySummaryNotification(user.id);
        await db.user.update({
          where: { id: user.id },
          data: { monthlySummaryLastSentAt: now },
        });
      }),
    );
  } catch (e) {
    console.error('Error sending monthly summary notifications', e);
  } finally {
    setTimeout(checkMonthlySummaryNotifications, 1000 * 60 * 15); // Check every 15 minutes
  }
}

export async function checkRecurrenceNotifications() {
  try {
    const recurrences = await db.expenseRecurrence.findMany({
      where: {
        NOT: {
          notified: true,
        },
      },
      include: {
        expense: {
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await Promise.all(
      recurrences
        .filter((r) => r.expense[0])
        .map(async (r) => {
          await sendExpensePushNotification(r.expense[0]!.id);
          await db.expenseRecurrence.update({
            where: {
              id: r.id,
            },
            data: {
              notified: true,
            },
          });
        }),
    );
  } catch (e) {
    console.error('Error sending recurrence notifications', e);
  } finally {
    setTimeout(checkRecurrenceNotifications, 1000 * 60); // Check every minute
  }
}
