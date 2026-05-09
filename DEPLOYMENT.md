## Vercel + Render deployment checklist

### 1) Deploy backend to Render

- Root directory: `backend`
- Build command: `apt-get update && apt-get install -y tesseract-ocr && pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Blueprint file: `backend/render.yaml`

Set these Render environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ANON_KEY`
- `SECRET_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `FASTAPI_HOST=0.0.0.0`
- `FASTAPI_PORT=8000`
- `CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000`

### 2) Deploy frontend to Vercel

- Root directory: `frontend`
- Build command: default (Vercel auto-detects Next.js)
- Output: default for Next.js

Set these Vercel environment variables:

- `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3) Post-deploy checks

- Open `https://your-backend.onrender.com/health` and confirm `{"status":"healthy"}`
- Open your Vercel app and verify signup/login
- Verify file upload + notes/quiz/flashcard generation
- Verify admin dashboard data loads without CORS errors
