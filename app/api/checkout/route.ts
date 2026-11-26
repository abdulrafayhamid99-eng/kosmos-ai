import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { studioPlan } from '@/lib/studioPlans';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in to buy credits.' }, { status: 401 });

    const { planId } = await req.json().catch(() => ({}));
    const plan = studioPlan(planId);
    if (!plan) return NextResponse.json({ error: 'Choose an available credit plan.' }, { status: 400 });

    const key = process.env.STRIPE_SECRET_KEY;
    const site = process.env.NEXT_PUBLIC_APP_URL;
    if (!key || !site || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Checkout is currently unavailable.' }, { status: 503 });
    }

    const stripe = new Stripe(key);
    const origin = new URL(site).origin;
    const metadata = { userId, planId };
    const session = await stripe.checkout.sessions.create({
      mode: plan.interval ? 'subscription' : 'payment',
      client_reference_id: userId,
      metadata,
      subscription_data: plan.interval ? { metadata } : undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `KosMos AI · ${plan.name}` },
          unit_amount: plan.cents,
          recurring: plan.interval ? { interval: plan.interval } : undefined,
        },
        quantity: 1,
      }],
      success_url: `${origin}/pricing?payment_status=success`,
      cancel_url: `${origin}/pricing?payment_status=cancelled`,
    });
    if (!session.url) return NextResponse.json({ error: 'Checkout is currently unavailable.' }, { status: 502 });
    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    console.error('[Checkout]', error);
    return NextResponse.json({ error: 'Checkout is currently unavailable.' }, { status: 503 });
  }
}
