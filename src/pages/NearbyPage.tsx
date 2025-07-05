import { useState } from "react";
import { Star, MapPin, Navigation, Heart } from "lucide-react";

const NearbyPage = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Top Rated", "Open Now"];
  
  const nearbyPlaces = [
    {
      id: 1,
      name: "Daniasyrofi Fruit Shop",
      rating: 4.9,
      reviewCount: 201,
      distance: "1.2 Km",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png",
      category: "Shop"
    },
    {
      id: 2,
      name: "Gift Shop & Florist",
      rating: 4.8,
      reviewCount: 156,
      distance: "0.8 Km", 
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png",
      category: "Shop"
    },
    {
      id: 3,
      name: "The Corner Bistro",
      rating: 4.7,
      reviewCount: 324,
      distance: "0.5 Km",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png",
      category: "Restaurant"
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Nearby</h1>
        <Heart className="w-6 h-6 text-muted-foreground" />
      </header>

      {/* Filters */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Places List */}
      <div className="flex-1 px-4 pb-20 overflow-y-auto">
        {/* Shop Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Shop</h2>
            <button className="text-sm text-primary font-medium">See All</button>
          </div>
          
          {nearbyPlaces.filter(place => place.category === "Shop").map((place) => (
            <div key={place.id} className="bg-card rounded-xl shadow-sm border border-border mb-3 overflow-hidden">
              <div className="aspect-video bg-muted"></div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-base">{place.name}</h3>
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{place.rating}</span>
                    <span className="text-sm text-muted-foreground">({place.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{place.distance}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    <Navigation className="w-4 h-4" />
                    Direction
                  </button>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Restaurants Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Restaurants</h2>
            <button className="text-sm text-primary font-medium">See All</button>
          </div>
          
          {nearbyPlaces.filter(place => place.category === "Restaurant").map((place) => (
            <div key={place.id} className="bg-card rounded-xl shadow-sm border border-border mb-3 overflow-hidden">
              <div className="aspect-video bg-muted"></div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-base">{place.name}</h3>
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{place.rating}</span>
                    <span className="text-sm text-muted-foreground">({place.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{place.distance}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    <Navigation className="w-4 h-4" />
                    Direction
                  </button>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NearbyPage;