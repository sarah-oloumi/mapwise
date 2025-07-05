import { useState } from "react";
import { Bell } from "lucide-react";

const NewsPage = () => {
  const [activeFilter, setActiveFilter] = useState("All News");
  
  const filters = ["All News", "Traffic", "Transportation", "Health"];
  
  const newsArticles = [
    {
      id: 1,
      title: "The Popular Choice to Avoid Traffic Jams During 'Mudik' Season",
      category: "Transportation",
      timeAgo: "2 Hours ago",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png"
    },
    {
      id: 2,
      title: "Tips and Tricks for a Safe and Enjoyable Journey",
      category: "Tips Mudik",
      timeAgo: "4 Hours ago",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png"
    },
    {
      id: 3,
      title: "Public Urged to Use Alternative Modes of Transportation to Avoid...",
      category: "Health",
      timeAgo: "5 Hours ago",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png"
    },
    {
      id: 4,
      title: "Say Goodbye to Traffic Jams: How Sea Transportation is...",
      category: "Transportation",
      timeAgo: "6 Hours ago",
      image: "/lovable-uploads/21896294-aa28-48b0-a9b1-e77294464bd1.png"
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Wess News</h1>
        <Bell className="w-6 h-6 text-muted-foreground" />
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

      {/* News Articles */}
      <div className="flex-1 px-4 pb-20 overflow-y-auto">
        {/* Featured Article */}
        <div className="bg-card rounded-xl shadow-sm border border-border mb-4 overflow-hidden">
          <div className="aspect-video bg-muted relative">
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded mb-2">
                Transportation
              </span>
              <h2 className="text-white font-bold text-lg leading-tight">
                The Popular Choice to Avoid Traffic Jams During 'Mudik' Season
              </h2>
              <p className="text-white/80 text-sm mt-1">2 Hours ago</p>
            </div>
          </div>
        </div>

        {/* Other Articles */}
        <div className="space-y-3">
          {newsArticles.slice(1).map((article) => (
            <div key={article.id} className="bg-card rounded-xl shadow-sm border border-border p-4 flex gap-3">
              <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${
                  article.category === "Transportation" 
                    ? "bg-primary text-primary-foreground"
                    : article.category === "Health"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {article.category}
                </span>
                <h3 className="font-semibold text-foreground text-sm leading-tight mb-2">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground">{article.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsPage;
