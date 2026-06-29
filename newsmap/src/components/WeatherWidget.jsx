import useFetch from "../hook/useFetch"
import countries from "../data/countries"

function WeatherWidget({ country }) {
  const countryData = countries[country]
  const apiKey = import.meta.env.VITE_WEATHER_TOKEN

  const url = countryData
    ? `https://api.openweathermap.org/data/2.5/weather?q=${countryData.name}&appid=${apiKey}&units=metric`
    : null

  const { data, loading, error } = useFetch(url)
  console.log("url:", url)
    console.log("data:", data)
    console.log("loading:", loading)
    console.log("error:", error)

  if (!country || !countryData) {
    return (
      <div className="weather-widget">
        <span>🌍 Click a country</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="weather-widget">
        <span>Loading weather...</span>
      </div>
    )
  }


  if (error) {
    return (
      <div className="weather-widget">
        <span>Weather unavailable</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="weather-widget">
      <span className="weather-country">{countryData.name}</span>
      <span className="weather-temp">{Math.round(data.main.temp)}°C</span>
      <span className="weather-desc">{data.weather[0].description}</span>
      <img
        src={`https://openweathermap.org/img/wn/${data.weather[0].icon}.png`}
        alt={data.weather[0].description}
      />
    </div>
  )
}

export default WeatherWidget