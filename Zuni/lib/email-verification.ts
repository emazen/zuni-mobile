import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { Resend } from 'resend'
import { getVerificationEmailTemplate } from './emailTemplate'

/**
 * Generate a double RFC UUID token for email verification
 * This creates a more secure token by combining two UUIDs
 */
export function generateDoubleUUIDToken(): string {
  const uuid1 = randomUUID()
  const uuid2 = randomUUID()
  return `${uuid1}-${uuid2}`
}

/**
 * Create an email verification token for a user
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  // Delete any existing verification tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId }
  })

  // Generate new token
  const token = generateDoubleUUIDToken()
  
  // Set expiration to 24 hours from now
  const expires = new Date()
  expires.setHours(expires.getHours() + 24)

  // Create the token in database
  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId,
      expires
    }
  })

  return token
}

/**
 * Verify an email verification token
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verificationToken) {
      // Token doesn't exist - could be invalid or already used
      // Return a more helpful message that suggests the user might already be verified
      return { success: false, error: 'This verification link has already been used or is invalid. If you already verified your email, please try signing in.' }
    }

    // Check if user is already verified (handles case where link is clicked twice)
    if (verificationToken.user.emailVerified) {
      // User already verified, clean up token and return success
      await prisma.emailVerificationToken.deleteMany({
        where: { token }
      })
      return { success: true, userId: verificationToken.userId }
    }

    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.emailVerificationToken.deleteMany({
        where: { token }
      })
      return { success: false, error: 'Verification token has expired' }
    }

    // Store userId before updating
    const userId = verificationToken.userId

    // Mark user's email as verified
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() }
    })

    // Clean up the used token (use deleteMany for safety - handles race conditions)
    // Don't throw error if delete fails - verification already succeeded
    try {
      await prisma.emailVerificationToken.deleteMany({
        where: { token }
      })
    } catch (deleteError) {
      // If delete fails, it's okay - the user is already verified
      // This handles race conditions where token is deleted between operations
      console.log('Token cleanup failed (likely already deleted) - verification succeeded')
    }

    return { success: true, userId }
  } catch (error) {
    console.error('Error verifying email token:', error)
    
    // If it's a "record not found" error (P2025), check if user was actually verified
    // This handles the case where verification succeeded but token delete failed
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      // The error might be from user update, but more likely token was already deleted
      // In this case, we need to check if the verification actually succeeded
      // by looking for the user by the token (but token doesn't exist)
      // The safest approach: if we can't verify, return error but suggest checking email status
      console.log('Record not found error - checking if verification may have succeeded')
      return { success: false, error: 'Verification may have already completed. Please try signing in.' }
    }
    
    return { success: false, error: 'An error occurred during verification' }
  }
}

/**
 * Send verification email using Resend
 */
export async function sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`
  
  try {
    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Get email template
    const emailTemplate = getVerificationEmailTemplate(verificationUrl, username)

    // Send email using Resend
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'Zuni <onboarding@resend.dev>',
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })

    const messageId = result.data?.id || 'unknown'
    console.log('✅ Verification email sent successfully:', messageId)
    
    // Also log to console for development
    console.log('\n' + '='.repeat(80))
    console.log('📧 EMAIL VERIFICATION SENT')
    console.log('='.repeat(80))
    console.log(`To: ${email}`)
    console.log(`Message ID: ${messageId}`)
    console.log(`Verification URL: ${verificationUrl}`)
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('❌ Failed to send verification email:', error)
    
    // Fallback: log to console for development
    console.log('================================================================================')
    console.log('📧 EMAIL VERIFICATION (FALLBACK)')
    console.log('================================================================================')
    console.log(`To: ${email}`)
    console.log(`Subject: Verify your Zuni account`)
    console.log(`Hello ${username},`)
    console.log(`Welcome to Zuni! Please verify your email address by clicking the link below:`)
    console.log(`🔗 ${verificationUrl}`)
    console.log(`This link will expire in 24 hours.`)
    console.log(`If you did not create an account with Zuni, please ignore this email.`)
    console.log(`Best regards,`)
    console.log(`The Zuni Team`)
    console.log('================================================================================')
    console.log('\n' + '='.repeat(80))
    console.log('📧 EMAIL VERIFICATION (FALLBACK)')
    console.log('='.repeat(80))
    console.log(`To: ${email}`)
    console.log(`Subject: Verify your Zuni account`)
    console.log('')
    console.log(`Hello ${username},`)
    console.log('')
    console.log('Welcome to Zuni! Please verify your email address by clicking the link below:')
    console.log('')
    console.log(`🔗 ${verificationUrl}`)
    console.log('')
    console.log('This link will expire in 24 hours.')
    console.log('')
    console.log('If you did not create an account with Zuni, please ignore this email.')
    console.log('')
    console.log('Best regards,')
    console.log('The Zuni Team')
    console.log('='.repeat(80) + '\n')
    
    // Don't throw error to prevent signup from failing
    // The user can still use the fallback link from console
  }
}
