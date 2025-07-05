import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
  useMapsLibrary,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { Plus, Minus } from 'lucide-react';

// A component to render directions and the confirmation card
const Directions = ({
  origin,
  destination,
  onDeny,
}: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  onDeny: () => void;
}) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    const service = new routesLibrary.DirectionsService();
    const renderer = new routesLibrary.DirectionsRenderer({ map });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !origin || !destination) return;

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirectionsResult(result);
        } else {
          console.error(`Error fetching directions ${result}`);
        }
      }
    );
  }, [directionsService, origin, destination]);

  useEffect(() => {
    if (!directionsRenderer) return;
    if (directionsResult) {
      directionsRenderer.setDirections(directionsResult);
    } else {
      directionsRenderer.setDirections(null);
    }
  }, [directionsRenderer, directionsResult]);

  const handleAccept = () => {
    const destinationUrl = `${destination.lat},${destination.lng}`;
    const originUrl = `${origin.lat},${origin.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originUrl}&destination=${destinationUrl}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (!directionsResult) return null;

  const leg = directionsResult.routes[0].legs[0];

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-card p-4 rounded-xl shadow-lg border border-border z-10">
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{leg.duration?.text}</p>
        <p className="text-sm text-muted-foreground">({leg.distance?.text})</p>
      </div>
      <div className="flex gap-4 mt-4">
        <button
          onClick={onDeny}
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          Deny
        </button>
        <button
          onClick={handleAccept}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

// Interface for search result places
interface SearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types?: string[];
  business_status?: string;
}

interface MapProps {
  searchResults?: SearchResult[];
  onMarkerClick?: (place: SearchResult) => void;
}

// A custom component for the zoom controls
const ZoomControls = () => {
  const map = useMap();

  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    if (currentZoom === undefined) return;
    map.setZoom(currentZoom + 1);
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    if (currentZoom === undefined) return;
    map.setZoom(currentZoom - 1);
  }, [map]);

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <button onClick={handleZoomIn} className="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-md hover:bg-secondary/80 transition-colors">
        <Plus size={20} />
      </button>
      <button onClick={handleZoomOut} className="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-md hover:bg-secondary/80 transition-colors">
        <Minus size={20} />
      </button>
    </div>
  );
};

const Map = ({ searchResults = [], onMarkerClick }: MapProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [route, setRoute] = useState(location.state as { origin: google.maps.LatLngLiteral; destination: google.maps.LatLngLiteral } | null);

  const [userLocation, setUserLocation] = useState({
    lat: 51.5072,
    lng: -0.1276,
  });
  const [zoom, setZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState(userLocation);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);

  // Get user's location
  useEffect(() => {
    if (!route && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newUserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newUserLocation);
          if (!route) {
            setMapCenter(newUserLocation);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, [route]);

  useEffect(() => {
    setRoute(location.state as { origin: google.maps.LatLngLiteral; destination: google.maps.LatLngLiteral } | null);
  }, [location.state]);

  // Update map center and zoom when search results change
  useEffect(() => {
    if (searchResults.length > 0) {
      // Calculate bounds
      let minLat = userLocation.lat;
      let maxLat = userLocation.lat;
      let minLng = userLocation.lng;
      let maxLng = userLocation.lng;

      searchResults.forEach((result) => {
        const { lat, lng } = result.geometry.location;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });

      // Center map
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      setMapCenter({ lat: centerLat, lng: centerLng });

      // Adjust zoom based on the span of locations
      const latSpan = maxLat - minLat;
      const lngSpan = maxLng - minLng;
      const maxSpan = Math.max(latSpan, lngSpan);

      let newZoom = 15;
      if (maxSpan > 0.1) newZoom = 11;
      else if (maxSpan > 0.05) newZoom = 12;
      else if (maxSpan > 0.01) newZoom = 13;
      else if (maxSpan > 0.005) newZoom = 14;

      setZoom(newZoom);
    }
  }, [searchResults, userLocation.lat, userLocation.lng]);

  const handleMarkerClick = (place: SearchResult) => {
    setSelectedPlace(place);
    if (onMarkerClick) {
      onMarkerClick(place);
    }
  };

  const handleDenyRoute = () => {
    setRoute(null);
    navigate('.', { replace: true, state: null });
  };

  // Custom icon URLs - using simple URL strings for compatibility
  const userLocationIcon =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
      </svg>
    `);

  const searchResultIcon =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4C12.13 4 9 7.13 9 11C9 16.25 16 28 16 28C16 28 23 16.25 23 11C23 7.13 19.87 4 16 4ZM16 13.5C14.62 13.5 13.5 12.38 13.5 11C13.5 9.62 14.62 8.5 16 8.5C17.38 8.5 18.5 9.62 18.5 11C18.5 12.38 17.38 13.5 16 13.5Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="1"/>
      </svg>
    `);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <div style={{ height: "100%", width: "100%", position: "relative" }}>
        <GoogleMap
          center={route ? route.origin : mapCenter}
          zoom={zoom}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          mapId="155fbee2be69234e"
        >
          {/* User's current location marker - always at their actual location */}
          {!route && <Marker
            position={userLocation}
            title="Your Location"
            icon={userLocationIcon}
          />}

          {/* Search result markers */}
          {!route && searchResults.map((result) => (
            <Marker
              key={result.place_id}
              position={result.geometry.location}
              title={result.name}
              onClick={() => handleMarkerClick(result)}
              icon={searchResultIcon}
            />
          ))}

          {/* Info window for selected place */}
          {selectedPlace && (
            <InfoWindow
              position={selectedPlace.geometry.location}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div className="p-3 max-w-xs">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {selectedPlace.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedPlace.formatted_address}
                </p>
                {selectedPlace.rating && (
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium">
                      {selectedPlace.rating}
                    </span>
                  </div>
                )}
                {selectedPlace.business_status && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {selectedPlace.business_status}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
          {route && <Directions origin={route.origin} destination={route.destination} onDeny={handleDenyRoute} />}
        </GoogleMap>
        <ZoomControls />
      </div>
    </APIProvider>
  );
};

export default Map;
