-- Migration: Initial Schema for AI Exam-Prep Tutor
-- Description: Creates tables for files, summaries, quizzes, and flashcards with proper relationships
-- Author: AI Assistant
-- Date: 2024

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    text_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    questions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create flashcards table
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cards JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_file_id ON summaries(file_id);
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quizzes_file_id ON quizzes(file_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_file_id ON flashcards(file_id);

-- Add constraints
ALTER TABLE files ADD CONSTRAINT files_filename_not_null CHECK (filename IS NOT NULL AND filename != '');
ALTER TABLE summaries ADD CONSTRAINT summaries_text_not_empty CHECK (summary_text IS NOT NULL AND summary_text != '');
ALTER TABLE quizzes ADD CONSTRAINT quizzes_questions_not_empty CHECK (questions IS NOT NULL AND jsonb_array_length(questions) > 0);
ALTER TABLE flashcards ADD CONSTRAINT flashcards_cards_not_empty CHECK (cards IS NOT NULL AND jsonb_array_length(cards) > 0);

-- Add table comments with example JSON structures
COMMENT ON TABLE files IS 'Stores uploaded lecture notes and extracted text content';
COMMENT ON TABLE summaries IS 'Stores AI-generated summaries of uploaded files';
COMMENT ON TABLE quizzes IS 'Stores AI-generated quiz questions in JSONB format';
COMMENT ON TABLE flashcards IS 'Stores AI-generated flashcards in JSONB format';

-- Example JSON structure for quizzes
COMMENT ON COLUMN quizzes.questions IS 'JSONB array of quiz questions. Example: [{"id": 1, "question": "What is...?", "type": "multiple_choice", "options": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "Because..."}]';

-- Example JSON structure for flashcards
COMMENT ON COLUMN flashcards.cards IS 'JSONB array of flashcards. Example: [{"id": 1, "term": "Photosynthesis", "definition": "Process by which plants convert light energy to chemical energy", "difficulty": "easy"}, {"id": 2, "term": "Mitosis", "definition": "Cell division process", "difficulty": "medium"}]';

-- Enable Row Level Security (RLS)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for files table
CREATE POLICY "Users can view their own files" ON files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON files
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for summaries table
CREATE POLICY "Users can view their own summaries" ON summaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries" ON summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries" ON summaries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries" ON summaries
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for quizzes table
CREATE POLICY "Users can view their own quizzes" ON quizzes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes" ON quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes" ON quizzes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcards table
CREATE POLICY "Users can view their own flashcards" ON flashcards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" ON flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" ON flashcards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" ON flashcards
    FOR DELETE USING (auth.uid() = user_id);
