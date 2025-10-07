-- Migration: Remove automatic folder creation trigger
-- Description: Remove the trigger and handle folder creation in backend instead
-- Author: AI Assistant
-- Date: 2024

-- Drop the trigger and function
DROP TRIGGER IF EXISTS create_default_folder_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_default_folder_for_new_user();
