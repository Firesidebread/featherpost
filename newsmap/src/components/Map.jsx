import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { geoMercator, geoPath, geoBounds } from "d3-geo";
import { feature } from "topojson-client";
import countriesData from "../data/countries";

const Map = forwardRef(function Map(
  { onCountryClick, onCityClick, panelOpen },
  ref
) {
  const svgRef = useRef(null);
  const groupRef = useRef(null);
  const citiesLayerRef = useRef(null);
  const citiesDataRef = useRef([]);
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const geoFeaturesRef = useRef([]);
  const panelOpenRef = useRef(false);
  const selectedPathRef = useRef(null);
  const isAnimating = useRef(false);

  const width = 2400;
  const height = 1350;

  const projection = geoMercator()
    .scale(330)
    .translate([width / 2, height / 2 + 150]);

  const pathGenerator = geoPath().projection(projection);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  const applyTransform = (animated = false) => {
    if (!groupRef.current) return;
    const { x, y, scale } = transform.current;
    groupRef.current.style.transition = animated
      ? "transform 0.6s ease"
      : "none";
    groupRef.current.setAttribute(
      "transform",
      `translate(${x}, ${y}) scale(${scale})`
    );

    if (citiesLayerRef.current) {
      citiesLayerRef.current.style.transition = animated
        ? "transform 0.6s ease"
        : "none";
      citiesLayerRef.current.setAttribute(
        "transform",
        `translate(${x}, ${y}) scale(${scale})`
      );

      const cityGroups = citiesLayerRef.current.querySelectorAll("g.city");
      cityGroups.forEach((g) => {
        const cx = parseFloat(g.dataset.x);
        const cy = parseFloat(g.dataset.y);
        g.setAttribute(
          "transform",
          `translate(${cx}, ${cy}) scale(${1 / scale})`
        );
      });
    }
  };

  const clampTransform = () => {
    if (isAnimating.current) return;
    const scale = transform.current.scale;
    const panelOffset = panelOpenRef.current
      ? (360 / window.innerWidth) * width
      : 0;
    const maxX = (scale - 1) * (width / 2) + panelOffset;
    const minX = -((scale - 1) * width * 2);
    const maxY = (scale - 1) * height;
    const minY = -((scale - 1) * height);
    transform.current.x = Math.min(maxX, Math.max(minX, transform.current.x));
    transform.current.y = Math.min(maxY, Math.max(minY, transform.current.y));
  };

  const zoomToCountry = (geoFeature) => {
    const group = groupRef.current;
    if (!group) return;
    const pathEl = group.querySelector(`[data-id="${geoFeature.id}"]`);
    if (!pathEl) return;
    const savedTransform = group.getAttribute("transform");
    group.setAttribute("transform", "");
    const bbox = pathEl.getBBox();
    group.setAttribute("transform", savedTransform || "");
    if (!bbox.width || !bbox.height) return;
    const panelPx = panelOpenRef.current ? 360 : 0;
    const panelOffset = (panelPx / window.innerWidth) * width;
    const visibleWidth = width - panelOffset;
    const scaleX = (visibleWidth * 0.7) / bbox.width;
    const scaleY = (height * 0.7) / bbox.height;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 2), 52);
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    transform.current.scale = newScale;
    transform.current.x = visibleWidth / 2 - centerX * newScale;
    transform.current.y = height / 2 - centerY * newScale;
    isAnimating.current = true;
    applyTransform(true);
    setTimeout(() => {
      isAnimating.current = false;
    }, 700);
  };

  const loadCities = async (countryCode) => {
    if (citiesDataRef.current.length === 0) {
      const Papa = await import("papaparse");
      const response = await fetch("/worldcities.csv");
      const text = await response.text();
      const result = Papa.default.parse(text, { header: true });
      citiesDataRef.current = result.data;
    }

    if (citiesLayerRef.current) {
      citiesLayerRef.current.innerHTML = "";
    }

    const countryCities = citiesDataRef.current
      .filter(
        (c) =>
          c.iso2?.toLowerCase() === countryCode?.toLowerCase() && c.lat && c.lng
      )
      .sort((a, b) => Number(b.population) - Number(a.population))
      .slice(0, 5);

    const group = citiesLayerRef.current;
    if (!group) return;

    const scale = transform.current.scale;

    countryCities.forEach((city) => {
      const coords = projection([parseFloat(city.lng), parseFloat(city.lat)]);
      if (!coords) return;
      const [x, y] = coords;

      // wrap each city in a group with inverse scale transform
      // so it stays visually the same size regardless of map zoom
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "city");
      g.setAttribute("transform", `translate(${x}, ${y}) scale(${1 / scale})`);
      g.style.cursor = "pointer";
      g.dataset.x = x;
      g.dataset.y = y;
      g.setAttribute("transform", `translate(${x}, ${y}) scale(${1 / scale})`);

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", 0);
      circle.setAttribute("cy", 0);
      circle.setAttribute("r", 10);
      circle.setAttribute("fill", "#1A1A1A");
      circle.setAttribute("stroke", "#D4D0C8");
      circle.setAttribute("stroke-width", "1");
      circle.dataset.city = city.city;

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", 14);
      text.setAttribute("y", 7);
      text.setAttribute("font-size", "20");
      text.setAttribute("font-family", "Georgia, serif");
      text.setAttribute("fill", "#1A1A1A");
      text.setAttribute("pointer-events", "none");
      text.textContent = city.city;

      g.appendChild(circle);
      g.appendChild(text);
      group.appendChild(g);
    });

    const { x, y } = transform.current;
    citiesLayerRef.current.setAttribute(
      "transform",
      `translate(${x}, ${y}) scale(${scale})`
    );
  };

  useImperativeHandle(ref, () => ({
    zoomToId: (id) => {
      const geoFeature = geoFeaturesRef.current.find(
        (f) => String(f.id) === String(id)
      );
      if (geoFeature) zoomToCountry(geoFeature);
    },
  }));

  useEffect(() => {
    fetch("/world.json")
      .then((res) => res.json())
      .then((topology) => {
        const countries = feature(topology, topology.objects.countries);
        geoFeaturesRef.current = countries.features;
        const group = groupRef.current;
        if (!group) return;
        countries.features.forEach((geo) => {
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );
          path.setAttribute("d", pathGenerator(geo));
          path.setAttribute("fill", "#111111");
          path.setAttribute("stroke", "#D4D0C8");
          path.setAttribute("stroke-width", "0.5");
          path.style.cursor = "pointer";
          path.dataset.id = parseInt(geo.id);
          group.appendChild(path);
        });
      });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const scaleAmount = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(
        Math.max(transform.current.scale * scaleAmount, 1),
        52
      );
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const svgMouseX = (mouseX / rect.width) * width;
      const svgMouseY = (mouseY / rect.height) * height;
      transform.current.x =
        svgMouseX -
        (svgMouseX - transform.current.x) *
          (newScale / transform.current.scale);
      transform.current.y =
        svgMouseY -
        (svgMouseY - transform.current.y) *
          (newScale / transform.current.scale);
      transform.current.scale = newScale;
      if (newScale === 1) {
        transform.current.x = 0;
        transform.current.y = 0;
      }
      clampTransform();
      applyTransform();
    };

    const handleMouseDown = (e) => {
      isDragging.current = true;
      hasDragged.current = false;
      dragStart.current = {
        x: e.clientX - transform.current.x,
        y: e.clientY - transform.current.y,
      };
      svg.style.cursor = "grabbing";
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      hasDragged.current = true;
      transform.current.x = e.clientX - dragStart.current.x;
      transform.current.y = e.clientY - dragStart.current.y;
      clampTransform();
      applyTransform();
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      svg.style.cursor = "grab";
    };

    let lastHovered = null;
    const handleMouseOver = (e) => {
      const path = e.target.closest("path");
      if (!path || path === selectedPathRef.current) return;
      if (lastHovered && lastHovered !== selectedPathRef.current)
        lastHovered.style.fill = "#111111";
      path.style.fill = "#4A90D9";
      lastHovered = path;
    };

    const handleMouseOut = (e) => {
      const path = e.target.closest("path");
      if (!path || path === selectedPathRef.current) return;
      path.style.fill = "#111111";
      lastHovered = null;
    };

    const handleClick = (e) => {
      if (hasDragged.current) return;

      if (e.target.tagName.toLowerCase() === "circle") {
        const cityName = e.target.dataset.city;
        if (cityName && onCityClick) onCityClick(cityName);
        return;
      }

      const path = e.target.closest("path");
      if (!path) return;

      if (selectedPathRef.current && selectedPathRef.current !== path) {
        selectedPathRef.current.style.fill = "#111111";
      }

      selectedPathRef.current = path;
      const id = path.dataset.id;
      onCountryClick(id);

      const geoFeature = geoFeaturesRef.current.find(
        (f) => String(f.id) === String(id)
      );
      if (geoFeature) zoomToCountry(geoFeature);

      setTimeout(() => {
        if (selectedPathRef.current)
          selectedPathRef.current.style.fill = "#FFB703";
        const countryInfo = countriesData[parseInt(id)];
        if (countryInfo) loadCities(countryInfo.code);
      }, 650);
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    svg.addEventListener("mousedown", handleMouseDown);
    svg.addEventListener("mousemove", handleMouseMove);
    svg.addEventListener("mouseup", handleMouseUp);
    svg.addEventListener("mouseleave", handleMouseUp);
    svg.addEventListener("mouseover", handleMouseOver);
    svg.addEventListener("mouseout", handleMouseOut);
    svg.addEventListener("click", handleClick);

    return () => {
      svg.removeEventListener("wheel", handleWheel);
      svg.removeEventListener("mousedown", handleMouseDown);
      svg.removeEventListener("mousemove", handleMouseMove);
      svg.removeEventListener("mouseup", handleMouseUp);
      svg.removeEventListener("mouseleave", handleMouseUp);
      svg.removeEventListener("mouseover", handleMouseOver);
      svg.removeEventListener("mouseout", handleMouseOut);
      svg.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: "100%",
        height: "100%",
        background: "#D4D0C8",
        cursor: "grab",
        display: "block",
      }}
    >
      <g ref={groupRef} />
      <g ref={citiesLayerRef} />
    </svg>
  );
});

export default Map;
