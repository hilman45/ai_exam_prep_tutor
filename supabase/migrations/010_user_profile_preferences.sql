-- Migration: Extend user_profiles table
-- Description: Adds full_name and profile_picture_url to user_profiles for profile management
-- Author: AI Assistant
-- Date: 2024

-- Add new columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add constraint for full_name length
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_full_name_length 
CHECK (full_name IS NULL OR (char_length(full_name) >= 1 AND char_length(full_name) <= 100));

