import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSheetsClient } from '@/lib/google';

// We need to define types for session
import { DefaultSession, NextAuthOptions } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
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
            async authorize(credentials: Record<string, string> | undefined) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const client = getSheetsClient();
                    const sheetId = process.env.GOOGLE_SHEET_ID;

                    // Fetch Users sheet including Password column (D)
                    const response = await client.spreadsheets.values.get({
                        spreadsheetId: sheetId,
                        range: 'Users!A2:D',
                    });

                    const rows = response.data.values || [];
                    const userEmail = credentials.email.toLowerCase().trim();

                    // Find user
                    const userRow = rows.find(row =>
                        row[0]?.trim().toLowerCase() === userEmail
                    );

                    if (!userRow) return null;

                    // Check password (Column D is index 3)
                    const dbPassword = userRow[3]?.toString().trim();
                    if (dbPassword !== credentials.password) {
                        return null;
                    }

                    // Return user object
                    return {
                        id: userEmail,
                        email: userEmail,
                        name: userRow[1],
                        role: userRow[2], // Map role from sheet
                    };
                } catch (error) {
                    console.error('Login error:', error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
            }
            return session;
        }
    },
    pages: {
        error: '/auth/error', // Custom error page if needed
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
