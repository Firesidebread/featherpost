import useFetch from "../hook/useFetch"
import countries from "../data/countries"

function NewsPanel({ country }) {
  const countryData = countries[country]
  const apiKey = import.meta.env.VITE_GNEWS_TOKEN

  const url = countryData
    ? `https://gnews.io/api/v4/top-headlines?country=${countryData.code}&lang=en&max=5&apikey=${apiKey}`
    : null

  const { data, loading, error } = useFetch(url)

  // no country selected yet
  if (!country) {
    return (
      <div className="news-panel">
        <p>Click a country to see news</p>
      </div>
    )
  }

  // country clicked but not in our lookup table
  if (!countryData) {
    return (
      <div className="news-panel">
        <p>No news available for this region</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="news-panel">
        <h2>{countryData.name}</h2>
        <p>Loading news...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="news-panel">
        <h2>{countryData.name}</h2>
        <p>Failed to load news</p>
      </div>
    )
  }

  return (
    <div className="news-panel">
      <h2>{countryData.name}</h2>
      {data?.articles?.map((article, index) => (
        <a
          key={index}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="news-article"
        >
          {article.image && (
            <img src={article.image} alt={article.title} />
          )}
          <div className="news-content">
            <h3>{article.title}</h3>
            <p>{article.description}</p>
            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
          </div>
        </a>
      ))}
    </div>
  )}

export default NewsPanel