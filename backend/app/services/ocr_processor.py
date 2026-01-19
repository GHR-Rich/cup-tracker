import pytesseract
from PIL import Image, ImageEnhance
import re
from typing import Dict, Optional, Literal
from pathlib import Path

class CrossPlatformOCRProcessor:
    """
    OCR processor for Apple Find My and Google Find My Device Network screenshots.
    Extracts tracker names, addresses, and timestamps.
    """
    
    def __init__(self):
        # Apple Find My patterns
        self.apple_patterns = {
            'address': r'(\d+\s+[\w\s\-]+(?:Rd|Ave|St|Dr|Blvd|Pkwy|Way|Ln|Court|Place|Road|Avenue|Street|Drive|Boulevard|Parkway|Lane)[.,\s]*[\w\s]+,\s*[A-Z]{2}\s+\d{5})',
            'last_seen': r'(\d+\s+(?:second|minute|hour|day)s?\s+ago)',
        }
        
        # Google Find My Device patterns  
        self.google_patterns = {
            'address': r'(\d+\s+[\w\s\-]+(?:Rd|Ave|St|Dr|Blvd|Pkwy|Way|Ln|Court|Place|Road|Avenue|Street|Drive|Boulevard|Parkway|Lane)[.,\s]*[\w\s]+,\s*[A-Z]{2}\s+\d{5})',
            'last_seen': r'Last seen\s+(\d+\s+(?:min|hr|day)s?\s+ago)',
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
                'directions' in text and 'get directions' not in text,
            ])
            
            return 'google' if google_score > apple_score else 'apple'
            
        except Exception as e:
            print(f"Platform detection error: {e}")
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
            print(f"Detected platform: {platform}")
            
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
        processed = self._preprocess_image(info_panel)
        custom_config = r'--oem 3 --psm 6'
        raw_text = pytesseract.image_to_string(processed, config=custom_config)
        
        print(f"Raw OCR text:\n{raw_text}\n")
        
        # Get confidence
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        avg_confidence = self._calculate_confidence(ocr_data)
        
        # Parse with Apple patterns
        result = self._parse_text(raw_text, self.apple_patterns)
        result['confidence'] = avg_confidence
        result['raw_text'] = raw_text
        
        return result
    
    def _process_google_screenshot(self, image_path: str) -> Dict:
        """Process Google Find My Device Network screenshot."""
        img = Image.open(image_path)
        
        # Crop to info panel (bottom 35%)
        width, height = img.size
        info_panel = img.crop((0, int(height * 0.65), width, height))
        
        # Preprocess and run OCR
        processed = self._preprocess_image(info_panel)
        custom_config = r'--oem 3 --psm 6'
        raw_text = pytesseract.image_to_string(processed, config=custom_config)
        
        print(f"Raw OCR text:\n{raw_text}\n")
        
        # Get confidence
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        avg_confidence = self._calculate_confidence(ocr_data)
        
        # Parse with Google patterns
        result = self._parse_text(raw_text, self.google_patterns)
        
        # Normalize time format
        if 'last_seen' in result:
            result['last_seen'] = self._normalize_time_format(result['last_seen'])
        
        result['confidence'] = avg_confidence
        result['raw_text'] = raw_text
        
        return result
    
    def _normalize_time_format(self, time_str: str) -> str:
        """Normalize different time formats to standard format."""
        # Remove "Last seen" prefix if present
        time_str = re.sub(r'^Last seen\s+', '', time_str, flags=re.IGNORECASE)
        
        # Expand abbreviations
        time_str = time_str.replace(' min ', ' minutes ')
        time_str = time_str.replace(' hr ', ' hours ')
        
        return time_str
    
    def _preprocess_image(self, img: Image.Image) -> Image.Image:
        """Enhance image for better OCR accuracy."""
        # Convert to grayscale
        img = img.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Increase resolution (OCR works better on larger images)
        width, height = img.size
        img = img.resize((width * 2, height * 2), Image.LANCZOS)
        
        return img
    
    def _parse_text(self, text: str, patterns: Dict) -> Dict:
        """Extract structured data from OCR text using patterns."""
        result = {}
        
        # Extract tracker name (first non-empty line)
        lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
        if lines:
            result['tracker_name'] = lines[0]
        
        # Extract address
        address_match = re.search(patterns['address'], text, re.IGNORECASE | re.MULTILINE)
        if address_match:
            result['address'] = address_match.group(1)
        else:
            # Fallback: try to find address in lines
            for i, line in enumerate(lines):
                if re.search(r'\d+\s+\w+', line):  # Starts with number
                    # Combine this line and next few as address
                    result['address'] = ' '.join(lines[i:min(i+3, len(lines))])
                    break
        
        # Extract last seen
        last_seen_match = re.search(patterns['last_seen'], text, re.IGNORECASE)
        if last_seen_match:
            result['last_seen'] = last_seen_match.group(1)
        
        return result
    
    def _calculate_confidence(self, ocr_data: Dict) -> float:
        """Calculate average confidence score from OCR data."""
        confidences = [int(conf) for conf in ocr_data['conf'] if conf != '-1' and int(conf) > 0]
        return round(sum(confidences) / len(confidences), 2) if confidences else 0.0
