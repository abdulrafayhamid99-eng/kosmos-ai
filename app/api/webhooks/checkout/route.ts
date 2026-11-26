import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (!stripeKey || !webhookSecret) {
      return NextResponse.json({ error: 'Payment verification is not configured' }, { status: 503 });
    }
    if (!sig) {
      return NextResponse.json({ error: 'Stripe signature is required' }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }

    // Handle successful checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }
      const metadata = session.metadata || {};
      const userId = metadata.userId;
      const creditsToAdd = parseInt(metadata.creditsToAdd || '0', 10);
      const planName = metadata.planName || 'Credits Pack';

      console.log(`[Stripe Webhook] Payment verified for user ${userId}: +${creditsToAdd} credits (${planName})`);

      // Sync with Clerk user metadata if userId is present
      if (userId && !userId.startsWith('guest')) {
        try {
          const user = await clerkClient.users.getUser(userId);
          const currentCredits = typeof user.unsafeMetadata?.credits === 'number'
            ? user.unsafeMetadata.credits
            : 100;
          const updatedCredits = currentCredits + creditsToAdd;

          await clerkClient.users.updateUser(userId, {
            unsafeMetadata: {
              ...(user.unsafeMetadata || {}),
              credits: updatedCredits,
              lastPurchase: {
                planName,
                creditsAdded: creditsToAdd,
                sessionId: session.id,
                amountTotal: session.amount_total,
                currency: session.currency,
                timestamp: Date.now(),
              },
            },
          });

          console.log(`[Stripe Webhook] Successfully updated Clerk user ${userId} balance to ${updatedCredits} credits.`);
        } catch (clerkErr: any) {
          console.warn('[Stripe Webhook] Clerk metadata sync error:', clerkErr?.message || clerkErr);
        }
      }

      return NextResponse.json({
        received: true,
        credited: creditsToAdd,
        userId,
        status: 'success',
      });
    }

    return NextResponse.json({ received: true, eventType: event.type });

  } catch (error: any) {
    console.error('[Stripe Webhook Exception]:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
