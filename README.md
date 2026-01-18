# Cup Tracker

An investigative web application that tracks plastic cups through their lifecycle to determine if they actually get recycled. Uses OCR to automatically extract location data from Apple Find My and Google Find My Device Network screenshots.

## 🎯 Project Goal

Prove whether plastic cups placed in recycling bins actually get recycled or end up in landfills/incinerators. This tool automates the tedious manual process of tracking AirTags/Atuvos trackers attached to cups.

## ✨ Features (Planned)

- **Cross-Platform OCR**: Automatically extract data from Apple Find My and Google Find My Device screenshots
- **Location Tracking**: Store and visualize tracker movement over time
- **Map Visualization**: See tracker paths on interactive maps
- **Timeline View**: Chronological view of tracker movements
- **Destination Analysis**: Classify final destinations (landfill, MRF, incinerator, etc.)
- **Reports**: Generate CSV/PDF reports of findings
- **Multi-User**: Collaborate with team members across different states

## 🏗️ Project Status

**Current Phase:** MVP Development (Week 1 - Project Setup) ✅

- [x] Development environment setup
- [x] Project structure created
- [x] Backend framework initialized (FastAPI)
- [x] Frontend framework initialized (React + Vite)
- [x] Database ready (PostgreSQL)
- [ ] OCR processing implementation
- [ ] Upload and review interface
- [ ] Basic map visualization
- [ ] CSV export functionality

## 🛠️ Tech Stack

### Backend
- **Python 3.9+** with FastAPI
- **PostgreSQL 15** for data storage
- **SQLAlchemy** for database ORM
- **Tesseract OCR** for text extraction from screenshots
- **Pillow** for image processing

### Frontend
- **React 18** with Vite
- **Leaflet.js** for map visualization
- **Recharts** for data visualization

### Development Tools
- **Git** for version control
- **Homebrew** for package management (macOS)
- **Cursor** as code editor

## 📁 Project Structure


cup-tracker/
├── README.md # This file
├── .gitignore # Git ignore rules
├── docs/ # Documentation
│ └── cup-tracker-spec.md # Complete technical specification
├── assets/ # Static assets
│ └── screenshots/ # Sample screenshots for testing
├── backend/ # Python FastAPI backend
│ ├── venv/ # Python virtual environment (not in git)
│ ├── requirements.txt # Python dependencies
│ ├── .env # Environment variables (not in git)
│ └── app/ # Application code
│ ├── main.py # FastAPI entry point
│ ├── database.py # Database connection
│ ├── config.py # Configuration
│ ├── models/ # SQLAlchemy models
│ ├── schemas/ # Pydantic schemas
│ ├── routers/ # API endpoints
│ └── services/ # Business logic (OCR, reports, etc.)
└── frontend/ # React frontend
├── package.json # Node.js dependencies
├── vite.config.js # Vite configuration
├── index.html # HTML entry point
├── public/ # Static files
└── src/ # React components
├── main.jsx # React entry point
├── App.jsx # Main app component
└── assets/ # Images, styles


## 🚀 Getting Started

### Prerequisites

- **macOS** (for this setup guide)
- **Homebrew** package manager
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GHR-Rich/cup-tracker.git
   cd cup-tracker

Install system dependencies

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install postgresql@15 node tesseract

# Add PostgreSQL to PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

Set up PostgreSQL

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb cuptracker

Set up Backend

cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (update values as needed)
cp .env.example .env

Set up Frontend

cd ../frontend

# Install dependencies
npm install

Running the Application
Backend:

cd backend
source venv/bin/activate
uvicorn app.main:app --reload

Backend will run at: http://localhost:8000

Frontend:

cd frontend
npm run dev

Frontend will run at: http://localhost:5173

📖 Documentation
Technical Specification - Complete system design and architecture
API Documentation - Available at http://localhost:8000/docs (when backend is running)
🧪 Testing
Sample Apple Find My screenshots are included in assets/screenshots/ for testing OCR functionality.

Note: Google Find My Device Network screenshots needed for full cross-platform testing.

🗺️ Roadmap
Phase 1: MVP (Weeks 1-3)
 Project setup and structure
 Database schema implementation
 OCR processor for Apple Find My screenshots
 Upload and review interface
 Basic map visualization
 CSV export
Phase 2: Cross-Platform (Week 4)
 Google Find My Device Network OCR support
 Platform auto-detection
 Enhanced review interface
Phase 3: Visualization & Reports (Week 5-6)
 Timeline view
 Destination classification system
 Investigation summary reports
 State-based filtering
Phase 4: Multi-User & Deploy (Week 7-8)
 User authentication
 Global admin dashboard
 Production deployment
 Mobile optimization
🤝 Contributing
This is currently a personal learning project. Contributions welcome once MVP is complete!

📝 License
TBD

👤 Author
Rich Nigro

Learning to code while building investigative tools
Future founding sales leader at Buf Technologies
Built with ❤️ to prove plastic recycling claims# cup-tracker
Web application for tracking plastic cups through their lifecycle using AirTag data
