# File: backend/app/routers/reports.py (NEW FILE)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import csv
import io

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api", tags=["reports"])


@router.patch("/locations/{location_id}/classify")
def classify_location(
    location_id: int,
    location_type: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update the location_type for a specific location.
    Any authenticated user can classify locations they have access to.
    """
    location = db.query(models.Location).filter(
        models.Location.id == location_id
    ).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Contributors can only classify their own uploads
    if current_user.role == "contributor" and location.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    valid_types = [
        'starting_point', 'mrf', 'landfill', 'incinerator',
        'waste_transfer_station', 'transit', 'unknown'
    ]
    if location_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid location_type. Must be one of: {', '.join(valid_types)}"
        )

    location.location_type = location_type
    location.location_type_confidence = 'manual'
    db.commit()

    return {"status": "success", "location_id": location_id, "location_type": location_type}


@router.post("/investigations/{investigation_id}/mark-final-destinations")
def mark_final_destinations(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Mark the last location for each tracker as the final destination.
    Clears previous final destination flags first.
    """
    # Verify investigation exists
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Get all trackers for this investigation
    trackers = db.query(models.Tracker).filter(
        models.Tracker.investigation_id == investigation_id
    ).all()

    # Clear existing final destination flags for this investigation
    for tracker in trackers:
        db.query(models.Location).filter(
            models.Location.tracker_id == tracker.id,
            models.Location.is_final_destination == True
        ).update({"is_final_destination": False})

    # Mark the last location for each tracker as final
    marked_count = 0
    for tracker in trackers:
        last_location = db.query(models.Location).filter(
            models.Location.tracker_id == tracker.id
        ).order_by(
            models.Location.screenshot_timestamp.desc()
        ).first()

        if last_location:
            last_location.is_final_destination = True
            marked_count += 1

    db.commit()

    return {
        "status": "success",
        "trackers_processed": len(trackers),
        "final_destinations_marked": marked_count
    }


@router.get("/investigations/{investigation_id}/summary")
def get_investigation_summary(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get investigation summary with destination breakdown.
    Auto-marks final destinations before generating summary.
    """
    # Verify investigation exists
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Auto-mark final destinations
    trackers = db.query(models.Tracker).filter(
        models.Tracker.investigation_id == investigation_id
    ).all()

    # Clear and re-mark final destinations
    for tracker in trackers:
        db.query(models.Location).filter(
            models.Location.tracker_id == tracker.id
        ).update({"is_final_destination": False})

        last_location = db.query(models.Location).filter(
            models.Location.tracker_id == tracker.id
        ).order_by(
            models.Location.screenshot_timestamp.desc()
        ).first()

        if last_location:
            last_location.is_final_destination = True

    db.commit()

    # Destination breakdown (final destinations only)
    destination_breakdown = db.query(
        models.Location.location_type,
        func.count(models.Location.id).label('count')
    ).join(
        models.Tracker, models.Location.tracker_id == models.Tracker.id
    ).filter(
        models.Tracker.investigation_id == investigation_id,
        models.Location.is_final_destination == True
    ).group_by(
        models.Location.location_type
    ).all()

    # State breakdown
    state_breakdown = db.query(
        models.Location.state,
        func.count(func.distinct(models.Tracker.id)).label('tracker_count')
    ).join(
        models.Tracker, models.Location.tracker_id == models.Tracker.id
    ).filter(
        models.Tracker.investigation_id == investigation_id,
        models.Location.state.isnot(None)
    ).group_by(
        models.Location.state
    ).order_by(
        func.count(func.distinct(models.Tracker.id)).desc()
    ).all()

    # Total trackers and locations
    total_trackers = len(trackers)
    total_locations = db.query(func.count(models.Location.id)).join(
        models.Tracker, models.Location.tracker_id == models.Tracker.id
    ).filter(
        models.Tracker.investigation_id == investigation_id
    ).scalar()

    # Tracker details with final destinations
    tracker_details = []
    for tracker in trackers:
        final_loc = db.query(models.Location).filter(
            models.Location.tracker_id == tracker.id,
            models.Location.is_final_destination == True
        ).first()

        location_count = db.query(func.count(models.Location.id)).filter(
            models.Location.tracker_id == tracker.id
        ).scalar()

        tracker_details.append({
            "id": tracker.id,
            "name": tracker.name,
            "emoji": tracker.emoji,
            "platform": tracker.platform,
            "location_count": location_count,
            "final_destination": {
                "address": final_loc.address if final_loc else None,
                "city": final_loc.city if final_loc else None,
                "state": final_loc.state if final_loc else None,
                "location_type": final_loc.location_type if final_loc else None,
            } if final_loc else None
        })

    return {
        "investigation": {
            "id": investigation.id,
            "name": investigation.name,
            "brand": investigation.brand,
            "status": investigation.status,
            "start_date": investigation.start_date,
        },
        "total_trackers": total_trackers,
        "total_locations": total_locations,
        "destination_breakdown": {
            row.location_type or 'unknown': row.count
            for row in destination_breakdown
        },
        "state_breakdown": [
            {"state": row.state, "tracker_count": row.tracker_count}
            for row in state_breakdown
        ],
        "trackers": tracker_details
    }


@router.get("/investigations/{investigation_id}/export/csv")
def export_investigation_csv(
    investigation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Export all investigation data as CSV."""
    # Verify investigation exists
    investigation = db.query(models.Investigation).filter(
        models.Investigation.id == investigation_id
    ).first()
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Get all locations with tracker info
    rows = db.query(
        models.Tracker.name.label('tracker_name'),
        models.Tracker.emoji,
        models.Tracker.platform,
        models.Location.address,
        models.Location.city,
        models.Location.state,
        models.Location.postal_code,
        models.Location.latitude,
        models.Location.longitude,
        models.Location.location_type,
        models.Location.screenshot_timestamp,
        models.Location.last_seen_text,
        models.Location.is_final_destination,
    ).join(
        models.Tracker, models.Location.tracker_id == models.Tracker.id
    ).filter(
        models.Tracker.investigation_id == investigation_id
    ).order_by(
        models.Tracker.name,
        models.Location.screenshot_timestamp
    ).all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Tracker Name', 'Emoji', 'Platform', 'Address', 'City', 'State',
        'Postal Code', 'Latitude', 'Longitude', 'Location Type',
        'Screenshot Timestamp', 'Last Seen', 'Is Final Destination'
    ])

    for row in rows:
        writer.writerow([
            row.tracker_name,
            row.emoji or '',
            row.platform,
            row.address,
            row.city or '',
            row.state or '',
            row.postal_code or '',
            str(row.latitude) if row.latitude else '',
            str(row.longitude) if row.longitude else '',
            row.location_type or 'unknown',
            row.screenshot_timestamp.isoformat() if row.screenshot_timestamp else '',
            row.last_seen_text or '',
            'Yes' if row.is_final_destination else 'No'
        ])

    output.seek(0)

    filename = f"{investigation.brand}_{investigation.name}_export.csv".replace(' ', '_')

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
