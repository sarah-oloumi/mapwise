import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
  useMapsLibrary,
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
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
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

const Map = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Use a local state for the route so we can clear it without navigating away
  const [route, setRoute] = useState(location.state as { origin: google.maps.LatLngLiteral; destination: google.maps.LatLngLiteral } | null);

  const [position, setPosition] = useState({ lat: 51.5072, lng: -0.1276 });
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    setRoute(location.state as { origin: google.maps.LatLngLiteral; destination: google.maps.LatLngLiteral } | null);
  }, [location.state]);

  useEffect(() => {
    // Only get current location if there's no route to display
    if (!route && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          console.error('Error fetching location.');
        }
      );
    }
  }, [route]);

  const handleDenyRoute = () => {
    setRoute(null);
    // Clear the location state so the route doesn't reappear on re-render
    navigate('.', { replace: true, state: null });
  };

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <GoogleMap
          center={route ? route.origin : position}
          zoom={zoom}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="155fbee2be69234e"
        >
          {!route && <Marker position={position} />}
          {route && <Directions origin={route.origin} destination={route.destination} onDeny={handleDenyRoute} />}
        </GoogleMap>
        <ZoomControls />
      </div>
    </APIProvider>
  );
};

export default Map;
