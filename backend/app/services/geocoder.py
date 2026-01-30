from typing import Optional, Tuple
from decimal import Decimal
import requests
import time


class Geocoder:
    def __init__(self):
        self.base_url = "https://nominatim.openstreetmap.org/search"
        self.headers = {
            'User-Agent': 'CupTracker/0.1 (investigating plastic cup lifecycle)'
        }
        self.last_request_time = 0
    
    def geocode(self, address: str) -> Optional[Tuple[Decimal, Decimal, str, str, str]]:
        """
        Geocode an address and return (lat, lng, city, state, postal_code)
        """
        # Rate limiting: 1 request per second
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < 1.0:
            time.sleep(1.0 - time_since_last)
        
        params = {
            'q': address,
            'format': 'json',
            'limit': 1,
            'addressdetails': 1  # Get structured address data
        }
        
        try:
            response = requests.get(self.base_url, params=params, headers=self.headers)
            self.last_request_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    result = data[0]
                    address_details = result.get('address', {})
                    
                    return (
                        Decimal(result['lat']),
                        Decimal(result['lon']),
                        address_details.get('city') or address_details.get('town') or address_details.get('village'),
                        address_details.get('state'),
                        address_details.get('postcode')
                    )
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
