-- Migration: Add User Active Status
-- Description: Adds is_active boolean field to user_profiles table for user management
-- Author: AI Assistant
-- Date: 2024

-- Add is_active column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for performance when filtering active users
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- Add table comment
COMMENT ON COLUMN user_profiles.is_active IS 'Indicates if the user account is active. Inactive users cannot log in.';

