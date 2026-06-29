import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { geoMercator, geoPath, geoBounds } from "d3-geo";
import { feature } from "topojson-client";

const Map = forwardRef(function Map({ onCountryClick, panelOpen }, ref) {
  const svgRef = useRef(null);
  const groupRef = useRef(null);
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const geoFeaturesRef = useRef([]);
  const panelOpenRef = useRef(false);

  const width = 1600;
  const height = 900;

  const projection = geoMercator()
    .scale(220)
    .translate([width / 2, height / 2 + 100]);

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
  };

  const clampTransform = () => {
    const scale = transform.current.scale;
    const panelOffset = panelOpenRef.current
      ? (360 / window.innerWidth) * width
      : 0;

    const maxX = (scale - 1) * (width / 2) + panelOffset;
    const minX = -((scale - 1) * width); // allow panning much further right
    const maxY = (scale - 1) * (height / 2);

    transform.current.x = Math.min(maxX, Math.max(minX, transform.current.x));
    transform.current.y = Math.min(maxY, Math.max(-maxY, transform.current.y));
  };

  const zoomToCountry = (geoFeature) => {
    const bounds = geoBounds(geoFeature);
    if (!bounds || !isFinite(bounds[0][0])) return;

    const p0 = projection(bounds[0]);
    const p1 = projection(bounds[1]);
    if (!p0 || !p1) return;

    const countryWidth = Math.abs(p1[0] - p0[0]);
    const countryHeight = Math.abs(p0[1] - p1[1]);
    const centerX = (p0[0] + p1[0]) / 2;
    const centerY = (p0[1] + p1[1]) / 2;

    const padding = 0.5;
    const scaleX = (width * padding) / countryWidth;
    const scaleY = (height * padding) / countryHeight;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 1), 8);

    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleRatioX = width / svgRect.width;

    const panelPx = panelOpenRef.current ? 360 : 0;
    const panelOffset = panelPx * scaleRatioX;
    const visibleCenterX = (width - panelOffset) / 2;

    transform.current.scale = newScale;
    transform.current.x = visibleCenterX - centerX * newScale;
    transform.current.y = height / 2 - centerY * newScale;

    applyTransform(true);
  };

  // expose zoomToId to parent via ref
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
          path.setAttribute("fill", "#2d3561");
          path.setAttribute("stroke", "#0d1117");
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
        8
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
      if (!path) return;
      if (lastHovered) lastHovered.style.fill = "#2d3561";
      path.style.fill = "#e94560";
      lastHovered = path;
    };

    const handleMouseOut = (e) => {
      const path = e.target.closest("path");
      if (!path) return;
      path.style.fill = "#2d3561";
      lastHovered = null;
    };

    const handleClick = (e) => {
      if (hasDragged.current) return;
      const path = e.target.closest("path");
      if (!path) return;
      const id = path.dataset.id;
      onCountryClick(id);

      const geoFeature = geoFeaturesRef.current.find(
        (f) => String(f.id) === String(id)
      );
      if (geoFeature) zoomToCountry(geoFeature);
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
        background: "#0a0f1e",
        cursor: "grab",
        display: "block",
      }}
    >
      <g ref={groupRef} />
    </svg>
  );
});

export default Map;
