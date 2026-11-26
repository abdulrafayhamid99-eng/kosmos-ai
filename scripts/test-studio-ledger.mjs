import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const testDatabase = process.env.KOSMOS_TEST_DATABASE_URL;
if (!testDatabase) throw new Error('Set KOSMOS_TEST_DATABASE_URL to a disposable PostgreSQL database.');
process.env.KOSMOS_DATABASE_URL = testDatabase;
const { balance, creditPayment, reserveRender, renderForUser, finishRender } =
  await import('../lib/studioAccount.ts');

const db = new Pool({ connectionString: testDatabase });
const id = randomUUID();
const user = `${id}-owner`;
const other = `${id}-other`;

try {
  assert.equal(await balance(user), 0);
  assert.equal((await reserveRender(id, user, 10, false)).state, 'insufficient');
  const payments = await Promise.all([creditPayment(id, user, 20), creditPayment(id, user, 20)]);
  assert.equal(payments.filter(Boolean).length, 1);

  const decisions = await Promise.all([
    reserveRender(`${id}-a`, user, 20, false),
    reserveRender(`${id}-b`, user, 20, false),
  ]);
  assert.deepEqual(decisions.map((entry) => entry.state).sort(), ['created', 'insufficient']);

  const job = decisions.find((entry) => entry.state === 'created').render;
  assert.equal(await renderForUser(job.id, other), null);
  assert.equal(await finishRender(job.id, other, 'failed'), null);
  assert.equal((await reserveRender(job.id, other, 0, true)).state, 'conflict');
  assert.equal(await balance(user), 0);

  const releases = await Promise.all([finishRender(job.id, user, 'failed'), finishRender(job.id, user, 'failed')]);
  assert.equal(releases.filter(Boolean).length, 1);
  assert.equal(await balance(user), 20);
  assert.equal((await reserveRender(job.id, user, 20, false)).state, 'existing');

  const paid = `${id}-paid`;
  assert.equal((await reserveRender(paid, user, 10, false)).state, 'created');
  await finishRender(paid, user, 'completed');
  assert.equal(await finishRender(paid, user, 'failed'), null);
  assert.equal((await reserveRender(`${id}-preview`, user, 0, true)).state, 'created');
  assert.equal(await balance(user), 10);
  console.log('Studio ledger checks passed.');
} finally {
  await db.query('DELETE FROM kosmos_renders WHERE user_id IN ($1, $2)', [user, other]);
  await db.query('DELETE FROM kosmos_payments WHERE user_id IN ($1, $2)', [user, other]);
  await db.query('DELETE FROM kosmos_accounts WHERE user_id IN ($1, $2)', [user, other]);
  await db.end();
}
