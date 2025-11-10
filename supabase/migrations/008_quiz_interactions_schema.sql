-- Migration: Quiz Interactions Schema for Analytics Tracking
-- Description: Creates table to track user quiz performance for analytics
-- Author: AI Assistant
-- Date: 2024

-- Create quiz_interactions table
CREATE TABLE quiz_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken DECIMAL(10, 2) NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX idx_quiz_interactions_user_id ON quiz_interactions(user_id);
CREATE INDEX idx_quiz_interactions_quiz_id ON quiz_interactions(quiz_id);
CREATE INDEX idx_quiz_interactions_user_quiz ON quiz_interactions(user_id, quiz_id);
CREATE INDEX idx_quiz_interactions_answered_at ON quiz_interactions(answered_at);

-- Add constraints
ALTER TABLE quiz_interactions ADD CONSTRAINT quiz_interactions_time_taken_positive 
    CHECK (time_taken >= 0);
ALTER TABLE quiz_interactions ADD CONSTRAINT quiz_interactions_question_id_positive 
    CHECK (question_id >= 0);

-- Add table comment
COMMENT ON TABLE quiz_interactions IS 'Stores user quiz answer interactions for analytics tracking';

-- Enable Row Level Security (RLS)
ALTER TABLE quiz_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_interactions table
CREATE POLICY "Users can view their own quiz interactions" ON quiz_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz interactions" ON quiz_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz interactions" ON quiz_interactions
    FOR DELETE USING (auth.uid() = user_id);

