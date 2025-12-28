-- Add performance indexes for faster queries
-- These indexes optimize queries on Post and Comment tables

-- Index for Post queries: filtering by universityId and ordering by createdAt
CREATE INDEX IF NOT EXISTS "Post_universityId_createdAt_idx" ON "Post"("universityId", "createdAt" DESC);

-- Index for Comment queries: filtering by postId and ordering by createdAt
CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt" DESC);

-- Composite index for Comment queries: filtering by postId and authorId, ordering by createdAt
CREATE INDEX IF NOT EXISTS "Comment_postId_authorId_createdAt_idx" ON "Comment"("postId", "authorId", "createdAt" DESC);
