import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;

function database() {
  const connectionString = process.env.KOSMOS_DATABASE_URL;
  if (!connectionString) throw new Error('The studio database is not configured.');
  return pool ??= new Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000, allowExitOnIdle: true });
}

async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface StudioRender {
  id: string;
  user_id: string;
  credits: number;
  is_preview: boolean;
  state: 'processing' | 'completed' | 'failed';
  created_at: Date;
}

export async function balance(userId: string) {
  const result = await database().query<{ credits: number }>(
    'SELECT credits FROM kosmos_accounts WHERE user_id = $1', [userId]
  );
  return result.rows[0]?.credits ?? 0;
}

export async function renderForUser(id: string, userId: string) {
  const result = await database().query<StudioRender>(
    'SELECT * FROM kosmos_renders WHERE id = $1 AND user_id = $2', [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function reserveRender(id: string, userId: string, credits: number, isPreview: boolean) {
  return transaction(async (client) => {
    await client.query('INSERT INTO kosmos_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
    const account = await client.query<{ credits: number }>(
      'SELECT credits FROM kosmos_accounts WHERE user_id = $1 FOR UPDATE', [userId]
    );
    const existing = await client.query<StudioRender>('SELECT * FROM kosmos_renders WHERE id = $1', [id]);
    if (existing.rows[0]) return {
      state: existing.rows[0].user_id === userId ? 'existing' : 'conflict',
      render: existing.rows[0],
    } as const;
    if (account.rows[0].credits < credits) return { state: 'insufficient' } as const;

    await client.query(
      'UPDATE kosmos_accounts SET credits = credits - $2 WHERE user_id = $1', [userId, credits]
    );
    const created = await client.query<StudioRender>(
      'INSERT INTO kosmos_renders (id, user_id, credits, is_preview) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *',
      [id, userId, credits, isPreview]
    );
    if (!created.rows[0]) {
      await client.query('UPDATE kosmos_accounts SET credits = credits + $2 WHERE user_id = $1', [userId, credits]);
      return { state: 'conflict' } as const;
    }
    return { state: 'created', render: created.rows[0] } as const;
  });
}

export async function finishRender(id: string, userId: string, state: 'completed' | 'failed') {
  return transaction(async (client) => {
    await client.query('SELECT user_id FROM kosmos_accounts WHERE user_id = $1 FOR UPDATE', [userId]);
    const result = await client.query<StudioRender>(
      "UPDATE kosmos_renders SET state = $3 WHERE id = $1 AND user_id = $2 AND state = 'processing' RETURNING *",
      [id, userId, state]
    );
    const job = result.rows[0];
    if (job && state === 'failed' && job.credits > 0) {
      await client.query('UPDATE kosmos_accounts SET credits = credits + $2 WHERE user_id = $1', [userId, job.credits]);
    }
    return job ?? null;
  });
}

export async function creditPayment(id: string, userId: string, credits: number) {
  return transaction(async (client) => {
    await client.query('INSERT INTO kosmos_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
    await client.query('SELECT user_id FROM kosmos_accounts WHERE user_id = $1 FOR UPDATE', [userId]);
    const receipt = await client.query(
      'INSERT INTO kosmos_payments (id, user_id, credits) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
      [id, userId, credits]
    );
    if (!receipt.rowCount) return false;
    await client.query('UPDATE kosmos_accounts SET credits = credits + $2 WHERE user_id = $1', [userId, credits]);
    return true;
  });
}
