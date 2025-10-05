## Tech Stack
- **Frontend**: Next.js(React) + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database/Auth/Storage**: Supabase
- **AI Models**: Hugging Face Transformers (local, free)
- **File Handling**: PyPDF2 / pdfplumber (PDF), python-docx (DOCX), Tesseract OCR (images)
- **Deployment**: Local only (but structured SaaS-ready)

## Styling FrontEnd
- Default font: **Space Grotesk** (import via Google Fonts).
- Color palette:
  - Primary: #892CDC
  - Secondary: #F3F3F3
  - Dark: #191A23
  - Accent: #BC6FF1
- All sections, cards, and buttons must have **rounded corners** with a **black outline**.
- Buttons and cards should have **hover animations**:
  - Slight scale-up
  - Soft shadow
- Backgrounds should follow the provided color palette (primary sections in purple, content cards in light or dark backgrounds).
- Layout should **not be oversized**; keep proportions clean and balanced.
- Maintain a **minimalist, modern design** with good spacing.
- Ensure all components are **responsive** (mobile-first using Tailwind breakpoints).