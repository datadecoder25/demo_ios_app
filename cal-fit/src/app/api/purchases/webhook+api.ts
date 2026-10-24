/**
 * POST /api/purchases/webhook
 * RevenueCat webhook (Project settings → Integrations → Webhooks). Set its Authorization
 * header to the value of REVENUECAT_WEBHOOK_AUTH. Credits scan packs on purchase and takes
 * them back on refund; grants are idempotent, so retries and the app's own sync can't
 * double-credit.
 */

import { json } from '@/server/auth';
import { grantPurchase, isPurchasesConfigured, revokePurchase } from '@/server/purchases';

interface WebhookEvent {
  type: string;
  app_user_id: string;
  product_id: string;
  transaction_id?: string;
  id: string;
}

export async function POST(request: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!isPurchasesConfigured || !expected) {
    return json({ message: 'Purchases are not configured on the server.' }, 503);
  }
  if (request.headers.get('authorization') !== expected) {
    return json({ message: 'Unauthorized' }, 401);
  }

  const body = (await request.json().catch(() => null)) as { event?: WebhookEvent } | null;
  const event = body?.event;
  if (!event?.app_user_id || !event.product_id) {
    return json({ message: 'Ignored' });
  }

  const transactionId = event.transaction_id || event.id;
  try {
    if (event.type === 'NON_RENEWING_PURCHASE') {
      await grantPurchase(event.app_user_id, event.product_id, transactionId);
    } else if (event.type === 'CANCELLATION') {
      // For one-time purchases, CANCELLATION means the store refunded it.
      await revokePurchase(event.app_user_id, event.product_id, transactionId);
    }
    return json({ ok: true });
  } catch (error) {
    console.error('purchases/webhook error:', error);
    // Non-2xx makes RevenueCat retry later.
    return json({ message: 'Failed to process event' }, 500);
  }
}
