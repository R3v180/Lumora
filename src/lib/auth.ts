import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { playerProfile: true },
        });

        if (!user) {
          throw new Error('No existe una cuenta con este email');
        }

        if (!user.passwordHash) {
          throw new Error('Esta cuenta usa login con Google');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Contraseña incorrecta');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.playerProfile?.displayName || user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              email: user.email,
              name: user.name || 'Viajero',
              emailVerified: new Date(),
              onboardingCompleted: false,
              playerProfile: {
                create: {
                  displayName: user.name || 'Viajero',
                  sanctuary: {
                    create: {
                      name: 'Mi Santuario',
                    },
                  },
                  blessings: {
                    create: {
                      day: 1,
                      lastClaimAt: new Date(),
                    },
                  },
                },
              },
            },
            include: { playerProfile: true },
          });
          user.id = newUser.id;
        } else {
          user.id = existingUser.id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
