import { clerkMiddleware } from '@clerk/nextjs/server';

const site = process.env.NEXT_PUBLIC_APP_URL;
const previewHosts = process.env.VERCEL_ENV === 'preview'
  ? [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
  : [];
const authorizedParties = [
  ...(site ? [new URL(site).origin] : []),
  ...previewHosts.flatMap((host) => host ? [new URL(`https://${host}`).origin] : []),
];

export default clerkMiddleware({
  jwtKey: process.env.CLERK_JWT_KEY,
  authorizedParties: authorizedParties.length ? authorizedParties : undefined,
});

export const config = {
  matcher: ['/api/upscale', '/api/process', '/api/render', '/api/status', '/api/download', '/api/checkout', '/api/balance'],
};
