# Setup Guide: Folder Pictures Storage

This guide will help you set up Supabase Storage for folder pictures.

## Prerequisites

- Access to your Supabase Dashboard
- Supabase project with the `folders` table already created

## Step 1: Create the Storage Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Configure the bucket:
   - **Name**: `avatars` (this bucket is shared with profile pictures)
   - **Public bucket**: ✅ **Yes** (checked) - Required for public image URLs
   - **File size limit**: `5MB` (or your preference)
   - **Allowed MIME types**: `image/*` (optional, for validation)
5. Click **"Create bucket"**

## Step 2: Run the Migration

After creating the bucket, run the migration to set up the RLS policies:

```bash
# If using Supabase CLI
supabase migration up

# Or apply the migration manually in Supabase Dashboard:
# SQL Editor → New query → Paste contents of:
# supabase/migrations/016_folder_pictures_storage_policies.sql
```

The migration file is located at: `supabase/migrations/016_folder_pictures_storage_policies.sql`

## Step 3: Verify Setup

1. The migration creates 4 RLS policies:
   - ✅ Users can upload folder pictures for their own folders
   - ✅ Users can update folder pictures for their own folders
   - ✅ Public can view folder pictures
   - ✅ Users can delete folder pictures for their own folders

2. Test the setup:
   - Try uploading a folder picture from the dashboard
   - Verify the image appears correctly
   - Check that only the folder owner can manage the picture

## How It Works

- **Storage Path**: `folder-pictures/folder-{folder_id}-{timestamp}.{ext}`
- **Security**: Users can only upload/update/delete pictures for folders they own
- **Public Access**: Images are publicly viewable via URL (for displaying in the UI)
- **Ownership Check**: Policies verify folder ownership by checking the `folders` table

## Troubleshooting

**Issue**: Upload fails with "Storage upload failed"
- **Solution**: Ensure the `avatars` bucket exists and is public

**Issue**: "Policy violation" error
- **Solution**: Verify the migration ran successfully and policies are active

**Issue**: Images not displaying
- **Solution**: Check that the bucket is set to "Public" and the SELECT policy is active

## Notes

- The `avatars` bucket is shared between profile pictures and folder pictures
- Folder pictures are stored in the `folder-pictures/` subdirectory
- The code automatically falls back to data URLs if storage is unavailable (for development)

