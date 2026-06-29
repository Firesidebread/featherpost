import { useEffect, useRef } from "react"
import { geoNaturalEarth1, geoPath } from "d3-geo"
import { feature } from "topojson-client"

function Map({ onCountryClick }) {
  const svgRef = useRef(null)
  const groupRef = useRef(null)
  const transform = useRef({ x: 0, y: 0, scale: 1 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const hasDragged = useRef(false)

  const width = 900
  const height = 500

  const projection = geoNaturalEarth1()
    .scale(150)
    .translate([width / 2, height / 2])

  const pathGenerator = geoPath().projection(projection)

  const applyTransform = () => {
    if (!groupRef.current) return
    const { x, y, scale } = transform.current
    groupRef.current.setAttribute(
      "transform",
      `translate(${x}, ${y}) scale(${scale})`
    )
  }

  useEffect(() => {
    fetch("/world.json")
      .then((res) => res.json())
      .then((topology) => {
        const countries = feature(topology, topology.objects.countries)
        const group = groupRef.current
        if (!group) return

        countries.features.forEach((geo) => {
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          )
          path.setAttribute("d", pathGenerator(geo))
          path.setAttribute("fill", "#4a4a8a")
          path.setAttribute("stroke", "#1a1a2e")
          path.setAttribute("stroke-width", "0.5")
          path.style.cursor = "pointer"
          path.dataset.id = geo.id
          group.appendChild(path)
        })
      })
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const handleWheel = (e) => {
      e.preventDefault()
      const scaleAmount = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(
        Math.max(transform.current.scale * scaleAmount, 1),
        8
      )

      const rect = svg.getBoundingClientRect()
      
      // mouse position relative to svg element
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // scale mouse position to viewBox coordinates
      const svgMouseX = (mouseX / rect.width) * width
      const svgMouseY = (mouseY / rect.height) * height

      // adjust translation so point under mouse stays fixed
      transform.current.x = svgMouseX - (svgMouseX - transform.current.x) * (newScale / transform.current.scale)
      transform.current.y = svgMouseY - (svgMouseY - transform.current.y) * (newScale / transform.current.scale)
      transform.current.scale = newScale

      applyTransform()
    }

    const handleMouseDown = (e) => {
      isDragging.current = true
      hasDragged.current = false
      dragStart.current = {
        x: e.clientX - transform.current.x,
        y: e.clientY - transform.current.y,
      }
      svg.style.cursor = "grabbing"
    }

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      hasDragged.current = true
      transform.current.x = e.clientX - dragStart.current.x
      transform.current.y = e.clientY - dragStart.current.y
      applyTransform()
    }

    const handleMouseUp = () => {
      isDragging.current = false
      svg.style.cursor = "grab"
    }

    let lastHovered = null
    const handleMouseOver = (e) => {
      const path = e.target.closest("path")
      if (!path) return
      if (lastHovered) lastHovered.style.fill = "#4a4a8a"
      path.style.fill = "#F53"
      lastHovered = path
    }

    const handleMouseOut = (e) => {
      const path = e.target.closest("path")
      if (!path) return
      path.style.fill = "#4a4a8a"
      lastHovered = null
    }

    const handleClick = (e) => {
      if (hasDragged.current) return
      const path = e.target.closest("path")
      if (!path) return
      onCountryClick(path.dataset.id)
    }

    svg.addEventListener("wheel", handleWheel, { passive: false })
    svg.addEventListener("mousedown", handleMouseDown)
    svg.addEventListener("mousemove", handleMouseMove)
    svg.addEventListener("mouseup", handleMouseUp)
    svg.addEventListener("mouseleave", handleMouseUp)
    svg.addEventListener("mouseover", handleMouseOver)
    svg.addEventListener("mouseout", handleMouseOut)
    svg.addEventListener("click", handleClick)

    return () => {
      svg.removeEventListener("wheel", handleWheel)
      svg.removeEventListener("mousedown", handleMouseDown)
      svg.removeEventListener("mousemove", handleMouseMove)
      svg.removeEventListener("mouseup", handleMouseUp)
      svg.removeEventListener("mouseleave", handleMouseUp)
      svg.removeEventListener("mouseover", handleMouseOver)
      svg.removeEventListener("mouseout", handleMouseOut)
      svg.removeEventListener("click", handleClick)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", background: "#1a1a2e", cursor: "grab" }}
    >
      <g ref={groupRef} />
    </svg>
  )
}

export default Map