import { useState, useRef } from "react";
import Map from "./components/Map";
import NewsPanel from "./components/NewsPanel";
import countries from "./data/countries";
import "./App.css";

function App() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(360);
  const isResizing = useRef(false);
  const mapRef = useRef(null);

  const handleCountryClick = (id) => {
    setSelectedCountry(id);
    setPanelOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const matches = Object.entries(countries)
      .filter(([, c]) => c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);

    setSearchResults(matches);
  };

  const handleSearchSelect = ([id, country]) => {
    setSelectedCountry(id);
    setPanelOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    if (mapRef.current) {
      mapRef.current.zoomToId(id);
    }
  };

  const handleResizeStart = (e) => {
    isResizing.current = true;
    e.preventDefault();

    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.min(Math.max(newWidth, 280), 700));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="app">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search a country..."
          value={searchQuery}
          onChange={handleSearch}
        />
        {searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map(([id, country]) => (
              <div
                key={id}
                className="search-result"
                onClick={() => handleSearchSelect([id, country])}
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="map-container">
        <Map
          ref={mapRef}
          onCountryClick={handleCountryClick}
          panelOpen={panelOpen}
        />
      </div>

      <div
        className={`news-panel ${panelOpen ? "open" : ""}`}
        style={{ width: panelWidth }}
      >
        <div className="panel-resize-handle" onMouseDown={handleResizeStart} />
        <div className="panel-content">
          <NewsPanel country={selectedCountry} />
        </div>
      </div>
    </div>
  );
}

export default App;
