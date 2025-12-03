import { z } from 'zod'

// Post creation schema
export const createPostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less')
    .trim(),
  image: z.string().url().nullable().optional(),
})

// Comment creation schema
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Comment must be 2,000 characters or less')
    .trim(),
  image: z.string().url().nullable().optional(),
})

// Email verification schema
export const resendVerificationSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .optional(),
})

// Type exports
export type CreatePostInput = z.infer<typeof createPostSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

