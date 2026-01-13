
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/supabase';
import { DefaultSession, NextAuthOptions } from 'next-auth';

// Extend NextAuth types
declare module 'next-auth' {
    interface Session {
        user: {
            id?: string;
            role?: string;
        } & DefaultSession['user']
    }
    interface User {
        role?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email.toLowerCase().trim();

                try {
                    // Fetch user from Supabase 'users' table
                    // We use supabaseAdmin to ignore RLS if necessary, though explicit RLS policies are good practice.
                    const { data: user, error } = await supabaseAdmin
                        .from('users')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (error || !user) {
                        // User not found
                        return null;
                    }

                    // Verify password
                    // WARNING: Currently storing/checking plaintext as migrated from Sheets.
                    // TODO: Implement bcrypt/hashing for new users and migration.
                    const dbPassword = user.password;

                    if (dbPassword !== credentials.password) {
                        return null;
                    }

                    // Return user object compatible with NextAuth
                    return {
                        id: user.id || email, // Use UUID if available, else email
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    };

                } catch (error) {
                    console.error('Auth logic error:', error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/auth/signin', // Optional: Custom sign in page
        error: '/auth/error',
    },
    session: {
        strategy: 'jwt'
    }
};
