import { useState, useEffect, useRef } from 'react';
import { useLocation } from '@/hooks/useLocation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

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
  const isFetching = useRef(false);

  useEffect(() => {
    if (locationError) {
      setError(locationError);
      setLoading(false);
      return;
    }

    if (!city) {
      return; // Wait for the city to be available
    }

    let isCancelled = false;

    const fetchNews = async () => {
      if (!city || isFetching.current) {
        return; // Don't fetch if no city or if a fetch is already in progress
      }

      const cachedNews = sessionStorage.getItem(`news_${city}`);
      if (cachedNews) {
        console.log('Loading news from cache');
        setArticles(JSON.parse(cachedNews));
        setLoading(false);
        return;
      }

      try {
        isFetching.current = true;
        console.log(`Searching for news in ${city}`);
        const searchResponse = await fetch('/api/tavily/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `local news in ${city}`,
            search_depth: 'advanced',
            include_answer: false,
            include_images: true,
            include_raw_content: true,
            max_results: 5,
            topic: 'news',
          }),
        });

        const searchData = await searchResponse.json();

        if (!searchResponse.ok) {
          const errorMessage = searchData.message || searchData.error || `Request failed with status ${searchResponse.status}`;
          throw new Error(errorMessage);
        }

        if (!searchData.results || searchData.results.length === 0) {
          if (!isCancelled) setError('No news articles found for your area.');
          return;
        }

        const articlesWithContent = searchData.results.map((article: any) => ({
          ...article,
          content: article.raw_content || article.content || '',
        }));

        if (!isCancelled) {
          setArticles(articlesWithContent);
          sessionStorage.setItem(`news_${city}`, JSON.stringify(articlesWithContent));
        }

      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to fetch news:', err);
          setError(err.message || 'Failed to fetch news. Please check your connection.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        isFetching.current = false;
      }
    };

    fetchNews();

    return () => {
      isCancelled = true;
    };
  }, [city, locationError]);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-4">Fetching your location and local news...</div>;
    }

    if (error) {
      return <div className="text-center p-4 text-red-500">Error: {error}</div>;
    }

    if (articles.length === 0) {
        return <div className="text-center p-4">No news articles found for your current location.</div>;
    }

    return (
      <div className="flex flex-col items-center p-4 md:p-6 space-y-6">
        {articles.map((article, index) => (
          <a href={article.url} key={index} target="_blank" rel="noopener noreferrer" className="w-full max-w-4xl no-underline text-current">
            <Card className="flex flex-col overflow-hidden bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 ease-in-out border border-border">
              <CardHeader>
                <CardTitle>{article.title}</CardTitle>
              </CardHeader>
              <div className="p-5 flex flex-col flex-grow">
                <p className="text-sm text-muted-foreground mt-auto pt-2">
                  {new URL(article.url).hostname.replace('www.', '')}
                </p>
              </div>
            </Card>
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
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default NewsPage;

