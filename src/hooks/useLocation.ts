import { useState, useEffect } from 'react';

export const useLocation = () => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    console.log('Attempting to get user location...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isCancelled) return;
          const newPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log('Successfully fetched location:', newPosition);
          setPosition(newPosition);
          setError(null);
        },
        (err) => {
          if (isCancelled) return;
          console.error('Error fetching location:', err.message);
          setError(`Could not fetch location: ${err.message}.`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const errorMessage = 'Geolocation is not supported by this browser.';
      console.error(errorMessage);
      if (!isCancelled) setError(errorMessage);
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!position) return;

    let isCancelled = false;

    const fetchCityName = async () => {
      const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!API_KEY) {
        if (!isCancelled) setError('Google Maps API key not found.');
        return;
      }

      try {
        console.log(`Reverse geocoding for lat: ${position.lat}, lng: ${position.lng}`);
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.lat},${position.lng}&key=${API_KEY}`);
        const data = await response.json();

        if (data.status === 'OK' && data.results[0]) {
          const addressComponents = data.results[0].address_components;
          const cityComponent = addressComponents.find((c: any) => c.types.includes('locality'));
          const stateComponent = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
          
          if (!isCancelled) {
            if (cityComponent) {
              setCity(cityComponent.long_name);
            } else if (stateComponent) {
              setCity(stateComponent.long_name); // Fallback to state
            } else {
              setError('Could not determine city from location.');
            }
          }
        } else {
          if (!isCancelled) setError(`Reverse geocoding failed: ${data.status}`);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Reverse geocoding fetch error:', err);
          setError('Failed to fetch city name.');
        }
      }
    };

    fetchCityName();

    return () => {
      isCancelled = true;
    };
  }, [position]);

  return { position, city, error };
};
