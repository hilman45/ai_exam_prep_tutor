-- Migration: Add user_profiles table for storing usernames
-- Description: Creates a user_profiles table to store additional user information like usernames
-- Author: AI Assistant
-- Date: 2024

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Add constraints
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_not_empty CHECK (username IS NOT NULL AND username != '');
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles table
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE user_profiles IS 'Stores additional user profile information like usernames';
