-- Migration: Storage bucket policies for avatars
-- Description: Sets up RLS policies for the avatars storage bucket to allow users to upload and view profile pictures
-- Author: AI Assistant
-- Date: 2024

-- Note: This assumes you've already created the 'avatars' bucket in Supabase Storage
-- If the bucket doesn't exist, create it first in the Supabase Dashboard:
-- Storage → New bucket → Name: "avatars" → Public: Yes

-- Policy: Allow authenticated users to upload their own profile pictures
-- Files are uploaded as: profile-pictures/{user_id}-{timestamp}.{ext}
-- Users can only upload files that start with their user_id
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'profile-pictures/' || auth.uid()::text || '-%'
);

-- Policy: Allow authenticated users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE 'profile-pictures/' || auth.uid()::text || '-%'
)
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'profile-pictures/' || auth.uid()::text || '-%'
);

-- Policy: Allow public to view profile pictures (for displaying avatars)
-- This allows anyone to view profile pictures via public URL
CREATE POLICY "Public can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE 'profile-pictures/' || auth.uid()::text || '-%'
);

