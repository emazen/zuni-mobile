import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes HTML tags and dangerous content while preserving text
 * Server-side safe (no DOM required)
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // First, trim the input
  let sanitized = input.trim()
  
  // Remove dangerous JavaScript patterns BEFORE decoding entities
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '')
    .replace(/<link/gi, '')
    .replace(/<style/gi, '')
  
  // Remove all HTML tags (including script, style, etc.)
  // This regex matches any HTML tag including attributes
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  
  // Decode common HTML entities to get plain text
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
  
  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  return sanitized
}

/**
 * Sanitizes and validates input length
 */
export function sanitizeAndValidate(
  input: string,
  maxLength: number,
  fieldName: string = 'Input'
): { sanitized: string; error: string | null } {
  if (!input || typeof input !== 'string') {
    return { sanitized: '', error: `${fieldName} is required` }
  }
  
  const sanitized = sanitizeInput(input)
  
  if (sanitized.length === 0) {
    return { sanitized: '', error: `${fieldName} cannot be empty` }
  }
  
  if (sanitized.length > maxLength) {
    return { 
      sanitized: sanitized.substring(0, maxLength), 
      error: `${fieldName} must be ${maxLength} characters or less` 
    }
  }
  
  return { sanitized, error: null }
}

/**
 * Validates URL parameter IDs (e.g., post IDs, university IDs)
 * Ensures IDs are valid format and safe to use in database queries
 */
export function validateId(id: string | null | undefined): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required' }
  }
  
  // Trim whitespace
  const trimmed = id.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'ID cannot be empty' }
  }
  
  // Check length (reasonable limit for CUID or UUID)
  if (trimmed.length > 100) {
    return { valid: false, error: 'ID is too long' }
  }
  
  // Only allow alphanumeric characters, hyphens, and underscores (typical for CUID/UUID)
  // This prevents injection attempts
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'ID contains invalid characters' }
  }
  
  return { valid: true }
}

// Educational email domain validation
export function isValidEduEmail(email: string): boolean {
  // Allow production email bypass
  const allowedEmails = ['wool_crafter@icloud.com']
  if (allowedEmails.includes(email.toLowerCase())) {
    return true
  }
  
  // Check for test email bypass via environment variable (only in development)
  const testEmailBypass = process.env.TEST_EMAIL_BYPASS
  if (process.env.NODE_ENV === 'development' && testEmailBypass) {
    if (email.toLowerCase() === testEmailBypass.toLowerCase()) {
      return true
    }
  }
  
  const eduDomains = [
    '.edu',
    '.edu.tr',
    '.ac.uk',
    '.ac.jp',
    '.ac.kr',
    '.ac.in',
    '.ac.za',
    '.ac.nz',
    '.ac.au',
    '.ac.ca',
    '.ac.il',
    '.ac.th',
    '.ac.sg',
    '.ac.my',
    '.ac.id',
    '.ac.ph',
    '.ac.ae',
    '.ac.ma',
    '.ac.eg',
    '.ac.ng',
    '.ac.ke',
    '.ac.gh',
    '.ac.tz',
    '.ac.ug',
    '.ac.rw',
    '.ac.bw',
    '.ac.zm',
    '.ac.mw',
    '.ac.ls',
    '.ac.sz',
    '.ac.mz',
    '.ac.ao',
    '.ac.mg',
    '.ac.mu',
    '.ac.sc',
    '.ac.km',
    '.ac.dj',
    '.ac.so',
    '.ac.et',
    '.ac.sd',
    '.ac.ly',
    '.ac.tn',
    '.ac.dz',
    '.ac.mr',
    '.ac.sn',
    '.ac.gm',
    '.ac.gn',
    '.ac.sl',
    '.ac.lr',
    '.ac.ci',
    '.ac.gh',
    '.ac.tg',
    '.ac.bj',
    '.ac.ne',
    '.ac.bf',
    '.ac.ml',
    '.ac.cv',
    '.ac.gw',
    '.ac.gn',
    '.ac.gm',
    '.ac.sn',
    '.ac.mr',
    '.ac.dz',
    '.ac.tn',
    '.ac.ly',
    '.ac.sd',
    '.ac.et',
    '.ac.so',
    '.ac.dj',
    '.ac.km',
    '.ac.sc',
    '.ac.mu',
    '.ac.mg',
    '.ac.ao',
    '.ac.mz',
    '.ac.sz',
    '.ac.ls',
    '.ac.mw',
    '.ac.zm',
    '.ac.bw',
    '.ac.rw',
    '.ac.ug',
    '.ac.tz',
    '.ac.ke',
    '.ac.ng',
    '.ac.eg',
    '.ac.ma',
    '.ac.ae',
    '.ac.ph',
    '.ac.id',
    '.ac.my',
    '.ac.sg',
    '.ac.th',
    '.ac.il',
    '.ac.ca',
    '.ac.au',
    '.ac.nz',
    '.ac.za',
    '.ac.in',
    '.ac.kr',
    '.ac.jp',
    '.ac.uk',
    '.edu'
  ]
  
  return eduDomains.some(domain => email.toLowerCase().endsWith(domain))
}
