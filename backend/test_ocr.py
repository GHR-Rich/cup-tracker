#!/usr/bin/env python3
"""
Test script for OCR processor.
Run this to test OCR on your screenshots.
"""

from app.services.ocr_processor import CrossPlatformOCRProcessor
from pathlib import Path

def test_ocr():
    """Test OCR on sample screenshots."""
    processor = CrossPlatformOCRProcessor()
    
    # Path to screenshots
    screenshots_dir = Path(__file__).parent.parent / "assets" / "screenshots"
    
    # Get all screenshot files
    screenshot_files = list(screenshots_dir.glob("*.png")) + list(screenshots_dir.glob("*.PNG")) + \
                      list(screenshots_dir.glob("*.jpg")) + list(screenshots_dir.glob("*.JPG"))
    
    print(f"Found {len(screenshot_files)} screenshots\n")
    print("=" * 80)
    
    for screenshot in screenshot_files:
        print(f"\nProcessing: {screenshot.name}")
        print("-" * 80)
        
        result = processor.process_screenshot(str(screenshot))
        
        print(f"Platform: {result.get('platform', 'unknown')}")
        print(f"Confidence: {result.get('confidence', 0)}%")
        
        if 'error' in result:
            print(f"ERROR: {result['error']}")
        else:
            print(f"\nExtracted Data:")
            print(f"  Tracker Name: {result.get('tracker_name', 'Not found')}")
            print(f"  Address: {result.get('address', 'Not found')}")
            print(f"  Last Seen: {result.get('last_seen', 'Not found')}")
        
        print("=" * 80)

if __name__ == "__main__":
    test_ocr()
