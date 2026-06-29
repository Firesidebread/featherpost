import { useState, useEffect } from "react";
import useFetch from "../hook/useFetch";
import countries from "../data/countries";

function NewsPanel({ country }) {
  const countryData = countries[country];
  const weatherKey = import.meta.env.VITE_WEATHER_TOKEN;
  const newsKey = import.meta.env.VITE_NEWSAPI_TOKEN;

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const weatherUrl = countryData?.capital
    ? `https://api.openweathermap.org/data/2.5/weather?q=${countryData.capital}&appid=${weatherKey}&units=metric`
    : null;

  const { data: weatherData } = useFetch(weatherUrl);
  const worldBankUrl = countryData
    ? `https://api.worldbank.org/v2/country/${countryData.code.toUpperCase()}/indicator/SP.POP.TOTL?format=json&mrv=1`
    : null;
  const { data: wbData } = useFetch(worldBankUrl);
  const population = wbData?.[1]?.[0]?.value
    ? new Intl.NumberFormat().format(wbData[1][0].value)
    : null;

  useEffect(() => {
    setNews([]);
    setExpandedIndex(null);
    if (!countryData) return;
    setNewsLoading(true);

    fetch("https://newsapi.ai/api/v1/article/getArticles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getArticles",
        keyword: countryData.name,
        articlesCount: 5,
        articlesSortBy: "date",
        articlesSortByAsc: false,
        articlesArticleBodyLen: 500,
        resultType: "articles",
        lang: "eng",
        dataType: ["news"],
        apiKey: newsKey,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setNews(data?.articles?.results || []);
        setNewsLoading(false);
      })
      .catch(() => setNewsLoading(false));
  }, [country]);

  if (!country || !countryData) {
    return (
      <div className="panel-empty">
        <span>🌍</span>
        <p>Click a country to explore</p>
      </div>
    );
  }

  return (
    <>
      {/* header */}
      <div className="panel-header">
        <div className="panel-flag">{countryData.flag}</div>
        <div>
          <h2>{countryData.name}</h2>
          <span className="panel-region">{countryData.region}</span>
        </div>
      </div>

      {/* stats */}
      <div className="panel-stats">
        {population && (
          <div className="stat">
            <span className="stat-label">Population</span>
            <span className="stat-value">{population}</span>
          </div>
        )}
        <div className="stat">
          <span className="stat-label">Capital</span>
          <span className="stat-value">{countryData.capital}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Language</span>
          <span className="stat-value">{countryData.language}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Region</span>
          <span className="stat-value">{countryData.region}</span>
        </div>
      </div>

      {/* weather */}
      {weatherData && (
        <div className="panel-weather">
          <img
            src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
            alt={weatherData.weather[0].description}
          />
          <div>
            <span className="weather-temp">
              {Math.round(weatherData.main.temp)}°C
            </span>
            <span className="weather-city">{countryData.capital}</span>
            <span className="weather-desc">
              {weatherData.weather[0].description}
            </span>
          </div>
        </div>
      )}

      {/* news */}
      <div className="panel-news-header">Latest News</div>
      {newsLoading && <p className="panel-loading">Loading news...</p>}

      {news.map((article, index) => (
        <a
          key={index}
          href={expandedIndex === index ? undefined : article.url}
          target={expandedIndex === index ? undefined : "_blank"}
          rel="noreferrer"
          className={`news-article ${
            expandedIndex === index ? "expanded" : ""
          }`}
          onClick={(e) => {
            if (expandedIndex !== index) {
              e.preventDefault();
              setExpandedIndex(index);
            }
          }}
        >
          {article.image && <img src={article.image} alt={article.title} />}
          <div className="news-content">
            <h3>{article.title}</h3>
            {expandedIndex === index ? (
              <>
                <p>{article.body}</p>
                <div className="article-actions">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="read-more"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read full article →
                  </a>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedIndex(null);
                    }}
                    className="collapse-btn"
                  >
                    Collapse
                  </button>
                </div>
              </>
            ) : (
              <p>{article.body?.slice(0, 120)}...</p>
            )}
            <span>{new Date(article.dateTimePub).toLocaleDateString()}</span>
          </div>
        </a>
      ))}

      {!newsLoading && news.length === 0 && (
        <p className="panel-loading">No news found.</p>
      )}
    </>
  );
}

export default NewsPanel;
