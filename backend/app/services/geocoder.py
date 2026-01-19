import requests
import time
from typing import Optional, Tuple
from decimal import Decimal

class Geocoder:
    """
    Geocoding service using Nominatim (OpenStreetMap).
    Free tier: 1 request per second.
    """
    
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/search"
        self.headers = {
            'User-Agent': 'CupTrackerApp/1.0 (Investigative Research)'
        }
        self.last_request_time = 0
        self.min_request_interval = 1.0  # 1 second between requests (Nominatim rate limit)
    
    def geocode(self, address: str) -> Optional[Tuple[Decimal, Decimal]]:
        """
        Convert address to (latitude, longitude) coordinates.
        
        Returns:
            Tuple of (lat, lng) as Decimal, or None if geocoding fails
        """
        if not address:
            return None
        
        # Rate limiting - wait if necessary
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        
        try:
            params = {
                'q': address,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            response = requests.get(
                self.base_url,
                params=params,
                headers=self.headers,
                timeout=5
            )
            
            self.last_request_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                
                if data and len(data) > 0:
                    result = data[0]
                    lat = Decimal(result['lat'])
                    lng = Decimal(result['lon'])
                    
                    print(f"✓ Geocoded: {address} → ({lat}, {lng})")
                    return (lat, lng)
                else:
                    print(f"✗ No results for: {address}")
                    return None
            else:
                print(f"✗ Geocoding API error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Geocoding exception: {str(e)}")
            return None
    
    def parse_address_components(self, address: str) -> dict:
        """
        Extract city, state, postal code from address using geocoding API.
        Returns enhanced address details.
        """
        if not address:
            return {}
        
        # Rate limiting
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        
        try:
            params = {
                'q': address,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            response = requests.get(
                self.base_url,
                params=params,
                headers=self.headers,
                timeout=5
            )
            
            self.last_request_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                
                if data and len(data) > 0:
                    addr = data[0].get('address', {})
                    
                    return {
                        'city': addr.get('city') or addr.get('town') or addr.get('village'),
                        'state': addr.get('state'),
                        'country': addr.get('country'),
                        'postal_code': addr.get('postcode')
                    }
            
            return {}
            
        except Exception as e:
            print(f"✗ Address parsing exception: {str(e)}")
            return {}
