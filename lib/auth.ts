import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Google One-Click / Instant Auth provider for development & demo accounts
    CredentialsProvider({
      id: 'google-one-click',
      name: 'Google Account',
      credentials: {
        name: { label: 'Name', type: 'text' },
        email: { label: 'Email', type: 'text' },
        image: { label: 'Image', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.email) {
          const userSlug = credentials.email.split('@')[0] || 'user';
          return {
            id: `usr_${userSlug.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: credentials.name || 'Google Creator',
            email: credentials.email,
            image:
              credentials.image ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(credentials.email)}`,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'kosmos_ai_session_secret_key_2026_super_secure',
};
