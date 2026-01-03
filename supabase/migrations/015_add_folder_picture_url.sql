-- Migration: Add picture_url column to folders table
-- Description: Allows users to upload custom pictures for folders to replace the default first letter display
-- Author: AI Assistant
-- Date: 2024

-- Add picture_url column to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add comment for the column
COMMENT ON COLUMN folders.picture_url IS 'URL to custom picture for folder display. If null, displays first letter of folder name.';

