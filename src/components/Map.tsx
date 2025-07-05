import { useState, useEffect, useCallback } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { Plus, Minus } from "lucide-react";

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

  if (!map) {
    return null;
  }

  return (
    <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
      <button
        onClick={handleZoomIn}
        className="bg-card text-foreground rounded-full p-2 shadow-md hover:bg-muted"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={handleZoomOut}
        className="bg-card text-foreground rounded-full p-2 shadow-md hover:bg-muted"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
};

const Map = ({ searchResults = [], onMarkerClick }: MapProps) => {
  const [userLocation, setUserLocation] = useState({
    lat: 51.5072,
    lng: -0.1276,
  });
  const [mapCenter, setMapCenter] = useState({ lat: 51.5072, lng: -0.1276 });
  const [zoom, setZoom] = useState(15);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);

  // Debug search results
  console.log("🗺️ [MAP COMPONENT] Received searchResults:", searchResults);
  console.log("🗺️ [MAP COMPONENT] Search results count:", searchResults.length);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(newLocation);
          setMapCenter(newLocation); // Initially center on user location
        },
        () => {
          console.error("Error fetching location.");
        }
      );
    }
  }, []);

  // Auto-fit map to show all search results (but keep user location fixed)
  useEffect(() => {
    if (searchResults.length > 0) {
      // Calculate bounds to fit all search results AND user location
      let minLat = userLocation.lat;
      let maxLat = userLocation.lat;
      let minLng = userLocation.lng;
      let maxLng = userLocation.lng;

      searchResults.forEach((result) => {
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });

      // Add some padding
      const padding = 0.01;
      minLat -= padding;
      maxLat += padding;
      minLng -= padding;
      maxLng += padding;

      // Calculate center and zoom level for the map view
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      setMapCenter({ lat: centerLat, lng: centerLng }); // Only update map center

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
          center={mapCenter}
          zoom={zoom}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          mapId="155fbee2be69234e"
        >
          {/* User's current location marker - always at their actual location */}
          <Marker
            position={userLocation}
            title="Your Location"
            icon={userLocationIcon}
          />

          {/* Search result markers */}
          {searchResults.map((result) => (
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
        </GoogleMap>
        <ZoomControls />
      </div>
    </APIProvider>
  );
};

export default Map;
