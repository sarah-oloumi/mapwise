import { useState, useEffect, useRef } from "react";
import { useLocation } from "@/hooks/useLocation";

interface NewsArticle {
  title: string;
  url: string;
  content: string;
  image?: string;
}

const NewsPage = () => {
  const { city, error: locationError } = useLocation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (locationError) {
      setError(locationError);
      setLoading(false);
      return;
    }

    if (!city) {
      return; // Wait for the city to be available
    }

    // This flag prevents the fetch from running if the component unmounts
    let isCancelled = false;

    const fetchNews = async () => {
      try {
        console.log(`Searching for news in ${city}`);
        const searchResponse = await fetch("/api/tavily/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `local news in ${city}`,
            search_depth: "advanced",
            include_answer: false,
            include_images: true,
            max_results: 5, // Fetch 5 to avoid excessive extract calls
          }),
        });

        const searchData = await searchResponse.json();
        if (
          !searchResponse.ok ||
          !searchData.results ||
          searchData.results.length === 0
        ) {
          setError(searchData.error || "No news articles found for your area.");
          setLoading(false);
          return;
        }

        console.log("Extracting content from search results...");
        const articlesWithFullContent = await Promise.all(
          searchData.results.map(async (article: NewsArticle) => {
            try {
              const extractResponse = await fetch("/api/tavily/extract", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ urls: [article.url] }),
              });
              const extractData = await extractResponse.json();
              if (
                extractResponse.ok &&
                extractData.results &&
                extractData.results.length > 0
              ) {
                return {
                  ...article,
                  content: extractData.results[0].raw_content,
                };
              }
              return article; // Return original article if extraction fails
            } catch (extractError) {
              console.error(
                `Failed to extract content for ${article.url}:`,
                extractError
              );
              return article; // Return original article on error
            }
          })
        );

        if (!isCancelled) {
          setArticles(articlesWithFullContent);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to fetch news:", err);
          setError(
            "Failed to fetch news. Please check your connection and API key."
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchNews();

    // Cleanup function to run when the component unmounts or re-runs the effect
    return () => {
      isCancelled = true;
    };
  }, [city, locationError]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center p-4">
          Fetching your location and local news...
        </div>
      );
    }

    if (error) {
      return <div className="text-center p-4 text-red-500">Error: {error}</div>;
    }

    if (articles.length === 0) {
      return (
        <div className="text-center p-4">
          No news articles found for your current location.
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
        {articles.map((article, index) => (
          <a
            href={article.url}
            key={index}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-4xl flex flex-col md:flex-row bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 ease-in-out overflow-hidden border border-border"
          >
            {article.image ? (
              <img
                src={article.image}
                alt={article.title}
                className="w-full md:w-1/3 h-56 md:h-auto object-cover"
              />
            ) : (
              <div className="w-full md:w-1/3 h-56 md:h-auto bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">
                  No Image Available
                </span>
              </div>
            )}
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="font-semibold text-xl mb-3 text-foreground flex-grow">
                {article.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-auto pt-2">
                {new URL(article.url).hostname.replace("www.", "")}
              </p>
            </div>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 bg-card shadow-sm border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Local News</h1>
      </header>
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
};

export default NewsPage;
