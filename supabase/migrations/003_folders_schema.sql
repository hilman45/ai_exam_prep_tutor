-- Migration: Add folders functionality to AI Exam-Prep Tutor
-- Description: Creates folders table and adds folder relationships to existing tables
-- Author: AI Assistant
-- Date: 2024

-- Create folders table
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#E9D5FF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_name ON folders(name);

-- Add constraints
ALTER TABLE folders ADD CONSTRAINT folders_name_not_empty CHECK (name IS NOT NULL AND name != '');
ALTER TABLE folders ADD CONSTRAINT folders_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50);
ALTER TABLE folders ADD CONSTRAINT folders_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- Add folder_id to existing tables
ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE summaries ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE quizzes ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE flashcards ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes for folder relationships
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_summaries_folder_id ON summaries(folder_id);
CREATE INDEX idx_quizzes_folder_id ON quizzes(folder_id);
CREATE INDEX idx_flashcards_folder_id ON flashcards(folder_id);

-- Enable Row Level Security (RLS) for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders table
CREATE POLICY "Users can view their own folders" ON folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON folders
    FOR DELETE USING (auth.uid() = user_id);

-- Add table comment
COMMENT ON TABLE folders IS 'Stores user folders for organizing materials (notes, quizzes, flashcards)';

-- Add column comments
COMMENT ON COLUMN folders.color IS 'Hex color code for folder display (from predefined palette)';
COMMENT ON COLUMN folders.name IS 'Folder name (1-50 characters)';

-- Create function to automatically create "Untitled" folder for new users
CREATE OR REPLACE FUNCTION create_default_folder_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Use SECURITY DEFINER to run with elevated privileges
    -- This bypasses RLS policies for the trigger
    INSERT INTO folders (user_id, name, color)
    VALUES (NEW.id, 'Untitled', '#E9D5FF');
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create default folder for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default folder when user signs up
CREATE TRIGGER create_default_folder_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_folder_for_new_user();

-- Add comment for the trigger
COMMENT ON FUNCTION create_default_folder_for_new_user() IS 'Automatically creates an "Untitled" folder for new users when they sign up';
