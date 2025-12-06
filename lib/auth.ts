import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { isValidEduEmail } from "./utils"
import bcrypt from "bcryptjs"
import { createEmailVerificationToken, sendVerificationEmail } from "./email-verification"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Trust the host header (needed for Vercel)
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
        gender: { label: "Gender", type: "text" },
        customColor: { label: "Custom Color", type: "text" },
        isSignUp: { label: "Is Sign Up", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Validate edu email
        if (!isValidEduEmail(credentials.email)) {
          throw new Error("Only educational email addresses are allowed")
        }

        if (credentials.isSignUp === "true") {
          // Sign up flow
          if (!credentials.username || !credentials.gender) {
            throw new Error("Username and gender are required")
          }

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (existingUser) {
            throw new Error("User already exists with this email")
          }

          // Hash password and create user
          const hashedPassword = await bcrypt.hash(credentials.password, 12)
          
          const user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.username,
              password: hashedPassword,
              gender: credentials.gender,
              customColor: credentials.customColor || null,
              emailVerified: null, // User needs to verify email
            }
          })

          // Create and send email verification token
          const token = await createEmailVerificationToken(user.id)
          await sendVerificationEmail(user.email, token, user.name || 'User')

          // Don't return a session for unverified users - they need to verify email first
          throw new Error("Account created successfully! Please check your email and verify your account before signing in.")
        } else {
          // Sign in flow
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            throw new Error("No user found with this email")
          }

          if (!user.password) {
            throw new Error("Invalid credentials")
          }

          // Verify the password
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          
          if (!isValidPassword) {
            throw new Error("Invalid password")
          }

          // Check if email is verified
          if (!user.emailVerified) {
            throw new Error("Please verify your email address before signing in. Check your inbox for a verification link.")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          }
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    }
  }
}
