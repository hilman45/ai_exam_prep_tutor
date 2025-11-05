-- Migration: Add custom name field to flashcards table
-- Description: Adds custom_name field to store user-defined flashcard names instead of filename
-- Author: AI Assistant
-- Date: 2024

-- Add custom_name column to flashcards table
ALTER TABLE flashcards ADD COLUMN custom_name TEXT;

-- Add constraint to ensure custom_name is not empty when provided
ALTER TABLE flashcards ADD CONSTRAINT flashcards_custom_name_not_empty 
    CHECK (custom_name IS NULL OR (custom_name IS NOT NULL AND custom_name != ''));

-- Add index for performance
CREATE INDEX idx_flashcards_custom_name ON flashcards(custom_name);

-- Add column comment
COMMENT ON COLUMN flashcards.custom_name IS 'User-defined custom name for the flashcard set (overrides filename display)';

