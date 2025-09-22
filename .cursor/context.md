# 📘 Project Context — AI Exam-Prep Tutor (FYP)

## Purpose & Goal
Build an **AI Exam-Prep Tutor** that helps students prepare for exams by:
- Uploading lecture notes (PDF, DOCX, TXT, images → OCR → text).
- Generating **summaries, quizzes, and flashcards**.
- Saving generated content so users can access it anytime later.
- Allowing users to delete notes, summaries, quizzes, or flashcards.

The project is structured like a SaaS app but will run locally (not deployed for now).

---

## Problems Being Solved
- Students struggle with information overload → AI summarizes lecture notes.
- Past-paper style quizzes are scarce → AI generates practice quizzes.
- Flashcards take time to make manually → AI generates them automatically.
- Students want access later → all results are saved for reuse or deletion.

---

## Features
- **Authentication**: Supabase Auth (email/password).
- **Upload Notes**: PDF, DOCX, TXT, Image → extract text.
- **Summarization**: Hugging Face models (chunk text if too long).
- **Quiz Generation**: MCQ or short answer (JSON format).
- **Flashcards**: Term/definition pairs (JSON format).
- **Profile Page**: User info, uploaded files, saved results.
- **Delete Options**: Delete single result or entire file (cascade delete).
- **Error Handling**: Invalid/corrupt files, large files, unreadable text.

---

## Key Considerations
- Must handle **token limits** → split (chunk) long text before sending to model.
- Security → only owner can access their uploaded files and results.
- UX → progress indicators, error messages, clear UI.
- Extensibility → schema should allow analytics tracking in the future.