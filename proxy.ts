import { clerkMiddleware } from '@clerk/nextjs/server';

const site = process.env.NEXT_PUBLIC_APP_URL;
export default clerkMiddleware({
  jwtKey: process.env.CLERK_JWT_KEY,
  authorizedParties: site ? [new URL(site).origin] : undefined,
});

export const config = {
  matcher: ['/api/upscale', '/api/process', '/api/render', '/api/status', '/api/download', '/api/checkout', '/api/balance'],
};
