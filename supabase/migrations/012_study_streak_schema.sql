-- Migration: Add Study Streak Tracking to user_profiles
-- Description: Adds current_streak, longest_streak, and last_study_date columns to track consecutive study days
-- Author: AI Assistant
-- Date: 2024

-- Add study streak columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_study_date DATE;

-- Add constraints
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_current_streak_non_negative 
CHECK (current_streak >= 0);

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_longest_streak_non_negative 
CHECK (longest_streak >= 0);

-- Add index for performance (if needed for queries)
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_study_date ON user_profiles(last_study_date);

-- Add table comment
COMMENT ON COLUMN user_profiles.current_streak IS 'Current consecutive days of study';
COMMENT ON COLUMN user_profiles.longest_streak IS 'Longest consecutive days of study achieved';
COMMENT ON COLUMN user_profiles.last_study_date IS 'Last date the user studied (answered quiz or reviewed flashcard)';

