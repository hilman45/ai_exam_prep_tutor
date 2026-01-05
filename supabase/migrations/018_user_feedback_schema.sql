-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  rating VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved
  admin_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries (using IF NOT EXISTS equivalent by checking first)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_feedback_user_id') THEN
    CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_feedback_created_at') THEN
    CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_feedback_status') THEN
    CREATE INDEX idx_user_feedback_status ON user_feedback(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_feedback_category') THEN
    CREATE INDEX idx_user_feedback_category ON user_feedback(category);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Users can insert their own feedback'
  ) THEN
    CREATE POLICY "Users can insert their own feedback"
    ON user_feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can view their own feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Users can view their own feedback'
  ) THEN
    CREATE POLICY "Users can view their own feedback"
    ON user_feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Admins can view all feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Admins can view all feedback'
  ) THEN
    CREATE POLICY "Admins can view all feedback"
    ON user_feedback FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.is_admin = TRUE
      )
    );
  END IF;
END $$;

-- Policy: Admins can update feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Admins can update feedback'
  ) THEN
    CREATE POLICY "Admins can update feedback"
    ON user_feedback FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.is_admin = TRUE
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.is_admin = TRUE
      )
    );
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_user_feedback_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON user_feedback TO authenticated;
GRANT ALL ON user_feedback TO service_role;
