import { z } from 'zod';
import { execSimctl, resolveDevice } from '../helpers/simctl.js';

// --- storekit_config ---

export const storekitConfigParams = {
  action: z.enum(['enable', 'disable']).describe('Enable or disable StoreKit testing on the simulator'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitConfig(args: { action: 'enable' | 'disable'; deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  const subcommand = args.action === 'enable' ? 'enable-testing' : 'disable-testing';
  try {
    await execSimctl(['storekit', device, subcommand], 'tool:storekitConfig');
    return { content: [{ type: 'text' as const, text: `StoreKit testing ${args.action}d.` }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `StoreKit ${args.action} failed: ${e.message}\n\nRequires Xcode 14+ with StoreKit testing support.` }] };
  }
}

// --- storekit_transactions ---

export const storekitTransactionsParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitTransactions(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    const { stdout } = await execSimctl(['storekit', device, 'list-transactions'], 'tool:storekitTransactions');
    return { content: [{ type: 'text' as const, text: stdout.trim() || 'No transactions found.' }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Failed to list transactions: ${e.message}\n\nRequires Xcode 14+ with StoreKit testing support.` }] };
  }
}

// --- storekit_delete_transactions ---

export const storekitDeleteTransactionsParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitDeleteTransactions(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    await execSimctl(['storekit', device, 'delete-transactions'], 'tool:storekitDeleteTransactions');
    return { content: [{ type: 'text' as const, text: 'All StoreKit transactions deleted.' }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Failed to delete transactions: ${e.message}\n\nRequires Xcode 14+ with StoreKit testing support.` }] };
  }
}

// --- storekit_manage_subscription ---

export const storekitManageSubscriptionParams = {
  action: z.enum(['expire', 'renew']).describe('"expire" to expire a subscription, "renew" to force renewal'),
  transactionId: z.string().describe('Transaction ID of the subscription'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitManageSubscription(args: {
  action: 'expire' | 'renew'; transactionId: string; deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const subcommand = args.action === 'expire' ? 'expire-subscription' : 'force-renewal';
  try {
    await execSimctl(['storekit', device, subcommand, args.transactionId], 'tool:storekitSubscription');
    return { content: [{ type: 'text' as const, text: `Subscription ${args.transactionId}: ${args.action} completed.` }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Subscription ${args.action} failed: ${e.message}` }] };
  }
}

// --- storekit_manage_transaction ---

export const storekitManageTransactionParams = {
  action: z.enum(['refund', 'approve-ask-to-buy', 'decline-ask-to-buy']).describe('Action: "refund" a transaction, "approve-ask-to-buy", or "decline-ask-to-buy"'),
  transactionId: z.string().describe('Transaction ID'),
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitManageTransaction(args: {
  action: string; transactionId: string; deviceId?: string;
}) {
  const device = await resolveDevice(args.deviceId);
  const subcommandMap: Record<string, string> = {
    'refund': 'refund-transaction',
    'approve-ask-to-buy': 'approve-ask-to-buy',
    'decline-ask-to-buy': 'decline-ask-to-buy',
  };
  const subcommand = subcommandMap[args.action];
  try {
    await execSimctl(['storekit', device, subcommand, args.transactionId], 'tool:storekitTransaction');
    return { content: [{ type: 'text' as const, text: `Transaction ${args.transactionId}: ${args.action} completed.` }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Transaction ${args.action} failed: ${e.message}` }] };
  }
}

// --- storekit_reset_eligibility ---

export const storekitResetEligibilityParams = {
  deviceId: z.string().optional().describe('Device (default: booted)'),
};

export async function handleStorekitResetEligibility(args: { deviceId?: string }) {
  const device = await resolveDevice(args.deviceId);
  try {
    await execSimctl(['storekit', device, 'reset-eligibility'], 'tool:storekitEligibility');
    return { content: [{ type: 'text' as const, text: 'Introductory offer eligibility reset for all products.' }] };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { content: [{ type: 'text' as const, text: `Reset eligibility failed: ${e.message}\n\nRequires Xcode 14+ with StoreKit testing support.` }] };
  }
}
