import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { creditPayment } from '@/lib/studioAccount';
import { studioPlan } from '@/lib/studioPlans';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: 'Payment verification is not configured.' }, { status: 503 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Stripe signature is required.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(key).webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = studioPlan(session.metadata?.planId);
      if (session.mode === 'payment' && session.payment_status === 'paid' && session.currency === 'usd'
        && plan && !plan.interval && userId && userId === session.client_reference_id && session.amount_total === plan.cents) {
        await creditPayment(session.id, userId, plan.credits);
      }
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const metadata = invoice.parent?.subscription_details?.metadata;
      const plan = studioPlan(metadata?.planId);
      if (invoice.status === 'paid' && invoice.currency === 'usd'
        && plan?.interval && metadata?.userId && invoice.amount_paid === plan.cents
        && ['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason ?? '')) {
        await creditPayment(invoice.id, metadata.userId, plan.credits);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Payment fulfillment]', error);
    return NextResponse.json({ error: 'Payment fulfillment is temporarily unavailable.' }, { status: 503 });
  }
}
