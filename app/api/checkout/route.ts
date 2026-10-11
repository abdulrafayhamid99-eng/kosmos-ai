import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credits = 100, planName = 'Creator Pack', priceUsd = 9, userId, userEmail, isSubscription = false } = body;

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    // Standardized unit amount in cents (USD)
    const unitAmountCents = Math.round(Number(priceUsd) * 100);

    // If Stripe Secret Key is present and valid, create a genuine Stripe Checkout Session
    if (stripeKey && !stripeKey.includes('placeholder') && stripeKey.startsWith('sk_')) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: '2024-04-10' as any,
      });

      const session = await stripe.checkout.sessions.create({
        customer_email: userEmail || undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `KosMos AI: ${planName} (+${credits} Credits)`,
                description: `Neural video upscaling and frame interpolation compute bundle. Adds ${credits} credits to account.`,
              },
              unit_amount: unitAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${origin}/pricing?payment_status=success&session_id={CHECKOUT_SESSION_ID}&credits=${credits}&plan=${encodeURIComponent(planName)}`,
        cancel_url: `${origin}/pricing?payment_status=cancelled`,
        metadata: {
          userId: userId || 'guest',
          userEmail: userEmail || '',
          creditsToAdd: String(credits),
          planName: planName,
        },
        client_reference_id: userId || undefined,
      });

      return NextResponse.json({
        success: true,
        url: session.url,
        sessionId: session.id,
      });
    }

    // Graceful developer & test fallback when live Stripe keys are not yet added to .env.local
    // Provides instant checkout redirection with full credit synchronization
    const mockSessionId = `kosmos_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const redirectUrl = `${origin}/pricing?payment_status=success&session_id=${mockSessionId}&credits=${credits}&plan=${encodeURIComponent(planName)}&simulated=true`;

    return NextResponse.json({
      success: true,
      url: redirectUrl,
      sessionId: mockSessionId,
      notice: 'Simulated checkout session (Configure STRIPE_SECRET_KEY in .env.local for production card billing)',
    });

  } catch (error: any) {
    console.error('[Checkout API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to initialize payment checkout session',
      },
      { status: 500 }
    );
  }
}
