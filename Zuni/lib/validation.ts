import { z } from 'zod'

// Post creation schema
export const createPostSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .trim(),
  content: z.string()
    .max(10000, 'Content must be 10,000 characters or less')
    .trim()
    .optional()
    .default(''),
  image: z.string().url().nullable().optional(),
  audio: z.string().url().nullable().optional(),
}).refine(
  (data) => {
    // At least one of content, image, or audio must be provided
    const hasContent = data.content && data.content.trim().length > 0;
    const hasImage = !!data.image;
    const hasAudio = !!data.audio;
    return hasContent || hasImage || hasAudio;
  },
  {
    message: 'Post must have at least content, image, or audio',
  }
)

// Comment creation schema
export const createCommentSchema = z.object({
  content: z.string()
    .max(2000, 'Comment must be 2,000 characters or less')
    .trim()
    .optional()
    .default(''),
  image: z.string().url().nullable().optional(),
  audio: z.string().url().nullable().optional(),
}).refine(
  (data) => {
    // At least one of content, image, or audio must be provided
    const hasContent = data.content && data.content.trim().length > 0;
    const hasImage = !!data.image;
    const hasAudio = !!data.audio;
    return hasContent || hasImage || hasAudio;
  },
  {
    message: 'Comment must have at least content, image, or audio',
  }
)

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

