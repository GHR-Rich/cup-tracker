# Cup Tracker - Claude Code Context

## Project Overview
Cup Tracker is an investigative web app that tracks plastic cups through their lifecycle using AirTag/Atuvos trackers placed in recycling bins. Users upload screenshots from Apple Find My / Google Find My Device, and the system uses OCR to extract location data, then geocodes and visualizes cup journeys on maps and timelines.

## Repository & Worktrees
- **Main repo:** `/Users/ricardonigro/code/cup-tracker`
- **Claude worktree:** `/Users/ricardonigro/.claude-worktrees/cup-tracker/cool-neumann` (branch: `cool-neumann`)
- Both worktrees share the same codebase. Always work from whichever directory the session starts in.

## Tech Stack

### Backend (`backend/`)
- **Python 3.9+ / FastAPI** with Uvicorn
- **PostgreSQL** (`cuptracker` database on localhost:5432, user: `ricardonigro`)
- **SQLAlchemy 2.0** ORM + **Alembic** migrations
- **Tesseract OCR** (via pytesseract, installed at `/opt/homebrew/bin/tesseract`)
- **JWT auth** (python-jose, bcrypt) with role-based access (admin, contributor, viewer)
- **Nominatim** geocoding (OpenStreetMap, rate-limited 1 req/sec)

### Frontend (`frontend/`)
- **React 19 + Vite 7** (JSX, no TypeScript)
- **react-router-dom** for routing
- **Leaflet + react-leaflet** for maps
- **Axios** for API calls to `http://localhost:8000`
- **Context API** for auth state (`AuthContext.jsx`)

## Project Structure
```
cup-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # DB URL, JWT secret, settings
│   │   ├── database.py          # SQLAlchemy engine/session
│   │   ├── models.py            # User, Investigation, Tracker, Location, Screenshot
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # JWT + password utilities
│   │   ├── routers/             # API endpoints
│   │   │   ├── auth.py          # /auth/* (register, login, me)
│   │   │   ├── upload.py        # /api/upload/* (OCR processing)
│   │   │   ├── investigations.py # /api/investigations/* (CRUD, user assignment)
│   │   │   ├── trackers.py      # /api/trackers/*
│   │   │   ├── locations.py     # /api/locations/*
│   │   │   └── users.py         # /api/users/* (admin only)
│   │   └── services/
│   │       ├── ocr_processor.py # CrossPlatformOCRProcessor
│   │       └── geocoder.py      # Nominatim reverse geocoding
│   ├── alembic/                 # Database migrations
│   ├── seed_data.py             # Seed investigations + test data
│   ├── seed_users.py            # Seed test users
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app with tab navigation
│   │   ├── components/
│   │   │   ├── Login.jsx        # Auth form
│   │   │   ├── UploadPage.jsx   # Screenshot upload + OCR review
│   │   │   ├── InvestigationsList.jsx # Tracker data viewer
│   │   │   ├── CampaignMap.jsx  # Admin map dashboard with filters
│   │   │   ├── TrackerMap.jsx   # Leaflet journey map
│   │   │   ├── Timeline.jsx     # Chronological location view
│   │   │   ├── EmojiPickerModal.jsx
│   │   │   └── InvestigationSelector.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Auth state, token, investigations
│   │   └── utils/
│   │       └── csvExport.js     # CSV export + distance calc
│   └── package.json
└── docs/
    └── cup-tracker-spec.md      # Full technical specification
```

## Database Models
- **User** - email, password_hash, full_name, role (admin/contributor/viewer)
- **Investigation** - name, brand, description, status, created_by
- **InvestigationUser** - many-to-many join (investigation_id, user_id, assigned_by)
- **Tracker** - name, emoji, tracker_type (atuvos/airtag), platform, investigation_id
- **Location** - address, lat/lng, city, state, location_type, tracker_id, uploaded_by
- **Screenshot** - file_path, platform, ocr_confidence, ocr_raw_text, location_id

## Running the App
- **Backend:** `cd backend && source venv/bin/activate && uvicorn app.main:app --reload`
- **Frontend:** `cd frontend && npm run dev` (serves at localhost:5173)
- **Database:** PostgreSQL must be running locally (`cuptracker` database)

## Current Status (updated 2026-02-06)
- **Phase:** MVP development, ~50 hours in
- **Last completed:** Part 1 of investigation management - create investigations and assign users (commit 781c7be)
- **What's working:** Auth, screenshot upload with OCR, tracker CRUD, location geocoding, map visualization, timeline view, CSV export, Campaign Map (admin-only with filters), investigation selector
- **In progress:** Multi-investigation support - the system recently shifted from single-investigation to multi-investigation architecture. Investigation creation and user assignment endpoints are done, but full integration throughout the app is still ongoing.
- **Next up:** Continue wiring investigation context through remaining frontend components, ensure contributors are properly scoped to their assigned investigations everywhere
- **Known issues:** Some hardcoded investigation IDs may still exist in frontend components from before the multi-investigation refactor

## Project-Specific Conventions
- CSS files colocated with components (e.g., `Login.jsx` + `Login.css`)
- API base URL is `http://localhost:8000` (hardcoded in frontend components)
- Auth token stored in localStorage
- Role checks: `isAdmin()` and `isContributor()` helpers in AuthContext
