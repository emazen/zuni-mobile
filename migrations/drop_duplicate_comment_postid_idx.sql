-- Remove duplicate index on Comment.postId (keep only one)
DROP INDEX IF EXISTS "Comment_postId_idx1";
