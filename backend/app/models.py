from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    """User accounts for the application."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default='contributor')  # admin, contributor, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    investigations = relationship("Investigation", back_populates="creator")


class Investigation(Base):
    """Investigations track different brands/studies."""
    __tablename__ = "investigations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=False)  # e.g., "Starbucks", "McDonald's"
    description = Column(Text)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default='active')  # active, completed, archived
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    
    # Relationships
    creator = relationship("User", back_populates="investigations")
    trackers = relationship("Tracker", back_populates="investigation", cascade="all, delete-orphan")


class Tracker(Base):
    """Individual trackers (AirTags/Atuvos) within an investigation."""
    __tablename__ = "trackers"
    
    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey('investigations.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Sephora NYC 1"
    emoji = Column(String(10))  # Optional emoji identifier
    tracker_type = Column(String(50), default='atuvos')  # atuvos, airtag, etc.
    platform = Column(String(20), nullable=False)  # 'apple' or 'google'
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    investigation = relationship("Investigation", back_populates="trackers")
    locations = relationship("Location", back_populates="tracker", cascade="all, delete-orphan")
    
    # Unique constraint: same name can't appear twice in same investigation
    __table_args__ = (
        Index('idx_investigation_tracker_name', 'investigation_id', 'name', unique=True),
    )


class Location(Base):
    """Location pings from trackers."""
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    tracker_id = Column(Integer, ForeignKey('trackers.id', ondelete='CASCADE'), nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    city = Column(String(255))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Location classification
    location_type = Column(String(50))  # starting_point, mrf, landfill, incinerator, etc.
    location_type_confidence = Column(String(20))  # auto, manual, verified
    
    # Metadata from screenshot
    screenshot_timestamp = Column(DateTime(timezone=True))
    last_seen_text = Column(String(100))  # e.g., "16 minutes ago"
    battery_level = Column(Integer)
    
    is_final_destination = Column(Boolean, default=False)
    notes = Column(Text)
    uploaded_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tracker = relationship("Tracker", back_populates="locations")
    screenshots = relationship("Screenshot", back_populates="location", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_tracker_time', 'tracker_id', 'screenshot_timestamp'),
        Index('idx_state', 'state'),
        Index('idx_uploaded_by', 'uploaded_by'),
        Index('idx_location_type', 'location_type'),
    )


class Screenshot(Base):
    """Screenshots uploaded for OCR processing."""
    __tablename__ = "screenshots"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey('locations.id', ondelete='CASCADE'), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    platform = Column(String(20))  # 'apple' or 'google' (auto-detected)
    ocr_confidence = Column(Numeric(5, 2))  # 0-100
    ocr_raw_text = Column(Text)  # Raw OCR output for debugging
    uploaded_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    location = relationship("Location", back_populates="screenshots")
