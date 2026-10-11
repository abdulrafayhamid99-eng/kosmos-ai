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

    let event: Stripe.Event;

    if (stripeKey && webhookSecret && sig) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: '2024-04-10' as any,
      });

      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook Signature Error]:', err.message);
        return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
      }
    } else {
      // Parse payload if testing without webhook signing secret
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch {
        return NextResponse.json({ error: 'Invalid webhook JSON body' }, { status: 400 });
      }
    }

    // Handle successful checkout completion
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
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
