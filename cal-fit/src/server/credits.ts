/**
 * Server-only: AI scan credits, via the Data API RPCs in db/schema.sql (credit_balance,
 * spend_credit). Calls run as the user (their JWT), so they only ever touch that user's ledger.
 */

const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;

async function rpc<T>(token: string, name: string, body: object = {}): Promise<T> {
  const response = await fetch(`${NEON_API_URL}/rpc/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`rpc/${name} failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export function creditBalance(token: string): Promise<number> {
  return rpc<number>(token, 'credit_balance');
}

/** Spends one credit; resolves to the new balance, or -1 when there was none to spend. */
export function spendCredit(token: string, reference: string): Promise<number> {
  return rpc<number>(token, 'spend_credit', { reference });
}
