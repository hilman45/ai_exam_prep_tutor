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
  - Blue : #0f5bff
  
- All sections, cards, and buttons must have **rounded corners** 
- Buttons and cards should have **hover animations**:
  - Slight scale-up
  - Soft shadow
- Backgrounds should follow the provided color palette (primary sections in purple, content cards in light or dark backgrounds).
- Layout should **not be oversized**; keep proportions clean and balanced.
- Maintain a **minimalist, modern design** with good spacing.
- Ensure all components are **responsive** (mobile-first using Tailwind breakpoints).

## Folder Colors
When users create accounts, they automatically get an "Untitled" folder. When users add new folders, each folder should have a different color from the following palette:

**Folder Color Palette:**
- Light Lavender: #E9D5FF
- Sky Blue: #BAE6FD
- Mint Green: #BBF7D0
- Soft Yellow: #FEF9C3
- Blush Pink: #FBCFE8
- Pale Orange: #FED7AA

**Folder Styling Guidelines:**
- Use dark text (#1E293B or text-slate-800) for readability on colored backgrounds
- Add a thin border (#E2E8F0 or border-slate-200) for separation
- Apply hover effects like hover:brightness-95 or hover:shadow-sm for smooth interactions
- Cycle through colors for new folders to ensure visual variety