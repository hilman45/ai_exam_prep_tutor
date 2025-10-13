-- Migration: Add custom name field to summaries table
-- Description: Adds custom_name field to store user-defined note names instead of filename
-- Author: AI Assistant
-- Date: 2024

-- Add custom_name column to summaries table
ALTER TABLE summaries ADD COLUMN custom_name TEXT;

-- Add constraint to ensure custom_name is not empty when provided
ALTER TABLE summaries ADD CONSTRAINT summaries_custom_name_not_empty 
    CHECK (custom_name IS NULL OR (custom_name IS NOT NULL AND custom_name != ''));

-- Add index for performance
CREATE INDEX idx_summaries_custom_name ON summaries(custom_name);

-- Add column comment
COMMENT ON COLUMN summaries.custom_name IS 'User-defined custom name for the note (overrides filename display)';
