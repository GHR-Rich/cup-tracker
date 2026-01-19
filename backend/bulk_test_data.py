#!/usr/bin/env python3
"""
Generate bulk test data for Cup Tracker.
Creates multiple trackers with location histories across different states.
"""

from app.database import SessionLocal
from app.models import Investigation, Tracker, Location
from app.services.geocoder import Geocoder
from datetime import datetime, timedelta
import random

def create_bulk_data():
    """Create realistic test data with multiple trackers and locations."""
    db = SessionLocal()
    geocoder = Geocoder()
    
    try:
        # Get or create investigation
        investigation = db.query(Investigation).filter(Investigation.id == 4).first()
        if not investigation:
            print("Error: Investigation 4 not found. Run seed_data.py first.")
            return
        
        print(f"Adding test data to: {investigation.name}")
        print("=" * 60)
        
        # Sample tracker data with realistic location progressions
        trackers_data = [
            {
                "name": "Starbucks Cup LA 1",
                "platform": "apple",
                "locations": [
                    "11601 Wilshire Blvd, Los Angeles, CA 90025",  # Starbucks location
                    "2901 S Alameda St, Los Angeles, CA 90058",     # Waste facility
                    "14559 Arrow Hwy, Baldwin Park, CA 91706"       # Landfill
                ]
            },
            {
                "name": "Starbucks Cup SF 1",
                "platform": "apple",
                "locations": [
                    "1 Market St, San Francisco, CA 94105",         # Starbucks location
                    "501 Tunnel Ave, Brisbane, CA 94005",           # Recology facility
                    "7800 Pardee Ln, Oakland, CA 94621"             # MRF
                ]
            },
            {
                "name": "Starbucks Cup NYC 1",
                "platform": "google",
                "locations": [
                    "1633 Broadway, New York, NY 10019",            # Times Square Starbucks
                    "30-82 Review Ave, Long Island City, NY 11101", # Transfer station
                    "500 Hamilton Ave, Brooklyn, NY 11232"          # Waste facility
                ]
            },
            {
                "name": "Starbucks Cup Seattle 1",
                "platform": "apple",
                "locations": [
                    "1912 Pike Pl, Seattle, WA 98101",              # Pike Place Starbucks
                    "1700 W Spokane St, Seattle, WA 98134",         # Transfer station
                    "2300 S Norfolk St, Seattle, WA 98108"          # Recycling center
                ]
            },
            {
                "name": "Starbucks Cup Chicago 1",
                "platform": "google",
                "locations": [
                    "130 E Randolph St, Chicago, IL 60601",         # Downtown Starbucks
                    "1150 W 35th St, Chicago, IL 60609",            # Waste facility
                    "10800 S Doty Ave, Chicago, IL 60628"           # Landfill
                ]
            }
        ]
        
        base_time = datetime.now() - timedelta(days=14)  # Start 2 weeks ago
        
        for tracker_data in trackers_data:
            print(f"\n Creating tracker: {tracker_data['name']}")
            
            # Check if tracker already exists
            existing = db.query(Tracker).filter(
                Tracker.investigation_id == investigation.id,
                Tracker.name == tracker_data['name']
            ).first()
            
            if existing:
                print(f"  ⚠ Tracker already exists, skipping...")
                continue
            
            # Create tracker
            tracker = Tracker(
                investigation_id=investigation.id,
                name=tracker_data['name'],
                platform=tracker_data['platform'],
                tracker_type="atuvos"
            )
            db.add(tracker)
            db.flush()
            
            print(f"  ✓ Created tracker (id={tracker.id})")
            
            # Create locations with time progression
            for i, address in enumerate(tracker_data['locations']):
                # Simulate time progression (cups move over days)
                location_time = base_time + timedelta(days=i * 3, hours=random.randint(0, 23))
                
                # Geocode address
                print(f"    Geocoding: {address}")
                coordinates = geocoder.geocode(address)
                
                latitude = None
                longitude = None
                if coordinates:
                    latitude, longitude = coordinates
                
                # Determine location type based on position in journey
                if i == 0:
                    location_type = "starting_point"
                elif i == len(tracker_data['locations']) - 1:
                    # Last location - could be landfill, MRF, etc.
                    if "landfill" in address.lower():
                        location_type = "landfill"
                    elif "recycl" in address.lower() or "mrf" in address.lower():
                        location_type = "mrf"
                    else:
                        location_type = "waste_transfer_station"
                else:
                    location_type = "transit"
                
                # Create location
                location = Location(
                    tracker_id=tracker.id,
                    address=address,
                    latitude=latitude,
                    longitude=longitude,
                    screenshot_timestamp=location_time,
                    last_seen_text=f"{random.randint(5, 120)} minutes ago",
                    location_type=location_type,
                    location_type_confidence="auto",
                    is_final_destination=(i == len(tracker_data['locations']) - 1),
                    uploaded_by=1
                )
                db.add(location)
                
                print(f"    ✓ Added location: {address[:50]}... [{location_type}]")
            
            # Commit after each tracker
            db.commit()
        
        print("\n" + "=" * 60)
        print("✅ Bulk test data created successfully!")
        
        # Summary
        total_trackers = db.query(Tracker).filter(
            Tracker.investigation_id == investigation.id
        ).count()
        total_locations = db.query(Location).join(Tracker).filter(
            Tracker.investigation_id == investigation.id
        ).count()
        
        print(f"\nSummary:")
        print(f"  Total trackers: {total_trackers}")
        print(f"  Total locations: {total_locations}")
        print(f"  Investigation: {investigation.name}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Generating bulk test data...")
    print("This will take ~30 seconds due to geocoding rate limits.\n")
    create_bulk_data()
    print("\nDone!")
