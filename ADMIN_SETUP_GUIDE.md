# Admin Setup Guide

## Step 1: Find Your User Information

You need to find either your `user_id` or `username` to make yourself an admin.

### Option A: Find by Username (Easiest)
If you know your username, you can skip to Step 2.

### Option B: Find by Email
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Find your user account (by email)
4. Copy the **User UID** (this is your `user_id`)

### Option C: Query in SQL Editor
Run this query in Supabase SQL Editor to see all users:

```sql
SELECT 
    user_id,
    username,
    email,
    is_admin
FROM user_profiles
JOIN auth.users ON user_profiles.user_id = auth.users.id;
```

## Step 2: Make a User an Admin

### Method 1: Using SQL Editor (Recommended)

1. Go to Supabase Dashboard → **SQL Editor**
2. Run one of these queries:

**By Username:**
```sql
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE username = 'your_username_here';
```

**By User ID:**
```sql
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE user_id = 'your_user_id_here';
```

**Example:**
```sql
-- If your username is "admin"
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE username = 'admin';
```

3. Verify the update:
```sql
SELECT username, is_admin 
FROM user_profiles 
WHERE username = 'your_username_here';
```

### Method 2: Using Supabase Dashboard Table Editor

1. Go to **Table Editor** → **user_profiles**
2. Find your user row
3. Click on the row to edit
4. Set `is_admin` to `true`
5. Save

## Step 3: Test the Admin Dashboard

1. **Start your backend server** (if not running):
   ```bash
   cd ai-exam-prep-tutor/backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start your frontend server** (if not running):
   ```bash
   cd ai-exam-prep-tutor/frontend
   npm run dev
   ```

3. **Login** to your application with the admin account

4. **Navigate to Admin Dashboard**:
   - Go to: `http://localhost:3000/admin`
   - Or manually type `/admin` in the URL

5. **Verify Access**:
   - You should see the admin dashboard with 6 overview cards
   - If you see "Access Denied", double-check that `is_admin = TRUE` in the database

## Step 4: Verify Admin Status (Optional)

You can verify your admin status by checking:

```sql
SELECT 
    username,
    is_admin,
    created_at
FROM user_profiles
WHERE is_admin = TRUE;
```

## Troubleshooting

### "Access Denied" Error
- Make sure you ran the UPDATE query successfully
- Verify `is_admin = TRUE` in the database
- Try logging out and logging back in
- Clear browser cache/localStorage

### Dashboard Shows Zero Values
- This is normal if you don't have data yet
- Create some quizzes, flashcards, or notes to see statistics
- The counts will update as users interact with the system

### Backend Error
- Make sure your backend server is running
- Check that `SUPABASE_SERVICE_KEY` is set in your `.env` file
- Verify the admin endpoint is accessible: `http://localhost:8000/admin/dashboard/stats`

## Making Multiple Users Admin

To make multiple users admin, you can:

```sql
-- Make multiple users admin by username
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE username IN ('admin1', 'admin2', 'admin3');

-- Or by user_id
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE user_id IN ('uuid1', 'uuid2', 'uuid3');
```

## Removing Admin Access

To remove admin access:

```sql
UPDATE user_profiles 
SET is_admin = FALSE 
WHERE username = 'username_here';
```

Summary
Use user_id from user_profiles (or username if known).
The user_id should match auth.users.id when data is correct.
If they don't match, fix the user_id first, then set admin.