-- Migration: Add custom name field to quizzes table
-- Description: Adds custom_name field to store user-defined quiz names instead of filename
-- Author: AI Assistant
-- Date: 2024

-- Add custom_name column to quizzes table
ALTER TABLE quizzes ADD COLUMN custom_name TEXT;

-- Add constraint to ensure custom_name is not empty when provided
ALTER TABLE quizzes ADD CONSTRAINT quizzes_custom_name_not_empty 
    CHECK (custom_name IS NULL OR (custom_name IS NOT NULL AND custom_name != ''));

-- Add index for performance
CREATE INDEX idx_quizzes_custom_name ON quizzes(custom_name);

-- Add column comment
COMMENT ON COLUMN quizzes.custom_name IS 'User-defined custom name for the quiz (overrides filename display)';
