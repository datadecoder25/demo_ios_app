/**
 * Server-only: direct Postgres access with the owner connection (DATABASE_URL), for writes the
 * app must never be able to make itself (purchase grants, app_user sync, account linking).
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl ? neon(databaseUrl) : null;
