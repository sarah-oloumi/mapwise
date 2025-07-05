import { useState, useCallback } from 'react';
import { useLocation } from '@/hooks/useLocation';
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useMap,
} from '@vis.gl/react-google-maps';
import { Plus, Minus } from 'lucide-react';

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
  const { position, error: locationError } = useLocation();
  const [zoom, setZoom] = useState(15);
  const defaultCenter = { lat: 51.5072, lng: -0.1276 }; // Default to London if no position

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <GoogleMap
          center={position || defaultCenter}
          zoom={zoom}
          onZoomChanged={(e) => setZoom(e.detail.zoom)}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="155fbee2be69234e"
        >
          {locationError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-red-500 p-4 bg-card rounded-lg shadow-md">{locationError}</p>
          </div>
        )}
        {!locationError && !position && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <p className="p-4 bg-card rounded-lg shadow-md">Fetching location...</p>
            </div>
        )}
        {position && <Marker position={position} />}
        </GoogleMap>
        <ZoomControls />
      </div>
    </APIProvider>
  );
};

export default Map;
