import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronDown } from "lucide-react";

const NearbyPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // State for shops
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [shopsNextPageToken, setShopsNextPageToken] = useState<string | null>(null);

  // State for restaurants
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantsNextPageToken, setRestaurantsNextPageToken] = useState<string | null>(null);

  // State for toggling list view
  const [showAllShops, setShowAllShops] = useState(false);
  const [showAllRestaurants, setShowAllRestaurants] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('Geolocation permission denied. Please enable it in your browser settings.');
        setLoading(false);
      }
    );
  }, []);

  const fetchPlaces = async (type: 'store' | 'restaurant', pagetoken: string | null = null) => {
    if (!userLocation && !pagetoken) return { results: [], nextPageToken: null };

    let url;
    if (pagetoken) {
      // The key is only needed for pagetoken requests on the backend.
      url = `http://localhost:3001/api/nearby?pagetoken=${pagetoken}`;
    } else if (userLocation) {
      url = `http://localhost:3001/api/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&type=${type}`;
    } else {
      return { results: [], nextPageToken: null };
    }
    
    // A short delay is required before a next_page_token can be used.
    if (pagetoken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || `Failed to fetch ${type}s`);
      }

      return { 
        results: data.results || [], 
        nextPageToken: data.next_page_token || null 
      };
    } catch (err: any) {
      setError(err.message);
      return { results: [], nextPageToken: null };
    }
  };

  // Initial fetch for both types
  useEffect(() => {
    if (userLocation) {
      setLoadingShops(true);
      setLoadingRestaurants(true);
      Promise.all([
        fetchPlaces('store'),
        fetchPlaces('restaurant')
      ]).then(([shopsData, restaurantsData]) => {
        setShops(shopsData.results);
        setShopsNextPageToken(shopsData.nextPageToken);
        setLoadingShops(false);

        setRestaurants(restaurantsData.results);
        setRestaurantsNextPageToken(restaurantsData.nextPageToken);
        setLoadingRestaurants(false);
      });
    }
  }, [userLocation]);

  const handleLoadMore = async (type: 'store' | 'restaurant') => {
    const token = type === 'store' ? shopsNextPageToken : restaurantsNextPageToken;
    if (!token) return;

    if (type === 'store') setLoadingShops(true);
    else setLoadingRestaurants(true);

    const data = await fetchPlaces(type, token);

    if (type === 'store') {
      setShops(prev => [...prev, ...data.results]);
      setShopsNextPageToken(data.nextPageToken);
      setLoadingShops(false);
    } else {
      setRestaurants(prev => [...prev, ...data.results]);
      setRestaurantsNextPageToken(data.nextPageToken);
      setLoadingRestaurants(false);
    }
  };

  const toggleShowAll = (type: 'store' | 'restaurant') => {
    if (type === 'store') {
      // If expanding and more results might be available, fetch them.
      if (!showAllShops && shopsNextPageToken) {
        handleLoadMore('store');
      }
      setShowAllShops(prev => !prev);
    } else {
      if (!showAllRestaurants && restaurantsNextPageToken) {
        handleLoadMore('restaurant');
      }
      setShowAllRestaurants(prev => !prev);
    }
  };

  const renderPlace = (place: any) => (
    <div key={place.place_id} className="bg-card rounded-xl shadow-sm border border-border mb-3 overflow-hidden">
      <div className="aspect-video bg-muted">
        {place.photos && place.photos[0] && (
          <img 
            src={`http://localhost:3001/api/photo?photoreference=${place.photos[0].photo_reference}`}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground">{place.name}</h3>
        <p className="text-sm text-muted-foreground">{place.vicinity}</p>
        <div className="flex items-center mt-2">
          <span className="text-sm font-medium text-primary">{place.rating}</span>
          <Star className="w-4 h-4 text-yellow-400 ml-1" />
          <span className="text-sm text-muted-foreground ml-2">({place.user_ratings_total} reviews)</span>
        </div>
        <div className="flex gap-2 mt-4">
                    <button
            onClick={() => {
              if (userLocation && place.geometry?.location) {
                navigate('/', {
                  state: {
                    origin: userLocation,
                    destination: place.geometry.location,
                  },
                });
              }
            }}
            className="w-full bg-primary text-primary-foreground text-sm font-medium h-9 rounded-md"
          >
            Directions
          </button>
          <button className="w-full bg-secondary text-secondary-foreground text-sm font-medium h-9 rounded-md">Share</button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="p-4 text-center">Getting your location...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Shop</h2>
          {shops.length > 2 && (
            <button onClick={() => toggleShowAll('store')} className="flex items-center text-sm text-primary font-medium">
              {showAllShops ? 'Show Less' : 'Show More'}
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllShops ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {loadingShops && shops.length === 0 ? (
          <p>Loading shops...</p>
        ) : shops.length > 0 ? (
          shops.slice(0, showAllShops ? undefined : 2).map(renderPlace)
        ) : (
          <p>No shops found nearby.</p>
        )}
        {showAllShops && shopsNextPageToken && (
          <button onClick={() => handleLoadMore('store')} disabled={loadingShops} className="w-full mt-2 bg-secondary text-secondary-foreground text-sm font-medium h-9 rounded-md">
            {loadingShops ? 'Loading...' : 'Load More Shops'}
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Restaurants</h2>
          {restaurants.length > 2 && (
            <button onClick={() => toggleShowAll('restaurant')} className="flex items-center text-sm text-primary font-medium">
              {showAllRestaurants ? 'Show Less' : 'Show More'}
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllRestaurants ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {loadingRestaurants && restaurants.length === 0 ? (
          <p>Loading restaurants...</p>
        ) : restaurants.length > 0 ? (
          restaurants.slice(0, showAllRestaurants ? undefined : 2).map(renderPlace)
        ) : (
          <p>No restaurants found nearby.</p>
        )}
        {showAllRestaurants && restaurantsNextPageToken && (
          <button onClick={() => handleLoadMore('restaurant')} disabled={loadingRestaurants} className="w-full mt-2 bg-secondary text-secondary-foreground text-sm font-medium h-9 rounded-md">
            {loadingRestaurants ? 'Loading...' : 'Load More Restaurants'}
          </button>
        )}
      </div>
    </div>
  );
};

export default NearbyPage;