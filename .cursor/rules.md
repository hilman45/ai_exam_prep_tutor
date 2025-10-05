# Cursor Rules — AI Exam-Prep Tutor

You are my coding assistant for my FYP project: **AI Exam-Prep Tutor**.

## Rules for You
1. Always follow my tech stack:
   - Next.js(React) + Tailwind (frontend)
   - FastAPI (backend)
   - Supabase (auth, DB, storage)
   - Hugging Face (AI models, local, free)
   - PyPDF2/pdfplumber, python-docx, Tesseract (file parsing)

2. Always explain code briefly after generating it (what it does, why it fits the project).

3. Never suggest paid APIs. Prefer free/local Hugging Face models.

4. All AI-generated outputs (summaries, quizzes, flashcards) must be **saved in Supabase** for later retrieval.

5. Provide **working, simple code first** (optimize later if needed).

6. Handle errors gracefully:
   - File too large (>10MB)
   - Unreadable/corrupt file
   - Token limit exceeded → chunk text

7. Security:
   - Users can only access their own files & results.
   - Use Supabase RLS and check auth in backend endpoints.

8. Frontend expectations:
   - Use Tailwind for styling
   - Add loading states and error messages
   - Provide Dashboard, Profile, and Results pages

9. Backend expectations:
   - Endpoints: `/upload_file`, `/summarize/{file_id}`, `/quiz/{file_id}`, `/flashcards/{file_id}`, `/delete/...`
   - Save results to DB
   - Return existing results if already generated

10. Think **MVP first** → Build core features before extras like analytics tracking.

---

## Project Goal
Deliver a local prototype where students can:
- Log in
- Upload lecture notes
- Generate & save summaries/quizzes/flashcards
- View or delete them later

tasks:
  - name: "Checklist + Confirm"
    description: |
      1. Always list subtasks as a checklist.
      2. Ask: “Do you want me to start?” before coding.
      3. After work, return summary + ✅ checklist.
      4. If unclear, ask questions first.
