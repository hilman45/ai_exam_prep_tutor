-- Migration: Storage bucket policies for folder pictures
-- Description: Sets up RLS policies for the avatars storage bucket to allow users to upload and view folder pictures
-- Author: AI Assistant
-- Date: 2024

-- Note: This assumes you've already created the 'avatars' bucket in Supabase Storage
-- If the bucket doesn't exist, create it first in the Supabase Dashboard:
-- Storage → New bucket → Name: "avatars" → Public: Yes

-- Policy: Allow authenticated users to upload folder pictures for their own folders
-- Files are uploaded as: folder-pictures/folder-{folder_id}-{timestamp}.{ext}
-- Users can only upload if the folder belongs to them
-- Extract folder_id (UUID) from path using regex pattern (case-insensitive)
-- UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
CREATE POLICY "Users can upload folder pictures for their own folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id::text = LOWER((regexp_match(name, 'folder-pictures/folder-([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})-'))[1])
    AND folders.user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users to update folder pictures for their own folders
CREATE POLICY "Users can update folder pictures for their own folders"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id::text = LOWER((regexp_match(name, 'folder-pictures/folder-([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})-'))[1])
    AND folders.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id::text = LOWER((regexp_match(name, 'folder-pictures/folder-([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})-'))[1])
    AND folders.user_id = auth.uid()
  )
);

-- Policy: Allow public to view folder pictures (for displaying images)
-- This allows anyone to view folder pictures via public URL
CREATE POLICY "Public can view folder pictures"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%'
);

-- Policy: Allow authenticated users to delete folder pictures for their own folders
CREATE POLICY "Users can delete folder pictures for their own folders"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id::text = LOWER((regexp_match(name, 'folder-pictures/folder-([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})-'))[1])
    AND folders.user_id = auth.uid()
  )
);

