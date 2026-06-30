import { useState, useRef, useEffect } from "react";
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
  const [launched, setLaunched] = useState(false);
  const isResizing = useRef(false);
  const mapRef = useRef(null);

  const handleCountryClick = (id) => {
    setLaunched(true);
    setSelectedCountry(id);
    setPanelOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = (e) => {
    setLaunched(true);
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
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  // auto dismiss after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFading(true);
      setTimeout(() => setShowSplash(false), 600);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app">
      {showSplash && (
        <div
          className={`splash ${splashFading ? "fading" : ""}`}
          onClick={() => {
            setSplashFading(true);
            setTimeout(() => setShowSplash(false), 600);
          }}
        >
          <img src="/logo.png" alt="Featherpost" />
          <span>featherpost</span>
        </div>
      )}
      {/* intro logo */}
      <div className={`logo-intro ${launched ? "launched" : ""}`}>
        <img src="/logo.png" alt="Featherpost" />
        <span>featherpost</span>
      </div>

      {/* header */}
      <div className={`app-header ${launched ? "launched" : ""}`}>
        <img src="/logo.png" alt="Featherpost" className="header-logo" />
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
          <NewsPanel
            country={selectedCountry}
            onClose={() => setPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
