# Phase 1 staging

Apply phase1.sql to a PostgreSQL staging database in a separate account or database from production. Set KOSMOS_DATABASE_URL on the Next.js server. The shared account ledger starts at zero. Reconcile any existing paid balances against Stripe receipts before carrying them forward. Browser balances and editable profile fields cannot establish a paid balance.

Use a Clerk test application with server and public keys. Deploy worker/pipeline.py to an isolated Modal staging workspace with a proxy auth token, and set MODAL_PROXY_KEY, MODAL_PROXY_SECRET and the three protected endpoint URLs on the Next.js host. The dispatch, status and download endpoints use Modal proxy authentication. Stage the application and worker together. The private Modal volume handles delivery by default. Set KOSMOS_MODAL_S3_SECRET_NAME in the Modal deployment command environment only if an additional S3 copy is configured.

Use Stripe test keys and a webhook endpoint with the API version shipped by the installed Stripe SDK. Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, and invoice.paid. The trusted catalog defines monthly and annual charges and grants each cycle's credits when that payment is confirmed. Reservations reduce available credits while a render runs. The status endpoint finalizes the reservation or returns credits when the worker records failure. Use Stripe's test environment to verify purchase, renewal and duplicate delivery before enabling payments.

Before paid release, verify two independent Clerk accounts, authenticated 206 downloads, live Compact and Studio renders, optional face restoration, color preview versus master, and real 1080p, QHD, 4K and 8K outputs. Review source and exported footage visually with controlled newsroom samples and retain their technical metadata for the intended reviewers.

For a disposable local test database with the migration applied, run `KOSMOS_TEST_DATABASE_URL=… node scripts/test-studio-ledger.mjs` with Node.js 22.18 or later. The test verifies concurrency, duplicate delivery, account isolation, refund idempotency, successful settlement, and preview cost.
