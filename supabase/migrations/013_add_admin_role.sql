-- Migration: Add Admin Role to User Profiles
-- Description: Adds is_admin boolean field to user_profiles table for admin access control
-- Author: AI Assistant
-- Date: 2024

-- Add is_admin column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for performance when checking admin status
CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin);

-- Add table comment
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates if the user has admin privileges. Only admins can access admin dashboard and features.';

-- Note: To make a user an admin, run:
-- UPDATE user_profiles SET is_admin = TRUE WHERE user_id = '<user_id>';
-- Or by username:
-- UPDATE user_profiles SET is_admin = TRUE WHERE username = '<username>';

