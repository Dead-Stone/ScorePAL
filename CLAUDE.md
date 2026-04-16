# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ScorePAL** is an AI-powered academic grading and analytics platform for educators. It provides:
- AI-powered assignment grading using multiple AI providers (OpenAI, Anthropic, Google Gemini, etc.)
- Canvas LMS integration for direct course synchronization
- Rubric management and automatic rubric generation
- Analytics dashboards with student performance insights
- Role-based access (Teachers, Graders, Students)
- AI chat assistant with role-specific guidance

**Stack:**
- Backend: FastAPI (Python 3.8+) with SQLAlchemy + MongoDB + optional Neo4j
- Frontend: Next.js 14 (TypeScript, React 18) with Material-UI and TailwindCSS
- Deployment: Docker, Railway, or local development

---

## Quick Start Commands

### Initial Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Configure environment
cp env.example .env
# Edit .env with your API keys (GEMINI_API_KEY, etc.)

# Create necessary directories
python -c "from backend.utils.directory_utils import ensure_directory_structure; ensure_directory_structure()"
```

### Development

**Start the full application** (both backend and frontend):
```bash
python start.py
# Opens frontend at http://localhost:3000
# Backend API available at http://localhost:8010/docs (Swagger UI)
```

**Backend only** (FastAPI on port 8010 with auto-reload):
```bash
cd backend
python -m uvicorn api:app --host 0.0.0.0 --port 8010 --reload
```

**Frontend only** (Next.js dev server on port 3000):
```bash
cd frontend
npm run dev
```

### Build & Deployment

**Build frontend** for production:
```bash
cd frontend && npm run build && npm start
```

**Lint frontend code**:
```bash
cd frontend && npm run lint
```

**Run Python tests** (if present):
```bash
pytest backend/tests/ -v
```

---

## Architecture Overview

### Backend Structure (`/backend`)

**Core Services:**
- `services/file_preprocessor.py` - Extracts text/data from PDFs, DOCX, images using OCR
- `services/grading_service.py` - Core grading engine that calls AI providers
- `services/mongodb_service.py` - MongoDB operations for submissions, assignments, results
- `services/results_service.py` - Stores and retrieves grading results

**API Routes** (`/backend/api/`):
- `canvas_routes.py` - Canvas LMS integration (sync courses, submissions, post grades)
- `results_routes.py` - Retrieve grading results and analytics
- `settings_routes.py` - User preferences and configuration
- `analytics_routes.py` - Dashboard statistics and insights
- `student_ai_routes.py` - Role-specific chat endpoints
- `credits_routes.py` - API credit/usage tracking
- `lti_routes.py` - LTI integration support
- `institution_routes.py` - Multi-institution management

**Key Utilities:**
- `rubric_api.py` - Rubric CRUD operations and validation
- `rubric_generation.py` - AI-powered rubric generation from question papers
- `chat_api.py` - Chat router with role-specific prompting
- `multi_agent_grading.py` - Multi-agent grading orchestration
- `ai_extraction_service.py` - AI-based content extraction
- `config.py` - Settings management (uses `pydantic-settings`)

**Database:**
- Primary: SQLAlchemy ORM with SQLite by default (can configure MongoDB/PostgreSQL)
- Optional: MongoDB for flexible submission/result storage
- Optional: Neo4j for knowledge graphs

**Authentication:**
- JWT-based (in `/backend/auth/`)
- Pydantic models for user roles: `User`, `UserRole` (Teacher, Grader, Student)

---

### Frontend Structure (`/frontend/src`)

**Pages** (`/pages/`):
- `dashboard.tsx` - Main dashboard (teacher/grader analytics)
- `grade.tsx` - Grading interface (upload files, set rubric, grade)
- `student/index.tsx` - Student view (view own grades)
- `profile.tsx` - User profile management
- `settings.tsx` - Application settings
- `results/index.tsx` - View grading results history
- `help.tsx` - Help documentation
- `_app.tsx` - App wrapper with providers

**Components** (`/components/`):
- `grading/` - Grading interface components
  - `CanvasGradingInterface.tsx` - Canvas integration UI
  - `CanvasIntegrationTab.tsx` - Canvas connection settings
  - `canvas/` - Canvas-specific components (assignment selector, utils)
- `dashboard/` - Dashboard components
  - `grader/` - Grader-specific dashboard (comparisons, statistics)
  - Charts, stats cards, student lists
- `layout/` - Layout components (TopNavBar, PageLayout)
- `settings/` - Settings UI components
- `analytics/` - Analytics tables and visualizations
- `ChatInterface.tsx` - AI chat component
- Common utilities in `common/`, `cards/`, `charts/`

**Utilities:**
- `utils/dataFetching.ts` - HTTP client for API calls
- `hooks/` - Custom React hooks
- `constants/design.ts` - Design tokens, colors, spacing
- `styles/globals.css` - Global styles

---

## Environment Configuration

Required variables (in `.env` root or `backend/.env`):

```bash
# REQUIRED: AI Model API Key (at least one)
GEMINI_API_KEY=              # Google Gemini (primary)
OPENAI_API_KEY=              # OpenAI (optional)
ANTHROPIC_API_KEY=           # Anthropic Claude (optional)

# Database (optional defaults shown)
DATABASE_URL=sqlite:///./data/database.db
# For MongoDB:
# MONGODB_URL=mongodb://localhost:27017
# MONGODB_DATABASE=scorepal

# Canvas LMS (for integration)
CANVAS_API_URL=https://your-institution.instructure.com
CANVAS_API_TOKEN=            # Teacher token from Canvas

# Email (for password reset/OTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Gmail App Password, not regular password

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8010

# Optional: Neo4j (knowledge graph)
USE_NEO4J=false
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=
```

See `env.example` and `EMAIL_SETUP.md` for detailed setup instructions.

---

## Data Flow & Key Workflows

### Grading Workflow

1. **File Upload** → FilePreprocessor extracts text/data (handles PDF, DOCX, images with OCR)
2. **Rubric Setup** → User selects or AI generates rubric from question paper
3. **AI Grading** → GradingService sends submission + rubric to selected AI provider
4. **Results Storage** → Grading results saved to MongoDB and indexed for retrieval
5. **Canvas Posting** → Results can be posted back to Canvas if integrated

### Canvas Integration

1. Teacher connects Canvas account via OAuth
2. Courses synced to database, assignments fetched
3. Submissions auto-synced from Canvas
4. After grading, scores posted back to Canvas
5. Analytics available in dashboard

### Multi-Role Support

- **Teachers**: Full access to grading, analytics, Canvas integration, rubric management
- **Graders**: View and compare student submissions, focused analytics
- **Students**: View own grades, assignments, and feedback
- All communicate via JWT authentication on protected endpoints

---

## Important Implementation Details

### File Processing

The `FilePreprocessor` handles:
- **PDFs**: PyPDF2 extraction + pytesseract OCR for images
- **DOCX**: `python-docx` extraction
- **Images**: pytesseract OCR
- **Jupyter Notebooks**: Treated as code files
- All files validated by MIME type using `python-magic`

Output stored in `/backend/data/uploads`, `/backend/data/processed_uploads`, `/backend/data/temp_uploads`

### AI Provider Abstraction

`GradingService` abstracts different providers (OpenAI, Anthropic, Google Gemini, etc.). To add a new provider:
1. Create provider class with unified interface
2. Add to provider registry in config
3. Update frontend AI model selector

### Database Schema

Primary models (in `/backend/models/`):
- `User` - Authentication, roles
- `Submission` - Student submission metadata
- `Assignment` - Canvas/local assignment definitions
- `GradingResult` - Grading output, scores, feedback
- `Rubric` - Grading criteria definitions

---

## Testing & Validation

**Key test data files:**
- `backend/scripts/create_test_users.py` - Setup test users for development
- Test submission files stored in `/backend/data/uploads` during development

**Validation endpoints:**
- `/docs` - Swagger UI at backend root
- `/health` - Backend health check
- Canvas API tokens validated on connection

---

## Common Development Tasks

### Adding a New Canvas Course Field

1. Update `models/submission.py` to include field
2. Update `canvas_routes.py` sync logic to extract field
3. Update frontend `CanvasIntegrationTab.tsx` if user-facing
4. Update analytics components if it's needed for reporting

### Adding a New Grading Criteria

1. Update `models/rubric.py` or define in rubric generation
2. Add to `GradingService` prompt templates
3. Update frontend grading interface to show new criteria
4. Test with sample submissions

### Adding a New AI Provider

1. Create provider wrapper in `/backend/services/` or update `ai_extraction_service.py`
2. Add API key to `.env` and config
3. Register in provider selection logic
4. Update frontend dropdown in `CanvasGradingInterface.tsx`

### Debugging Canvas Integration

1. Check `/backend/api/canvas_routes.py` for sync/posting logic
2. Verify Canvas token in `.env` with correct permissions
3. Check `/backend/data/synced_submissions/` for cached submissions
4. Frontend logs available in browser DevTools console

---

## Deployment Notes

**Docker:**
- `Dockerfile` builds both backend and frontend
- `docker-compose.yml` for local multi-container setup
- `docker.env` contains Docker-specific environment

**Railway:**
- Uses `app.py` as entrypoint (imports from `api.py`)
- Set environment variables in Railway dashboard
- Automatic port detection from `PORT` env var

**Production Considerations:**
- Use PostgreSQL or MongoDB instead of SQLite
- Enable HTTPS/TLS for Canvas integration
- Set secure CORS origins
- Rotate JWT secrets
- Use production email service (not just SMTP)
- Enable database backups

---

## Key File Locations & Purposes

```
/backend
  /api              - FastAPI route definitions
  /auth             - JWT authentication, user models
  /services         - Core business logic (grading, file processing)
  /models           - Pydantic/SQLAlchemy models
  /utils            - Helpers (directory, Neo4j, caching)
  /data             - Runtime data (uploads, results, rubrics)
  config.py         - Environment settings
  app.py            - Railway entrypoint
  api.py            - Main FastAPI app definition
  start.py          - Development startup script (in root)

/frontend
  /src
    /pages          - Next.js pages (routes)
    /components     - React components by domain
    /utils          - Frontend utilities (API calls, helpers)
    /hooks          - Custom React hooks
    /constants      - Design tokens, config
    /styles         - Global styles
  package.json      - npm dependencies
  tsconfig.json     - TypeScript config
  next.config.js    - Next.js config
```

---

## Performance & Caching

- **FilePreprocessor**: Caches processed files to avoid re-processing
- **Rubrics**: Cached in memory, saved to disk in `/backend/data/rubrics/`
- **Canvas Submissions**: Synced to `/backend/synced_submissions/` with metadata
- **Grading Results**: Stored in MongoDB with indexes for fast retrieval

Compression middleware (GZip) enabled on all API responses for frontend.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend fails to start | Check `.env` file exists, all required keys set, port 8010 not in use |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` in `.env`, check CORS in `api.py` |
| Canvas sync fails | Verify Canvas token has correct permissions, check Canvas API URL |
| Grading takes too long | May be hitting AI provider rate limits; check quota and retry logic |
| OCR not working | Verify tesseract installation and `TESSDATA_PREFIX` path |
| Database errors | Check `DATABASE_URL`, ensure directory structure created via `ensure_directory_structure()` |

---

## References

- **README.md** - User-facing overview and features
- **EMAIL_SETUP.md** - Detailed email/SMTP configuration
- **AI_ENDPOINTS_TEST_GUIDE.md** - Testing AI endpoints
- **Canvas API Docs**: https://canvas.instructure.com/doc/api/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Next.js Docs**: https://nextjs.org/docs/
