-- Migration: Fix folder pictures storage policies
-- Description: Drops and recreates folder picture policies with improved regex matching
-- Author: AI Assistant
-- Date: 2024

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload folder pictures for their own folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can update folder pictures for their own folders" ON storage.objects;
DROP POLICY IF EXISTS "Public can view folder pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete folder pictures for their own folders" ON storage.objects;

-- Helper function to extract folder ID from storage path
CREATE OR REPLACE FUNCTION extract_folder_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
  folder_id_text TEXT;
BEGIN
  -- Extract UUID from path: folder-pictures/folder-{uuid}-{timestamp}.{ext}
  folder_id_text := (regexp_match(path, 'folder-pictures/folder-([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})-'))[1];
  IF folder_id_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN folder_id_text::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Policy: Allow authenticated users to upload folder pictures for their own folders
-- Files are uploaded as: folder-pictures/folder-{folder_id}-{timestamp}.{ext}
CREATE POLICY "Users can upload folder pictures for their own folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id = extract_folder_id_from_path(name)
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
    WHERE folders.id = extract_folder_id_from_path(name)
    AND folders.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE 'folder-pictures/folder-%' AND
  EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id = extract_folder_id_from_path(name)
    AND folders.user_id = auth.uid()
  )
);

-- Policy: Allow public to view folder pictures (for displaying images)
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
    WHERE folders.id = extract_folder_id_from_path(name)
    AND folders.user_id = auth.uid()
  )
);

