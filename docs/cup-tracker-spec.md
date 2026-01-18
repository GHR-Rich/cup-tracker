# Cup Tracker System - Technical Specification

**Project Overview:** Automated tracking system for plastic cup investigation using Find My trackers with OCR-based data extraction from screenshots.

**Version:** 1.0  
**Date:** January 18, 2026  
**Target Platform:** Web Application (Mobile-optimized)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Core Features & Implementation](#core-features--implementation)
6. [OCR Processing Details](#ocr-processing-details)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Development Phases](#development-phases)
11. [Testing Strategy](#testing-strategy)
12. [Security Considerations](#security-considerations)

---

## Executive Summary

### Problem Statement
Investigative work tracking plastic cups through their lifecycle currently requires:
- Manual screenshots of tracker locations (from Apple Find My OR Google Find My Device Network)
- Manual correlation of data across multiple trackers and platforms
- Manual creation of timelines and travel path visualizations
- Inefficient collaboration with team members across iOS and Android devices

### Solution
An automated web application that:
- Processes screenshots from BOTH Apple Find My and Google Find My Device Network using OCR
- Extracts tracker names, locations, and timestamps from both platforms
- Stores data in unified centralized database
- Generates automatic visualizations (maps, timelines) across all platforms
- Supports multi-user collaboration with iOS and Android devices
- Exports professional reports

### Key Benefits
- **Time Savings:** Reduce manual data entry from hours to minutes
- **Accuracy:** Eliminate transcription errors
- **Cross-Platform:** Works with both iOS and Android tracking systems
- **Unified View:** See all trackers in one place regardless of platform
- **Collaboration:** Multiple team members can contribute data from any device
- **Insights:** Automatic analysis and visualization
- **Professional Output:** Generate publication-ready reports

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Mobile Browser │ (User Interface)
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Web Frontend  │ (React SPA)
│   - Upload UI   │
│   - Dashboard   │
│   - Maps/Charts │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│   Backend API   │ (Python FastAPI)
│   - Auth        │
│   - File Upload │
│   - OCR Engine  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │ (PostgreSQL)
│   - Trackers    │
│   - Locations   │
│   - Users       │
└─────────────────┘
```

### Data Flow

1. **Upload Phase:**
   - User uploads screenshots from Apple Find My OR Google Find My Device Network (batch supported)
   - System detects which platform based on screenshot layout
   - Files stored temporarily in server
   - Platform-specific OCR processing extracts data
   - Extracted data presented for user review

2. **Review Phase:**
   - User reviews extracted data
   - Makes corrections if needed
   - Confirms and saves to database

3. **Visualization Phase:**
   - Database queries generate visualizations
   - Maps show geographic paths
   - Timelines show temporal progression
   - Statistics calculated automatically

4. **Export Phase:**
   - Generate PDF reports
   - Create shareable web links
   - Export raw data (CSV/JSON)

---

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** Material-UI (MUI) or Tailwind CSS
- **State Management:** React Context API or Zustand
- **Routing:** React Router v6
- **Maps:** Leaflet.js with OpenStreetMap tiles
- **Charts:** Recharts or Chart.js
- **Build Tool:** Vite

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **OCR Engine:** Tesseract (via pytesseract) or Google Cloud Vision API
- **Image Processing:** Pillow (PIL)
- **Authentication:** JWT tokens
- **File Storage:** Local filesystem (Phase 1), S3-compatible (Phase 2)
- **PDF Generation:** ReportLab or WeasyPrint

### Database
- **Primary DB:** PostgreSQL 15+
- **ORM:** SQLAlchemy
- **Migrations:** Alembic

### DevOps & Deployment
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (reverse proxy)
- **Hosting Options:**
  - Option 1: DigitalOcean Droplet
  - Option 2: AWS EC2/RDS
  - Option 3: Railway.app or Render.com (easiest)
- **SSL:** Let's Encrypt (Certbot)

### Development Tools
- **Version Control:** Git
- **Code Editor:** VS Code
- **API Testing:** Postman or Thunder Client
- **Database Client:** pgAdmin or DBeaver

---

## Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'contributor', -- 'admin', 'contributor', 'viewer'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

**User Roles:**
- **admin:** Full access to all data across all users (global view), can manage users
- **contributor:** Can create investigations, upload data, view own investigations
- **viewer:** Read-only access to assigned investigations

#### `investigations`
```sql
CREATE TABLE investigations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL, -- Brand being investigated (e.g., "Starbucks", "McDonald's")
    description TEXT,
    created_by INTEGER REFERENCES users(id), -- Primary investigator
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
    start_date DATE,
    end_date DATE
);
```

**Investigation Structure:**
- One investigation = one brand (e.g., "Starbucks Cold Cups Investigation")
- Multiple users can participate in same investigation (collaborative)
- Trackers deployed across multiple states belong to same investigation
- Example: "Starbucks Investigation" has trackers deployed by Jane (CA), John (NY), Sarah (TX)

#### `trackers`
```sql
CREATE TABLE trackers (
    id SERIAL PRIMARY KEY,
    investigation_id INTEGER REFERENCES investigations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Sephora NYC 1"
    emoji VARCHAR(10), -- Optional emoji identifier
    tracker_type VARCHAR(50) DEFAULT 'atuvos', -- 'atuvos', 'airtag', etc.
    platform VARCHAR(20) NOT NULL, -- 'apple' or 'google'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(investigation_id, name)
);
```

#### `locations`
```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    tracker_id INTEGER REFERENCES trackers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    city VARCHAR(255),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    location_type VARCHAR(50), -- 'starting_point', 'mrf', 'landfill', 'incinerator', 'waste_transfer_station', 'transit', 'unknown'
    location_type_confidence VARCHAR(20), -- 'auto', 'manual', 'verified' - how was type determined
    screenshot_timestamp TIMESTAMP, -- When screenshot was taken (from EXIF)
    last_seen_text VARCHAR(100), -- e.g., "16 minutes ago"
    battery_level INTEGER, -- If visible in screenshot
    is_final_destination BOOLEAN DEFAULT FALSE, -- True if this is the last ping
    notes TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tracker_time (tracker_id, screenshot_timestamp),
    INDEX idx_state (state),  -- For state-based filtering in global view
    INDEX idx_uploaded_by (uploaded_by),  -- For user-based filtering
    INDEX idx_location_type (location_type)  -- For destination analysis
);
```

**Location Type Values:**
- `starting_point` - Where cup was deposited (e.g., Starbucks recycling bin)
- `mrf` - Materials Recovery Facility (recycling facility)
- `landfill` - Landfill site
- `incinerator` - Waste-to-energy or incineration facility
- `waste_transfer_station` - Intermediate waste handling facility
- `transit` - In transit (truck, sorting facility, etc.)
- `unknown` - Type could not be determined

**Location Type Confidence:**
- `auto` - Automatically classified by system based on address/facility name
- `manual` - User manually set the type
- `verified` - User confirmed system's automatic classification

#### `facility_classifications`
```sql
CREATE TABLE facility_classifications (
    id SERIAL PRIMARY KEY,
    facility_name VARCHAR(255) NOT NULL,
    address TEXT,
    facility_type VARCHAR(50) NOT NULL, -- Same values as location_type
    state VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facility_name, address)
);
```

**Purpose:** Known facilities database for auto-classification
- System learns from user corrections
- Speeds up classification over time
- Example: "Waste Management Inc, 123 Main St" → automatically tagged as "landfill"

#### `screenshots`
```sql
CREATE TABLE screenshots (
    id SERIAL PRIMARY KEY,
    location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    platform VARCHAR(20), -- 'apple' or 'google' (auto-detected)
    ocr_confidence DECIMAL(5, 2), -- OCR confidence score (0-100)
    ocr_raw_text TEXT, -- Raw OCR output for debugging
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `reports`
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    investigation_id INTEGER REFERENCES investigations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50), -- 'pdf', 'web', 'csv'
    file_path VARCHAR(500),
    generated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Relationships
- One investigation has many trackers
- One tracker has many locations (time series)
- One location links to one screenshot
- One investigation can generate many reports

---

## Core Features & Implementation

### Feature 1: Screenshot Upload & OCR Processing

**User Story:** As an investigator, I want to upload multiple screenshots from Apple Find My or Google Find My Device Network at once so I can quickly log tracker positions regardless of which platform my colleagues use.

**Implementation:**

1. **Frontend Upload Component:**
```typescript
// UploadPage.tsx
interface UploadState {
  files: File[];
  processing: boolean;
  results: OCRResult[];
}

interface OCRResult {
  fileName: string;
  trackerName: string;
  address: string;
  timestamp: Date;
  confidence: number;
  error?: string;
}

// Features:
// - Drag and drop interface
// - Multi-file selection
// - Preview thumbnails
// - Progress indicator
// - Batch processing
```

2. **Backend Upload Endpoint:**
```python
# app/routers/upload.py
from fastapi import UploadFile, File
from typing import List
from app.services.ocr_processor import CrossPlatformOCRProcessor

@router.post("/upload/screenshots")
async def upload_screenshots(
    files: List[UploadFile] = File(...),
    investigation_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    1. Validate files (PNG, JPG only, max 10MB each)
    2. Auto-detect platform (Apple or Google)
    3. Extract EXIF timestamp
    4. Save to temporary storage
    5. Process each with platform-specific OCR
    6. Return extracted data for review
    """
    ocr_processor = CrossPlatformOCRProcessor()
    results = []
    
    for file in files:
        # Extract EXIF
        exif_data = extract_exif(file)
        
        # Save temporarily
        temp_path = save_temp_file(file)
        
        # Run cross-platform OCR (auto-detects Apple vs Google)
        ocr_result = ocr_processor.process_screenshot(temp_path)
        
        results.append({
            "filename": file.filename,
            "platform": ocr_result.get("platform"),  # 'apple' or 'google'
            "exif_timestamp": exif_data.get("timestamp"),
            "tracker_name": ocr_result.get("tracker_name"),
            "address": ocr_result.get("address"),
            "last_seen": ocr_result.get("last_seen"),
            "confidence": ocr_result.get("confidence"),
            "temp_path": temp_path
        })
    
    return {"status": "success", "results": results}
```

### Feature 2: OCR Data Extraction

**See dedicated [OCR Processing Details](#ocr-processing-details) section below.**

### Feature 3: Multi-Level Dashboard System

**User Story:** As an admin investigator (your wife), I want to see ALL trackers across ALL users in a global view, but also filter by specific user deployments or geographic regions (states) to understand the full scope of our tracking efforts.

**Dashboard Levels:**

#### Level 1: Global Dashboard (Admin Only)
**View:** All trackers across all users, all investigations

**Components:**
- **Global Overview Stats:**
  - Total trackers deployed (all users)
  - Total active investigations
  - Trackers by state (heatmap)
  - Recent activity feed (last 24 hours)
  - Contributing users list

- **Global Tracker Grid:**
  - Shows ALL trackers system-wide
  - Columns: Tracker Name, User, Investigation, Current Location, Last Update, State
  - Color-coded by status (active/stale)
  - Sortable by all columns

- **Global Map View:**
  - All trackers on one map
  - Color-coded by user or investigation
  - State boundaries shown
  - Click tracker to see details

**Filtering Options:**
- **By User:** Select one or more users to see only their trackers
- **By State:** Select one or more states (CA, NY, TX, etc.)
- **By Investigation:** Select specific investigations
- **By Date Range:** Filter by last update date
- **By Status:** Active (updated <7 days), Stale (7-30 days), Inactive (>30 days)
- **Combined Filters:** "Show me all trackers in California deployed by Jane"

#### Level 2: User Dashboard (Contributor/Admin)
**View:** All investigations and trackers for current user

**Components:**
- **Investigation List:** Shows user's investigations with status
- **Tracker Grid:** Shows all trackers for selected investigation
- **Location Timeline:** Shows chronological path for each tracker
- **Quick Actions:** Add location, edit tracker, archive

#### Level 3: Investigation Dashboard (All Users)
**View:** Detailed view of single investigation

**Components:**
- **Investigation Details:** Name, description, date range, status
- **Tracker List:** All trackers in this investigation
- **Map View:** Paths for all trackers in investigation
- **Timeline:** Combined timeline for all trackers
- **Reports:** Generate investigation report

**Implementation:**

```typescript
// GlobalDashboard.tsx (Admin Only)
interface GlobalDashboardState {
  allTrackers: TrackerWithDetails[];
  filters: {
    userIds: number[];
    states: string[];
    investigations: number[];
    dateRange: { start: Date; end: Date };
    status: 'active' | 'stale' | 'inactive' | 'all';
  };
  stats: GlobalStats;
}

interface GlobalStats {
  totalTrackers: number;
  activeTrackers: number;
  totalUsers: number;
  trackersByState: { state: string; count: number }[];
  recentActivity: Activity[];
}

interface TrackerWithDetails {
  id: number;
  name: string;
  investigation: string;
  userName: string;
  userId: number;
  currentLocation: string;
  currentState: string;
  lastUpdate: Date;
  platform: 'apple' | 'google';
  status: 'active' | 'stale' | 'inactive';
}

// Features:
// - Multi-select filters (users, states, investigations)
// - Real-time stats update as filters change
// - Export filtered view to CSV
// - Drill down from global to user to investigation view
// - State-based heatmap showing tracker density
```

```typescript
// UserDashboard.tsx (Contributor View)
interface UserDashboardState {
  investigations: Investigation[];
  selectedInvestigation: Investigation | null;
  trackers: Tracker[];
  recentLocations: Location[];
  userStats: {
    totalTrackers: number;
    activeInvestigations: number;
    statesVisited: string[];
  };
}

// Features:
// - Filter by investigation
// - Search trackers by name
// - Sort by last update
// - Quick add location button
// - Batch operations
```

**Access Control:**
```typescript
// Role-based view logic
function getDashboardView(user: User) {
  if (user.role === 'admin') {
    return <GlobalDashboard />;  // See everything
  } else if (user.role === 'contributor') {
    return <UserDashboard userId={user.id} />;  // See own data
  } else {
    return <ViewerDashboard assignedInvestigations={user.assignedInvestigations} />;
  }
}
```

**State-Based Filtering Example:**
```typescript
// Filter trackers by state
const trackersByState = allTrackers.filter(t => 
  selectedStates.includes(t.currentState)
);

// Get unique states for filter dropdown
const availableStates = [...new Set(
  allTrackers.map(t => t.currentState).filter(Boolean)
)].sort();

// State heatmap data
const stateHeatmap = availableStates.map(state => ({
  state,
  count: allTrackers.filter(t => t.currentState === state).length,
  trackers: allTrackers.filter(t => t.currentState === state)
}));
```

**User-Based Filtering Example:**
```typescript
// Filter trackers by user
const trackersByUser = allTrackers.filter(t => 
  selectedUserIds.includes(t.userId)
);

// Get all users who have deployed trackers
const activeUsers = [...new Set(allTrackers.map(t => ({
  id: t.userId,
  name: t.userName
})))];
```

### Feature 4: Map Visualization

**User Story:** As an investigator, I want to see tracker paths on a map to visualize their journey.

**Implementation:**
```typescript
// MapView.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';

interface MapViewProps {
  trackers: Tracker[];
  locations: Location[];
  selectedTracker?: string;
}

// Features:
// - Show all trackers as markers
// - Draw lines connecting sequential locations
// - Color-code by tracker
// - Clickable markers show details
// - Filter by date range
// - Toggle tracker visibility
// - Export map as image
```

**Map Data:**
```typescript
interface MapPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  address: string;
  trackerName: string;
  type: 'starting_point' | 'mrf' | 'landfill' | 'incinerator' | 'transit';
}

// Path calculation:
// - Sort locations by timestamp
// - Group by tracker
// - Connect sequential points with lines
// - Add icons based on location type
```

### Feature 5: Timeline View

**User Story:** As an investigator, I want to see a chronological timeline of all tracker movements.

**Implementation:**
```typescript
// TimelineView.tsx
interface TimelineEvent {
  date: Date;
  trackerName: string;
  location: string;
  type: 'departure' | 'arrival' | 'stationary';
  duration?: number; // minutes at location
}

// Features:
// - Vertical timeline with date markers
// - Group events by day/week/month
// - Show stationary periods
// - Calculate travel time between points
// - Highlight significant events (MRF, landfill, etc.)
```

### Feature 6: Report Generation

**User Story:** As an investigator, I want to generate professional reports to share findings.

**Report Types:**

1. **Investigation Summary Report (Priority)**
   - Overview of investigation (brand, date range, total trackers)
   - Final destination breakdown (like CBS News graphic):
     * X trackers ended at landfills
     * X trackers ended at waste transfer stations
     * X trackers ended at incinerators
     * X trackers ended at MRFs
     * X trackers with unknown/unreliable location
   - Map showing all tracker paths
   - State-by-state breakdown
   - Contributing users
   - Export formats: CSV, JSON, Excel

2. **PDF Report (Phase 2):**
   - Executive summary
   - Map images
   - Timeline visualization
   - Statistics (total distance, locations visited, etc.)
   - Raw data tables

3. **Web Report (Phase 2):**
   - Shareable link (public or password-protected)
   - Interactive map
   - Filterable timeline
   - Downloadable data

**Implementation - Destination Analysis:**

```python
# app/services/destination_analyzer.py
from typing import Dict, List
from datetime import datetime

class DestinationAnalyzer:
    """
    Analyzes tracker data to determine final destinations
    and generate investigation summaries.
    """
    
    FACILITY_KEYWORDS = {
        'landfill': ['landfill', 'dump', 'waste disposal', 'solid waste'],
        'mrf': ['mrf', 'materials recovery', 'recycling facility', 'recovery facility'],
        'incinerator': ['incinerator', 'waste to energy', 'wte', 'incineration'],
        'waste_transfer_station': ['transfer station', 'waste transfer', 'transfer facility'],
    }
    
    def mark_final_destinations(self, investigation_id: int):
        """
        Mark the final destination for each tracker in an investigation.
        Final destination = last location where tracker pinged.
        """
        trackers = db.query("""
            SELECT id FROM trackers 
            WHERE investigation_id = :inv_id
        """, {'inv_id': investigation_id}).all()
        
        for tracker in trackers:
            # Get last location by timestamp
            last_location = db.query("""
                SELECT id FROM locations
                WHERE tracker_id = :tracker_id
                ORDER BY screenshot_timestamp DESC
                LIMIT 1
            """, {'tracker_id': tracker.id}).first()
            
            if last_location:
                # Mark as final destination
                db.execute("""
                    UPDATE locations 
                    SET is_final_destination = TRUE
                    WHERE id = :loc_id
                """, {'loc_id': last_location.id})
    
    def auto_classify_location(self, address: str, facility_name: str = None) -> Dict:
        """
        Automatically classify a location based on address and facility name.
        Returns: {type: str, confidence: str}
        """
        text = f"{address} {facility_name or ''}".lower()
        
        # Check known facilities first
        known = db.query("""
            SELECT facility_type FROM facility_classifications
            WHERE facility_name ILIKE :name OR address ILIKE :addr
            LIMIT 1
        """, {'name': f"%{facility_name}%", 'addr': f"%{address}%"}).first()
        
        if known:
            return {'type': known.facility_type, 'confidence': 'auto'}
        
        # Check keywords
        for facility_type, keywords in self.FACILITY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return {'type': facility_type, 'confidence': 'auto'}
        
        # Default to unknown
        return {'type': 'unknown', 'confidence': 'auto'}
    
    def get_investigation_summary(self, investigation_id: int) -> Dict:
        """
        Generate investigation summary for reporting.
        Like the CBS News graphic.
        """
        # Ensure final destinations are marked
        self.mark_final_destinations(investigation_id)
        
        # Get final destination breakdown
        results = db.query("""
            SELECT 
                l.location_type,
                COUNT(*) as count
            FROM locations l
            JOIN trackers t ON l.tracker_id = t.id
            WHERE t.investigation_id = :inv_id
            AND l.is_final_destination = TRUE
            GROUP BY l.location_type
        """, {'inv_id': investigation_id}).all()
        
        # Get investigation details
        investigation = db.query("""
            SELECT name, brand, start_date, end_date
            FROM investigations
            WHERE id = :inv_id
        """, {'inv_id': investigation_id}).first()
        
        # Get state breakdown
        states = db.query("""
            SELECT 
                l.state,
                COUNT(DISTINCT t.id) as tracker_count
            FROM locations l
            JOIN trackers t ON l.tracker_id = t.id
            WHERE t.investigation_id = :inv_id
            GROUP BY l.state
        """, {'inv_id': investigation_id}).all()
        
        # Get contributing users
        users = db.query("""
            SELECT DISTINCT
                u.full_name,
                COUNT(DISTINCT t.id) as trackers_deployed
            FROM users u
            JOIN locations l ON u.id = l.uploaded_by
            JOIN trackers t ON l.tracker_id = t.id
            WHERE t.investigation_id = :inv_id
            GROUP BY u.id, u.full_name
        """, {'inv_id': investigation_id}).all()
        
        return {
            'investigation': {
                'name': investigation.name,
                'brand': investigation.brand,
                'start_date': investigation.start_date,
                'end_date': investigation.end_date
            },
            'destination_breakdown': {
                row.location_type: row.count 
                for row in results
            },
            'total_trackers': sum(row.count for row in results),
            'states': [{'state': s.state, 'count': s.tracker_count} for s in states],
            'contributors': [{'name': u.full_name, 'trackers': u.trackers_deployed} for u in users]
        }
    
    def export_to_csv(self, investigation_id: int) -> str:
        """
        Export investigation data to CSV for external analysis/visualization.
        """
        import csv
        from io import StringIO
        
        summary = self.get_investigation_summary(investigation_id)
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write summary section
        writer.writerow(['Investigation Summary'])
        writer.writerow(['Brand', summary['investigation']['brand']])
        writer.writerow(['Total Trackers', summary['total_trackers']])
        writer.writerow([])
        
        # Write destination breakdown
        writer.writerow(['Destination Type', 'Count'])
        for dest_type, count in summary['destination_breakdown'].items():
            writer.writerow([dest_type.replace('_', ' ').title(), count])
        writer.writerow([])
        
        # Write state breakdown
        writer.writerow(['State', 'Tracker Count'])
        for state in summary['states']:
            writer.writerow([state['state'], state['count']])
        writer.writerow([])
        
        # Write detailed tracker data
        writer.writerow(['Detailed Tracker Data'])
        writer.writerow(['Tracker Name', 'Final Location', 'Final Location Type', 'State', 'Last Update'])
        
        trackers = db.query("""
            SELECT 
                t.name,
                l.address,
                l.location_type,
                l.state,
                l.screenshot_timestamp
            FROM trackers t
            JOIN locations l ON t.id = l.tracker_id
            WHERE t.investigation_id = :inv_id
            AND l.is_final_destination = TRUE
            ORDER BY t.name
        """, {'inv_id': investigation_id}).all()
        
        for tracker in trackers:
            writer.writerow([
                tracker.name,
                tracker.address,
                tracker.location_type.replace('_', ' ').title(),
                tracker.state,
                tracker.screenshot_timestamp
            ])
        
        return output.getvalue()
```

**API Endpoints for Reporting:**

```python
@router.get("/investigations/{id}/summary")
async def get_investigation_summary(
    id: int,
    current_user: User = Depends(get_current_user)
):
    """Get investigation summary for reporting."""
    analyzer = DestinationAnalyzer()
    return analyzer.get_investigation_summary(id)

@router.get("/investigations/{id}/export/csv")
async def export_investigation_csv(
    id: int,
    current_user: User = Depends(get_current_user)
):
    """Export investigation data to CSV."""
    analyzer = DestinationAnalyzer()
    csv_data = analyzer.export_to_csv(id)
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=investigation_{id}_export.csv"
        }
    )

@router.post("/locations/{id}/classify")
async def classify_location(
    id: int,
    location_type: str,
    current_user: User = Depends(get_current_user)
):
    """
    Manually classify a location type.
    Also saves to facility_classifications for future auto-classification.
    """
    location = db.get_location(id)
    
    # Update location type
    db.execute("""
        UPDATE locations
        SET location_type = :type,
            location_type_confidence = 'manual'
        WHERE id = :id
    """, {'type': location_type, 'id': id})
    
    # Save to known facilities
    db.execute("""
        INSERT INTO facility_classifications (facility_name, address, facility_type, state, verified, created_by)
        VALUES (:name, :addr, :type, :state, TRUE, :user_id)
        ON CONFLICT (facility_name, address) DO UPDATE
        SET facility_type = :type, verified = TRUE
    """, {
        'name': extract_facility_name(location.address),
        'addr': location.address,
        'type': location_type,
        'state': location.state,
        'user_id': current_user.id
    })
    
    return {"status": "success", "location_type": location_type}
```

1. **PDF Report:**
   - Executive summary
   - Map images
   - Timeline visualization
   - Statistics (total distance, locations visited, etc.)
   - Raw data tables

2. **Web Report:**
   - Shareable link (public or password-protected)
   - Interactive map
   - Filterable timeline
   - Downloadable data

3. **CSV Export:**
   - Raw location data
   - Formatted for analysis in Excel

**Implementation:**
```python
# app/services/report_generator.py
class ReportGenerator:
    def generate_pdf(investigation_id: int) -> bytes:
        """
        1. Query all tracker/location data
        2. Generate map images (static)
        3. Create timeline visualization
        4. Calculate statistics
        5. Build PDF with ReportLab
        6. Return PDF bytes
        """
        
    def generate_web_report(investigation_id: int) -> str:
        """
        1. Generate unique shareable URL
        2. Create static JSON data export
        3. Render interactive HTML template
        4. Return URL
        """
```

### Feature 7: Collaboration Features

**User Story:** As a team member, I want to contribute data to ongoing investigations.

**Implementation:**
- User roles: Admin, Contributor, Viewer
- Investigation sharing
- Activity log (who added what when)
- Comments on locations
- Notification system (optional)

### Feature 8: Global Dashboard Backend

**User Story:** As an admin (your wife), I need API endpoints that efficiently query all trackers with flexible filtering by user, state, and other criteria.

**Implementation:**

```python
# app/routers/global_dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/global", tags=["global"])

@router.get("/dashboard")
async def get_global_dashboard(
    current_user: User = Depends(get_current_admin_user)  # Admin only
):
    """
    Get comprehensive global dashboard data.
    Returns stats, recent activity, and summary views.
    """
    # Get all trackers with latest location
    trackers = db.query("""
        SELECT 
            t.id, t.name, t.platform,
            i.name as investigation_name,
            u.full_name as user_name, u.id as user_id,
            l.address, l.state, l.city,
            l.screenshot_timestamp as last_update
        FROM trackers t
        JOIN investigations i ON t.investigation_id = i.id
        JOIN users u ON i.created_by = u.id
        LEFT JOIN LATERAL (
            SELECT * FROM locations 
            WHERE tracker_id = t.id 
            ORDER BY screenshot_timestamp DESC 
            LIMIT 1
        ) l ON true
        ORDER BY l.screenshot_timestamp DESC NULLS LAST
    """).all()
    
    # Calculate stats
    total_trackers = len(trackers)
    active_trackers = sum(1 for t in trackers 
                         if t.last_update and 
                         (datetime.now() - t.last_update).days < 7)
    
    # Group by state
    trackers_by_state = {}
    for t in trackers:
        if t.state:
            trackers_by_state[t.state] = trackers_by_state.get(t.state, 0) + 1
    
    # Group by user
    trackers_by_user = {}
    for t in trackers:
        key = (t.user_id, t.user_name)
        trackers_by_user[key] = trackers_by_user.get(key, 0) + 1
    
    return {
        "total_trackers": total_trackers,
        "active_trackers": active_trackers,
        "total_users": len(set(t.user_id for t in trackers)),
        "trackers_by_state": [
            {"state": k, "count": v} 
            for k, v in sorted(trackers_by_state.items(), key=lambda x: -x[1])
        ],
        "trackers_by_user": [
            {"user_id": uid, "user_name": uname, "count": count}
            for (uid, uname), count in trackers_by_user.items()
        ],
        "recent_updates": trackers[:20]  # Last 20 updates
    }

@router.get("/trackers")
async def get_filtered_trackers(
    user_ids: Optional[str] = None,  # "1,2,3"
    states: Optional[str] = None,    # "CA,NY,TX"
    investigation_ids: Optional[str] = None,  # "1,2,3"
    status: str = "all",  # active|stale|inactive|all
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get all trackers with flexible filtering.
    Supports multiple filter combinations.
    """
    query = """
        SELECT 
            t.id, t.name, t.platform, t.emoji,
            i.id as investigation_id, i.name as investigation_name,
            u.id as user_id, u.full_name as user_name,
            l.address, l.state, l.city, l.latitude, l.longitude,
            l.screenshot_timestamp as last_update,
            l.location_type
        FROM trackers t
        JOIN investigations i ON t.investigation_id = i.id
        JOIN users u ON i.created_by = u.id
        LEFT JOIN LATERAL (
            SELECT * FROM locations 
            WHERE tracker_id = t.id 
            ORDER BY screenshot_timestamp DESC 
            LIMIT 1
        ) l ON true
        WHERE 1=1
    """
    
    params = {}
    
    # Apply user filter
    if user_ids:
        user_id_list = [int(x) for x in user_ids.split(",")]
        query += " AND u.id = ANY(:user_ids)"
        params["user_ids"] = user_id_list
    
    # Apply state filter
    if states:
        state_list = states.split(",")
        query += " AND l.state = ANY(:states)"
        params["states"] = state_list
    
    # Apply investigation filter
    if investigation_ids:
        inv_id_list = [int(x) for x in investigation_ids.split(",")]
        query += " AND i.id = ANY(:investigation_ids)"
        params["investigation_ids"] = inv_id_list
    
    # Apply date range filter
    if date_from:
        query += " AND l.screenshot_timestamp >= :date_from"
        params["date_from"] = date_from
    
    if date_to:
        query += " AND l.screenshot_timestamp <= :date_to"
        params["date_to"] = date_to
    
    # Execute query
    results = db.execute(query, params).all()
    
    # Apply status filter (calculated, not in DB)
    if status != "all":
        now = datetime.now()
        filtered_results = []
        for r in results:
            if not r.last_update:
                continue
            days_old = (now - r.last_update).days
            if status == "active" and days_old < 7:
                filtered_results.append(r)
            elif status == "stale" and 7 <= days_old <= 30:
                filtered_results.append(r)
            elif status == "inactive" and days_old > 30:
                filtered_results.append(r)
        results = filtered_results
    
    return {"trackers": results, "count": len(results)}

@router.get("/states")
async def get_states_summary(
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get list of all states where trackers have been,
    with counts and latest activity.
    """
    results = db.query("""
        SELECT 
            l.state,
            COUNT(DISTINCT t.id) as tracker_count,
            COUNT(l.id) as location_count,
            MAX(l.screenshot_timestamp) as latest_update
        FROM locations l
        JOIN trackers t ON l.tracker_id = t.id
        WHERE l.state IS NOT NULL
        GROUP BY l.state
        ORDER BY tracker_count DESC
    """).all()
    
    return {"states": results}

@router.get("/users")
async def get_users_summary(
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get list of all users with their deployment stats.
    """
    results = db.query("""
        SELECT 
            u.id, u.full_name, u.email,
            COUNT(DISTINCT i.id) as investigation_count,
            COUNT(DISTINCT t.id) as tracker_count,
            MAX(l.screenshot_timestamp) as latest_activity
        FROM users u
        LEFT JOIN investigations i ON u.id = i.created_by
        LEFT JOIN trackers t ON i.id = t.investigation_id
        LEFT JOIN locations l ON t.id = l.tracker_id
        GROUP BY u.id, u.full_name, u.email
        ORDER BY tracker_count DESC
    """).all()
    
    return {"users": results}

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Dependency to verify admin access."""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=403, 
            detail="Admin access required"
        )
    return current_user
```

**Database Query Optimization:**

```sql
-- Add indexes for fast filtering
CREATE INDEX idx_locations_state ON locations(state);
CREATE INDEX idx_locations_uploaded_by ON locations(uploaded_by);
CREATE INDEX idx_locations_timestamp ON locations(screenshot_timestamp DESC);
CREATE INDEX idx_investigations_created_by ON investigations(created_by);

-- Composite index for common filter combinations
CREATE INDEX idx_locations_state_timestamp ON locations(state, screenshot_timestamp DESC);
```

---

## OCR Processing Details

### Overview: Cross-Platform Support

The system supports screenshots from two tracking platforms:
1. **Apple Find My** (iOS) - Used with AirTags and Atuvos trackers on iPhone
2. **Google Find My Device Network** (Android) - Used with Atuvos trackers on Android

The OCR processor must:
- Auto-detect which platform a screenshot is from
- Apply platform-specific text extraction rules
- Handle different layouts and fonts
- Normalize data into unified format

### Apple Find My Screenshot Structure

Based on provided examples, Find My screenshots have this structure:

```
┌─────────────────────────────┐
│  Map View (Top 60%)         │
│  - Satellite/Street view    │
│  - Pin with emoji icon      │
│  - Other nearby trackers    │
└─────────────────────────────┘
┌─────────────────────────────┐
│  Info Panel (Bottom 40%)    │
│  ┌─────────────────────────┐│
│  │ Tracker Name            ││  <- Extract this
│  │ Full Address            ││  <- Extract this
│  │ "X minutes ago" + icon  ││  <- Extract this
│  └─────────────────────────┘│
│  [Play Sound] [Directions]  │
│  [Share Item]               │
└─────────────────────────────┘
```

### Google Find My Device Network Screenshot Structure

Google's Find My Device Network has a similar but distinct layout:

```
┌─────────────────────────────┐
│  Map View (Top 65%)         │
│  - Google Maps view         │
│  - Pin with device icon     │
│  - "Find My Device" header  │
└─────────────────────────────┘
┌─────────────────────────────┐
│  Info Panel (Bottom 35%)    │
│  ┌─────────────────────────┐│
│  │ Device Name             ││  <- Extract this
│  │ Full Address            ││  <- Extract this
│  │ "Last seen X min ago"   ││  <- Extract this (different format!)
│  └─────────────────────────┘│
│  [Play sound] [Get directions]
│  [Share location]           │
└─────────────────────────────┘
```

**Key Differences:**
- Google uses "Last seen X min ago" vs Apple's "X minutes ago"
- Google has "Find My Device" header text at top
- Different button labels ("Get directions" vs "Directions")
- Different font styles (Material Design vs iOS fonts)
- Map style is Google Maps vs Apple Maps

### Platform Detection Strategy

The system auto-detects platform by looking for distinctive elements:

**Apple Find My indicators:**
- "Play Sound" button (exact match)
- iOS system font (San Francisco)
- Apple Maps visual style
- "Share Item" text

**Google Find My Device indicators:**
- "Find My Device" header text
- "Last seen" prefix (vs just time)
- "Get directions" button
- Google Maps visual style
- Material Design elements

**Detection Algorithm:**
```python
def detect_platform(image_path: str) -> str:
    """
    Detect if screenshot is from Apple Find My or Google Find My Device.
    Returns: 'apple' or 'google'
    """
    # Quick OCR on full image to find distinctive text
    text = pytesseract.image_to_string(Image.open(image_path))
    text_lower = text.lower()
    
    # Check for Google-specific indicators
    google_indicators = [
        'find my device',
        'last seen',
        'get directions',
    ]
    
    # Check for Apple-specific indicators
    apple_indicators = [
        'play sound',
        'share item',
    ]
    
    google_score = sum(1 for indicator in google_indicators if indicator in text_lower)
    apple_score = sum(1 for indicator in apple_indicators if indicator in text_lower)
    
    return 'google' if google_score > apple_score else 'apple'
```

### OCR Strategy (Updated for Cross-Platform)

**Three-Stage Approach:**

**Stage 1: Platform Detection**
- Quickly scan full image for platform indicators
- Determine if Apple Find My or Google Find My Device
- Select appropriate extraction rules

**Stage 2: Region Detection**
- Crop image to bottom region (info panel)
- Apple: bottom 40%
- Google: bottom 35%
- Improves OCR accuracy by removing map
- Reduces processing time

**Stage 3: Text Extraction**
- Run OCR on cropped region
- Parse text with platform-specific regex patterns
- Extract structured data
- Normalize to unified format

### OCR Implementation

```python
# app/services/ocr_processor.py
import pytesseract
from PIL import Image
import re
from datetime import datetime
from typing import Dict, Optional, Literal

class CrossPlatformOCRProcessor:
    """
    Unified OCR processor for Apple Find My and Google Find My Device Network screenshots.
    """
    
    def __init__(self):
        # Platform-specific patterns
        self.apple_patterns = {
            'tracker_name': r'^([^0-9\n]+[0-9]*)\n',
            'address': r'(\d+\s+[\w\s]+(?:Rd|Ave|St|Dr|Blvd|Pkwy|Way|Ln|Court|Place)[,\s]+[\w\s]+,\s+[A-Z]{2}\s+\d{5})',
            'last_seen': r'(\d+\s+(?:minute|hour|day)s?\s+ago)',
        }
        
        self.google_patterns = {
            'tracker_name': r'^([^0-9\n]+[0-9]*)\n',
            'address': r'(\d+\s+[\w\s]+(?:Rd|Ave|St|Dr|Blvd|Pkwy|Way|Ln|Court|Place)[,\s]+[\w\s]+,\s+[A-Z]{2}\s+\d{5})',
            'last_seen': r'Last seen\s+(\d+\s+(?:min|hr|day)s?\s+ago)',  # Note: "Last seen" prefix and "min" vs "minute"
        }
    
    def detect_platform(self, image_path: str) -> Literal['apple', 'google']:
        """
        Auto-detect if screenshot is from Apple Find My or Google Find My Device.
        """
        try:
            img = Image.open(image_path)
            # Quick low-res scan for platform detection
            img_small = img.resize((img.width // 4, img.height // 4))
            text = pytesseract.image_to_string(img_small).lower()
            
            # Check for platform-specific indicators
            google_score = sum([
                'find my device' in text,
                'last seen' in text,
                'get directions' in text,
            ])
            
            apple_score = sum([
                'play sound' in text,
                'share item' in text,
                text.count('minutes ago') > 0,  # Apple style
            ])
            
            return 'google' if google_score > apple_score else 'apple'
            
        except Exception as e:
            # Default to Apple if detection fails
            return 'apple'
    
    def process_screenshot(self, image_path: str) -> Dict:
        """
        Extract tracker data from screenshot (auto-detects platform).
        
        Returns:
            {
                'platform': 'apple' | 'google',
                'tracker_name': str,
                'address': str,
                'last_seen': str,
                'confidence': float,
                'raw_text': str,
                'error': Optional[str]
            }
        """
        try:
            # Detect platform
            platform = self.detect_platform(image_path)
            
            # Process based on platform
            if platform == 'apple':
                result = self._process_apple_screenshot(image_path)
            else:
                result = self._process_google_screenshot(image_path)
            
            result['platform'] = platform
            return result
            
        except Exception as e:
            return {
                'platform': 'unknown',
                'error': str(e),
                'confidence': 0.0,
                'raw_text': ''
            }
    
    def _process_apple_screenshot(self, image_path: str) -> Dict:
        """Process Apple Find My screenshot."""
        img = Image.open(image_path)
        
        # Crop to info panel (bottom 40%)
        width, height = img.size
        info_panel = img.crop((0, int(height * 0.6), width, height))
        
        # Preprocess and run OCR
        processed = self.preprocess_image(info_panel)
        custom_config = r'--oem 3 --psm 6'
        raw_text = pytesseract.image_to_string(processed, config=custom_config)
        
        # Get confidence
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        avg_confidence = self.calculate_confidence(ocr_data)
        
        # Parse with Apple patterns
        result = self._parse_text(raw_text, self.apple_patterns)
        result['confidence'] = avg_confidence
        result['raw_text'] = raw_text
        
        return result
    
    def _process_google_screenshot(self, image_path: str) -> Dict:
        """Process Google Find My Device Network screenshot."""
        img = Image.open(image_path)
        
        # Crop to info panel (bottom 35% - Google has slightly different layout)
        width, height = img.size
        info_panel = img.crop((0, int(height * 0.65), width, height))
        
        # Preprocess and run OCR
        processed = self.preprocess_image(info_panel)
        custom_config = r'--oem 3 --psm 6'
        raw_text = pytesseract.image_to_string(processed, config=custom_config)
        
        # Get confidence
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        avg_confidence = self.calculate_confidence(ocr_data)
        
        # Parse with Google patterns
        result = self._parse_text(raw_text, self.google_patterns)
        
        # Normalize Google's "Last seen X min ago" to "X minutes ago" format
        if 'last_seen' in result:
            result['last_seen'] = self._normalize_time_format(result['last_seen'])
        
        result['confidence'] = avg_confidence
        result['raw_text'] = raw_text
        
        return result
    
    def _normalize_time_format(self, time_str: str) -> str:
        """
        Normalize different time formats to standard format.
        Google: "Last seen 16 min ago" -> "16 minutes ago"
        """
        # Remove "Last seen" prefix if present
        time_str = re.sub(r'^Last seen\s+', '', time_str, flags=re.IGNORECASE)
        
        # Expand abbreviations
        time_str = time_str.replace(' min ', ' minutes ')
        time_str = time_str.replace(' hr ', ' hours ')
        
        # Handle singular/plural
        time_str = re.sub(r'(\d+)\s+minutes?\s+ago', lambda m: f"{m.group(1)} minute ago" if m.group(1) == '1' else f"{m.group(1)} minutes ago", time_str)
        
        return time_str
    
    def preprocess_image(self, img: Image.Image) -> Image.Image:
        """
        Enhance image for better OCR accuracy.
        """
        # Convert to grayscale
        img = img.convert('L')
        
        # Increase contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Increase resolution (OCR works better on larger images)
        width, height = img.size
        img = img.resize((width * 2, height * 2), Image.LANCZOS)
        
        return img
    
    def _parse_text(self, text: str, patterns: Dict) -> Dict:
        """
        Extract structured data from OCR text using provided patterns.
        """
        result = {}
        
        # Extract tracker name (first line, usually)
        lines = text.strip().split('\n')
        if lines:
            result['tracker_name'] = lines[0].strip()
        
        # Extract address
        address_match = re.search(patterns['address'], text, re.IGNORECASE)
        if address_match:
            result['address'] = address_match.group(1)
        else:
            # Fallback: combine lines 2-4 (address usually spans multiple lines)
            if len(lines) >= 4:
                result['address'] = ' '.join(lines[1:4])
        
        # Extract last seen
        last_seen_match = re.search(patterns['last_seen'], text, re.IGNORECASE)
        if last_seen_match:
            result['last_seen'] = last_seen_match.group(1) if 'Last seen' in patterns['last_seen'] else last_seen_match.group(1)
        
        return result
    
    def calculate_confidence(self, ocr_data: Dict) -> float:
        """
        Calculate average confidence score from OCR data.
        """
        confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def geocode_address(self, address: str) -> Optional[tuple]:
        """
        Convert address to lat/lng coordinates.
        Uses Nominatim (OpenStreetMap) geocoding API.
        """
        import requests
        from urllib.parse import quote
        
        url = f"https://nominatim.openstreetmap.org/search?q={quote(address)}&format=json&limit=1"
        headers = {'User-Agent': 'CupTrackerApp/1.0'}
        
        try:
            response = requests.get(url, headers=headers)
            data = response.json()
            
            if data:
                return (float(data[0]['lat']), float(data[0]['lon']))
        except:
            pass
        
        return None
```

### OCR Accuracy Improvements

**Techniques to Implement:**

1. **Image Preprocessing:**
   - Grayscale conversion
   - Contrast enhancement
   - Noise reduction
   - Upscaling

2. **Region-Specific Processing:**
   - Process tracker name separately (top of info panel)
   - Process address separately (middle)
   - Process metadata separately (bottom)

3. **Post-Processing Validation:**
   - Verify address format (street, city, state, zip)
   - Validate tracker name against known trackers
   - Check last_seen format

4. **Fallback Strategies:**
   - If OCR confidence < 70%, flag for manual review
   - Store original screenshot for reference
   - Allow manual correction in UI

### OCR Service Options

**Option 1: Tesseract (Local)**
- **Pros:** Free, runs locally, no API costs
- **Cons:** Lower accuracy than cloud services
- **Best for:** MVP, low volume

**Option 2: Google Cloud Vision API**
- **Pros:** Higher accuracy, handles various fonts/sizes well
- **Cons:** Cost ($1.50 per 1000 images), requires internet
- **Best for:** Production, high volume

**Option 3: Hybrid Approach**
- Use Tesseract first
- If confidence < threshold, use Cloud Vision
- Best of both worlds

**Recommendation:** Start with Tesseract, add Cloud Vision later if needed.

### Testing Requirements

**For full testing and refinement of cross-platform OCR, we need:**

1. **Google Find My Device Network screenshot examples** (5-10 samples)
   - Different tracker names
   - Various locations
   - Different "last seen" time formats
   - Different Android devices if possible

2. **Edge cases to test:**
   - Very long addresses
   - International addresses (if applicable)
   - Poor GPS signal (low accuracy indicator)
   - Multiple trackers visible on one screen
   - Different screen sizes (phone, tablet)

**Action Item:** Please provide Google Find My Device Network screenshots from colleagues so we can refine the OCR patterns and test platform detection accuracy.

---

## API Endpoints

### Authentication
```
POST   /api/auth/register          # Create new user account
POST   /api/auth/login             # Login and get JWT token
POST   /api/auth/logout            # Invalidate token
GET    /api/auth/me                # Get current user info
```

### Investigations
```
GET    /api/investigations         # List all investigations
POST   /api/investigations         # Create new investigation
GET    /api/investigations/{id}    # Get investigation details
PUT    /api/investigations/{id}    # Update investigation
DELETE /api/investigations/{id}    # Delete investigation
```

### Trackers
```
GET    /api/investigations/{id}/trackers     # List trackers for investigation
POST   /api/investigations/{id}/trackers     # Add new tracker
GET    /api/trackers/{id}                    # Get tracker details
PUT    /api/trackers/{id}                    # Update tracker
DELETE /api/trackers/{id}                    # Delete tracker
```

### Locations
```
GET    /api/trackers/{id}/locations          # Get location history for tracker
POST   /api/trackers/{id}/locations          # Add new location manually
PUT    /api/locations/{id}                   # Update location
DELETE /api/locations/{id}                   # Delete location
```

### Upload & OCR
```
POST   /api/upload/screenshots               # Upload and process screenshots
GET    /api/upload/status/{task_id}          # Check processing status
POST   /api/upload/confirm                   # Confirm and save OCR results
```

### Reports
```
GET    /api/investigations/{id}/summary      # Get investigation summary (destination breakdown)
GET    /api/investigations/{id}/export/csv   # Export investigation data to CSV
GET    /api/investigations/{id}/export/json  # Export investigation data to JSON
GET    /api/investigations/{id}/export/excel # Export investigation data to Excel

POST   /api/reports/generate                 # Generate PDF report (Phase 2)
GET    /api/reports/{id}                     # Get report details
GET    /api/reports/{id}/download            # Download PDF
GET    /api/reports/{id}/share               # Get shareable link
```

### Location Classification
```
POST   /api/locations/{id}/classify          # Manually classify location type
       Body: { location_type: 'landfill' | 'mrf' | 'incinerator' | ... }
       
GET    /api/locations/{id}/suggest-type     # Get auto-classification suggestion
       Response: { suggested_type: string, confidence: string }

POST   /api/locations/mark-final-destinations  # Mark final destinations for investigation
       Body: { investigation_id: number }
```

### Statistics
```
GET    /api/investigations/{id}/stats        # Get investigation statistics
GET    /api/trackers/{id}/stats              # Get tracker statistics
```

### Global Dashboard (Admin Only)
```
GET    /api/global/dashboard                 # Get global dashboard data
GET    /api/global/trackers                  # Get all trackers (with filters)
       Query params:
       - user_ids: comma-separated user IDs
       - states: comma-separated state codes (CA,NY,TX)
       - investigation_ids: comma-separated investigation IDs
       - status: active|stale|inactive|all
       - date_from: ISO date string
       - date_to: ISO date string

GET    /api/global/stats                     # Get global statistics
       Response: {
         total_trackers: number,
         active_trackers: number,
         total_users: number,
         total_investigations: number,
         trackers_by_state: [{state, count}],
         trackers_by_user: [{user_id, user_name, count}],
         recent_activity: [Activity]
       }

GET    /api/global/states                    # Get list of states with tracker counts
GET    /api/global/users                     # Get list of users with deployment counts
```

---

## Frontend Components

### Component Hierarchy

```
App
├── AuthProvider
├── Router
│   ├── LoginPage
│   ├── GlobalDashboardPage (Admin Only)
│   │   ├── GlobalStats
│   │   ├── GlobalTrackerGrid
│   │   ├── GlobalMapView
│   │   ├── FilterPanel
│   │   │   ├── UserFilter (multi-select)
│   │   │   ├── StateFilter (multi-select)
│   │   │   ├── InvestigationFilter (multi-select)
│   │   │   ├── StatusFilter
│   │   │   └── DateRangeFilter
│   │   ├── StateHeatmap
│   │   └── ActivityFeed
│   ├── DashboardPage (User Dashboard)
│   │   ├── InvestigationList
│   │   ├── TrackerGrid
│   │   │   └── TrackerCard
│   │   └── QuickStats
│   ├── UploadPage
│   │   ├── FileDropzone
│   │   ├── ProcessingIndicator
│   │   └── ReviewTable
│   ├── MapViewPage
│   │   ├── MapContainer
│   │   ├── TrackerFilter
│   │   └── LegendPanel
│   ├── TimelinePage
│   │   ├── TimelineView
│   │   └── FilterControls
│   ├── TrackerDetailPage
│   │   ├── TrackerInfo
│   │   ├── LocationTable
│   │   │   └── LocationClassifier (classify each location)
│   │   └── MiniMap
│   ├── InvestigationSummaryPage
│   │   ├── InvestigationSummary
│   │   ├── DestinationBreakdownChart
│   │   ├── StateBreakdownList
│   │   └── ExportButtons
│   └── ReportsPage
│       ├── ReportList
│       └── ReportGenerator
└── Layout
    ├── Header
    ├── Sidebar
    └── Footer
```

### Key Components

#### GlobalStats (Admin Only)
```typescript
interface GlobalStatsProps {
  stats: {
    totalTrackers: number;
    activeTrackers: number;
    staleTrackers: number;
    inactiveTrackers: number;
    totalUsers: number;
    totalInvestigations: number;
  };
}

// Features:
// - Large stat cards with icons
// - Color-coded status indicators
// - Trend indicators (up/down from last week)
// - Click to filter by status
```

#### GlobalTrackerGrid (Admin Only)
```typescript
interface GlobalTrackerGridProps {
  trackers: TrackerWithDetails[];
  onFilterChange: (filters: FilterState) => void;
  filters: FilterState;
}

interface FilterState {
  userIds: number[];
  states: string[];
  investigationIds: number[];
  status: 'active' | 'stale' | 'inactive' | 'all';
  dateRange: { start: Date; end: Date } | null;
}

// Features:
// - Sortable columns (name, user, state, last update)
// - Multi-select filters in header
// - Color-coded status badges
// - Click row to see tracker details
// - Export filtered results to CSV
// - Pagination (100 per page)
// - Search by tracker name
```

#### FilterPanel (Admin Only)
```typescript
interface FilterPanelProps {
  availableUsers: { id: number; name: string; trackerCount: number }[];
  availableStates: { code: string; name: string; trackerCount: number }[];
  availableInvestigations: { id: number; name: string }[];
  currentFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

// Features:
// - Multi-select dropdowns with search
// - Show count next to each option
// - "Clear all" button
// - Apply/Reset buttons
// - Save filter presets (e.g., "California only")
// - Visual filter chips showing active filters
```

#### StateHeatmap (Admin Only)
```typescript
interface StateHeatmapProps {
  stateData: { state: string; count: number; trackers: Tracker[] }[];
  onStateClick: (state: string) => void;
}

// Features:
// - US map with color-coded states
// - Darker color = more trackers
// - Hover shows state name and count
// - Click state to filter to that state
// - Legend showing color scale
```

#### FileDropzone
```typescript
interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

// Features:
// - Drag and drop
// - Click to browse
// - Multiple file selection
// - File type validation
// - Size validation
// - Preview thumbnails
```

#### MapContainer
```typescript
interface MapContainerProps {
  trackers: Tracker[];
  locations: Location[];
  selectedTracker?: string;
  onMarkerClick?: (location: Location) => void;
}

// Features:
// - Interactive map (Leaflet)
// - Marker clustering for nearby points
// - Polyline paths between sequential locations
// - Custom marker icons by location type
// - Popup info on marker click
// - Zoom/pan controls
// - Export to image
```

#### TimelineView
```typescript
interface TimelineViewProps {
  locations: Location[];
  groupBy?: 'day' | 'week' | 'month';
}

// Features:
// - Vertical timeline
// - Date separators
// - Event cards with details
// - Color coding by tracker
// - Expandable details
// - Jump to date
```

#### LocationClassifier
```typescript
interface LocationClassifierProps {
  location: Location;
  onClassify: (locationType: LocationType) => void;
}

type LocationType = 
  | 'landfill'
  | 'mrf'
  | 'incinerator'
  | 'waste_transfer_station'
  | 'starting_point'
  | 'transit'
  | 'unknown';

// Features:
// - Show current classification (if any)
// - Display auto-suggestion with confidence
// - Dropdown to manually select type
// - "Verify" button for auto-suggestions
// - Save to facility database
// - Color-coded by type
```

#### InvestigationSummary
```typescript
interface InvestigationSummaryProps {
  investigationId: number;
  summary: {
    brand: string;
    totalTrackers: number;
    destinationBreakdown: Record<LocationType, number>;
    states: { state: string; count: number }[];
    contributors: { name: string; trackers: number }[];
  };
  onExport: (format: 'csv' | 'json' | 'excel') => void;
}

// Features:
// - Destination breakdown with visual bars
// - Cup icons showing quantities (like CBS graphic)
// - Color-coded by destination type
// - State breakdown list
// - Contributors list
// - Export buttons (CSV, JSON, Excel)
// - "Generate Infographic" button (Phase 2)
```

### Responsive Design

**Mobile-First Approach:**
- Primary use case: iPhone in the field
- Touch-friendly buttons (min 44px)
- Simplified navigation
- Offline support (future phase)

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## Deployment & Infrastructure

### Development Environment

**Setup:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# Database
docker-compose up -d postgres
```

**Requirements Files:**

**backend/requirements.txt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pillow==10.1.0
pytesseract==0.3.10
python-dateutil==2.8.2
reportlab==4.0.7
pydantic==2.5.0
pydantic-settings==2.1.0
```

**frontend/package.json:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "recharts": "^2.10.3",
    "date-fns": "^2.30.0",
    "@mui/material": "^5.14.20",
    "@mui/icons-material": "^5.14.19"
  }
}
```

### Production Deployment

**Option 1: Single Server (Recommended for MVP)**

**Tech Stack:**
- DigitalOcean Droplet (4GB RAM, 2 vCPUs)
- Ubuntu 22.04
- Docker + Docker Compose
- Nginx reverse proxy
- Let's Encrypt SSL

**Docker Compose:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: cuptracker
      POSTGRES_USER: cuptracker
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://cuptracker:${DB_PASSWORD}@postgres:5432/cuptracker
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
    ports:
      - "8000:8000"
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
  
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name cuptracker.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name cuptracker.example.com;
    
    ssl_certificate /etc/letsencrypt/live/cuptracker.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cuptracker.example.com/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://frontend:80;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # File uploads (increase max size)
    client_max_body_size 50M;
}
```

**Deployment Steps:**
1. Provision server
2. Install Docker + Docker Compose
3. Clone repository
4. Set environment variables
5. Run `docker-compose up -d`
6. Configure SSL with Certbot
7. Test all endpoints

---

## Cross-Platform Implementation Summary

### Key Changes for Google Find My Device Network Support

**Database Updates:**
- Added `platform` field to `trackers` table ('apple' or 'google')
- Added `platform` field to `screenshots` table for auto-detection tracking
- Added indexes on `state` and `uploaded_by` for efficient global filtering

**OCR Processing:**
- Implemented platform auto-detection algorithm
- Created separate processing paths for Apple and Google screenshots
- Different crop percentages (Apple: 40%, Google: 35%)
- Platform-specific regex patterns
- Time format normalization ("Last seen X min ago" → "X minutes ago")

**API Changes:**
- Upload endpoint now returns `platform` field in results
- Platform auto-detected during OCR processing
- No user input required for platform selection

**UI Updates:**
- Display platform badge (iOS/Android icon) in review table
- Filter trackers by platform
- Platform indicator in tracker cards
- Statistics split by platform

### Key Changes for Global Dashboard (Admin View)

**User Roles:**
- Updated to three roles: `admin`, `contributor`, `viewer`
- Admin role has access to global dashboard with all users' data
- Contributors see only their own investigations
- Viewers have read-only access

**Database Updates:**
- Added indexes for efficient filtering:
  - `idx_state` on locations table
  - `idx_uploaded_by` on locations table
  - `idx_locations_state_timestamp` composite index
- State field now used for geographic filtering

**New API Endpoints:**
- `GET /api/global/dashboard` - Complete global overview
- `GET /api/global/trackers` - Filtered tracker query with params:
  - `user_ids` - Filter by specific users
  - `states` - Filter by state codes (CA, NY, TX, etc.)
  - `investigation_ids` - Filter by investigations
  - `status` - Filter by active/stale/inactive
  - `date_from` / `date_to` - Date range filtering
- `GET /api/global/stats` - Global statistics
- `GET /api/global/states` - States summary with counts
- `GET /api/global/users` - Users summary with deployment stats

**New Frontend Components:**
- `GlobalDashboardPage` - Admin-only global view
- `GlobalStats` - System-wide statistics cards
- `GlobalTrackerGrid` - All trackers with sorting/filtering
- `FilterPanel` - Multi-select filters (users, states, investigations)
- `StateHeatmap` - US map visualization showing tracker density
- `ActivityFeed` - Recent activity across all users

**Filtering Capabilities:**
- **By User:** Select one or multiple users to see their deployments
- **By State:** Select states (CA, NY, TX, etc.) to see regional data
- **By Investigation:** Filter to specific investigations
- **By Status:** Active (<7 days), Stale (7-30 days), Inactive (>30 days)
- **By Date Range:** Custom date range for updates
- **Combined Filters:** All filters work together (e.g., "Show me all active trackers in California deployed by Jane")

**Use Cases Enabled:**
1. "Show me all trackers across the entire system" (default global view)
2. "What trackers has John deployed?" (filter by user)
3. "What's happening in California?" (filter by state)
4. "Show me all trackers deployed by Jane in Texas" (combined filter)
5. "Which trackers haven't been updated in over a month?" (status filter)
6. "What's our total deployment across all states?" (state heatmap)

### Key Changes for Investigation Reporting

**Investigation Structure:**
- Added `brand` field to investigations table (e.g., "Starbucks", "McDonald's")
- One investigation = one brand
- Multiple users can participate in same investigation
- Trackers across multiple states belong to same investigation

**Location Classification System:**
- Added `location_type` field with values:
  - `landfill` - Landfill sites
  - `mrf` - Materials Recovery Facilities (recycling)
  - `incinerator` - Waste-to-energy facilities
  - `waste_transfer_station` - Intermediate waste handling
  - `starting_point` - Original cup deposit location
  - `transit` - In transit between facilities
  - `unknown` - Unable to determine
  
- Added `location_type_confidence` to track how type was determined:
  - `auto` - System auto-classified based on address/keywords
  - `manual` - User manually set the type
  - `verified` - User confirmed system's suggestion

- Added `is_final_destination` boolean to mark last ping location

**Facility Learning Database:**
- New `facility_classifications` table
- System learns from user corrections
- Future locations at same facility auto-classify correctly
- Example: User classifies "Waste Management - Central Landfill" → system remembers for next time

**Destination Analysis:**
- Final destination = last location where tracker pinged
- System auto-marks final destinations per investigation
- Calculates breakdown by destination type (like CBS News graphic)

**Export Capabilities (MVP - Phase 1):**
- CSV export with:
  - Investigation summary (brand, total trackers, date range)
  - Destination breakdown (X to landfills, X to MRFs, etc.)
  - State-by-state breakdown
  - Contributing users
  - Detailed tracker data with final locations
- JSON export (same data, different format)
- Excel export (formatted spreadsheet)

**Infographic Generation (Phase 2):**
- Built-in visual report like CBS News graphic
- Cup icons showing quantities by destination
- Color-coded by destination type
- Professional, shareable format

**New API Endpoints:**
- `GET /api/investigations/{id}/summary` - Get investigation summary
- `GET /api/investigations/{id}/export/csv` - Export to CSV
- `POST /api/locations/{id}/classify` - Manually classify location
- `GET /api/locations/{id}/suggest-type` - Get auto-classification
- `POST /api/locations/mark-final-destinations` - Mark final destinations

**New UI Components:**
- `LocationClassifier` - Classify individual locations with suggestions
- `InvestigationSummary` - Show destination breakdown
- `DestinationBreakdownChart` - Visual breakdown like CBS graphic
- `ExportButtons` - Export to CSV/JSON/Excel

**Workflow:**
1. User uploads screenshots → OCR extracts locations
2. System auto-suggests location types based on address
3. User reviews/adjusts classifications
4. System marks final destinations (last ping per tracker)
5. User generates investigation summary
6. Export to CSV for external visualization tools
7. (Phase 2) Generate built-in infographic

**Testing Priorities:**
1. Get Google Find My Device Network screenshots from Android colleagues
2. Test platform detection accuracy (aim for >95%)
3. Refine OCR patterns for Google format
4. Test with various Android devices and screen sizes
5. Validate time format normalization

**Future Enhancements:**
- Add platform-specific tips/help in UI
- Support for other tracker networks (Tile, Samsung SmartThings)
- Automatic platform preference per user
- Platform-specific statistics and insights

---

## Next Steps for Development

### Phase 1: MVP with Cross-Platform Support (Weeks 1-3)
1. Set up development environment
2. Implement database schema with platform fields
3. Build cross-platform OCR processor
4. Create upload API with platform detection
5. Build basic frontend (upload + review)
6. Test with provided Apple screenshots
7. **Request and test with Google screenshots**

### Phase 2: Visualization (Weeks 4-5)
8. Implement map visualization (works for both platforms)
9. Build timeline view
10. Add investigation management
11. Create dashboard with platform filters

### Phase 3: Reports & Collaboration (Week 6)
12. Implement PDF report generation
13. Add web report sharing
14. Build collaboration features
15. Deploy to production

### Immediate Action Items:
1. ✅ Technical specification document created
2. 📋 **Collect Google Find My Device Network screenshots** (5-10 examples)
3. 📋 Share this document with development team
4. 📋 Set up development environment
5. 📋 Begin Phase 1 implementation

---

## Appendix: Testing Checklist

### Cross-Platform OCR Testing

**Apple Find My:**
- [ ] Standard address format
- [ ] Long addresses
- [ ] Different "minutes/hours/days ago" formats
- [ ] Multiple trackers visible
- [ ] Low confidence scenarios

**Google Find My Device Network:**
- [ ] Standard address format
- [ ] "Last seen X min ago" format
- [ ] "Last seen X hr ago" format
- [ ] Different Android UI versions
- [ ] Various screen resolutions

**Platform Detection:**
- [ ] Correctly identifies Apple screenshots
- [ ] Correctly identifies Google screenshots
- [ ] Handles edge cases gracefully
- [ ] Performance acceptable (<2 seconds per screenshot)

**Integration:**
- [ ] Mixed batch uploads (Apple + Google)
- [ ] Data normalization working
- [ ] Database correctly stores platform
- [ ] UI displays platform correctly

**Deployment Steps (continued):**