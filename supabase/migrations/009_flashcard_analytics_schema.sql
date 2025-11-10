-- Migration: Flashcard Analytics Schema for Tracking
-- Description: Creates tables to track flashcard study interactions, card states, and daily analytics
-- Author: AI Assistant
-- Date: 2024

-- Create flashcard_reviews table to track each review interaction
CREATE TABLE flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flashcard_set_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    flashcard_id INTEGER NOT NULL,  -- Index of the card in the cards JSONB array
    rating TEXT NOT NULL CHECK (rating IN ('again', 'good', 'easy')),
    time_taken DECIMAL(10, 2) NOT NULL,  -- Time in seconds
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create flashcard_card_states table to track Anki-like state for each card
CREATE TABLE flashcard_card_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flashcard_set_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    flashcard_id INTEGER NOT NULL,  -- Index of the card in the cards JSONB array
    interval INTEGER NOT NULL DEFAULT 1,  -- Interval in minutes
    due_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    correct_streak INTEGER NOT NULL DEFAULT 0,
    easy_count INTEGER NOT NULL DEFAULT 0,
    is_finished BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, flashcard_set_id, flashcard_id)  -- One state per card per user
);

-- Create flashcard_daily_analytics table to track daily stats per user
CREATE TABLE flashcard_daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_reviewed INTEGER NOT NULL DEFAULT 0,
    again_count INTEGER NOT NULL DEFAULT 0,
    good_count INTEGER NOT NULL DEFAULT 0,
    easy_count INTEGER NOT NULL DEFAULT 0,
    total_finished INTEGER NOT NULL DEFAULT 0,
    total_time_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Total time in seconds
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)  -- One record per user per day
);

-- Create performance indexes for flashcard_reviews
CREATE INDEX idx_flashcard_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX idx_flashcard_reviews_flashcard_set_id ON flashcard_reviews(flashcard_set_id);
CREATE INDEX idx_flashcard_reviews_user_set ON flashcard_reviews(user_id, flashcard_set_id);
CREATE INDEX idx_flashcard_reviews_reviewed_at ON flashcard_reviews(reviewed_at);

-- Create performance indexes for flashcard_card_states
CREATE INDEX idx_flashcard_card_states_user_id ON flashcard_card_states(user_id);
CREATE INDEX idx_flashcard_card_states_flashcard_set_id ON flashcard_card_states(flashcard_set_id);
CREATE INDEX idx_flashcard_card_states_user_set ON flashcard_card_states(user_id, flashcard_set_id);
CREATE INDEX idx_flashcard_card_states_due_time ON flashcard_card_states(due_time);
CREATE INDEX idx_flashcard_card_states_is_finished ON flashcard_card_states(is_finished);

-- Create performance indexes for flashcard_daily_analytics
CREATE INDEX idx_flashcard_daily_analytics_user_id ON flashcard_daily_analytics(user_id);
CREATE INDEX idx_flashcard_daily_analytics_date ON flashcard_daily_analytics(date);
CREATE INDEX idx_flashcard_daily_analytics_user_date ON flashcard_daily_analytics(user_id, date);

-- Add constraints
ALTER TABLE flashcard_reviews ADD CONSTRAINT flashcard_reviews_time_taken_positive 
    CHECK (time_taken >= 0);
ALTER TABLE flashcard_reviews ADD CONSTRAINT flashcard_reviews_flashcard_id_positive 
    CHECK (flashcard_id >= 0);

ALTER TABLE flashcard_card_states ADD CONSTRAINT flashcard_card_states_interval_positive 
    CHECK (interval > 0);
ALTER TABLE flashcard_card_states ADD CONSTRAINT flashcard_card_states_correct_streak_non_negative 
    CHECK (correct_streak >= 0);
ALTER TABLE flashcard_card_states ADD CONSTRAINT flashcard_card_states_easy_count_non_negative 
    CHECK (easy_count >= 0);
ALTER TABLE flashcard_card_states ADD CONSTRAINT flashcard_card_states_flashcard_id_positive 
    CHECK (flashcard_id >= 0);

ALTER TABLE flashcard_daily_analytics ADD CONSTRAINT flashcard_daily_analytics_counts_non_negative 
    CHECK (total_reviewed >= 0 AND again_count >= 0 AND good_count >= 0 AND easy_count >= 0 AND total_finished >= 0);
ALTER TABLE flashcard_daily_analytics ADD CONSTRAINT flashcard_daily_analytics_time_spent_non_negative 
    CHECK (total_time_spent >= 0);

-- Add table comments
COMMENT ON TABLE flashcard_reviews IS 'Stores individual flashcard review interactions (again/good/easy ratings)';
COMMENT ON TABLE flashcard_card_states IS 'Stores Anki-like state for each flashcard (interval, due_time, streaks, finished status)';
COMMENT ON TABLE flashcard_daily_analytics IS 'Stores daily flashcard study statistics per user (resets at midnight)';

-- Enable Row Level Security (RLS)
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_card_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_daily_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for flashcard_reviews table
CREATE POLICY "Users can view their own flashcard reviews" ON flashcard_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard reviews" ON flashcard_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard reviews" ON flashcard_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcard_card_states table
CREATE POLICY "Users can view their own flashcard card states" ON flashcard_card_states
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard card states" ON flashcard_card_states
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard card states" ON flashcard_card_states
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard card states" ON flashcard_card_states
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcard_daily_analytics table
CREATE POLICY "Users can view their own flashcard daily analytics" ON flashcard_daily_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard daily analytics" ON flashcard_daily_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard daily analytics" ON flashcard_daily_analytics
    FOR UPDATE USING (auth.uid() = user_id);

