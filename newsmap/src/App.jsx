import { useState } from "react"
import Map from "./components/Map"
import NewsPanel from "./components/NewsPanel"
import WeatherWidget from "./components/WeatherWidget"



function App(){
  const[selectedCountry, setSelectedCountry] = useState(null)
  return (
    <div className="App">
      <Map onCountryClick ={setSelectedCountry} />
      <WeatherWidget country={selectedCountry} />
      <NewsPanel country={selectedCountry} />
    </div>
  )
}


export default App