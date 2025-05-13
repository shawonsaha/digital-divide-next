// Common styling for charts to ensure they work in light mode
export const chartColors = {
  background: "#ffffff",
  text: "#1f2937",
  axis: "#9ca3af",
  grid: "#e5e7eb",
  bars: "#3b82f6",
  highlight: "#2563eb",
  accent1: "#ef4444",
  accent2: "#10b981",
  accent3: "#f59e0b",
  accent4: "#8b5cf6",
  accent5: "#ec4899",
  colorScale: [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#14b8a6", // teal
    "#6366f1", // indigo
  ],
};

// Create a light theme for d3 components
export const applyChartStyles = (svg: SVGElement) => {
  // Apply light mode styling to all SVG elements
  const svgElement = svg as SVGElement;
  
  // Set light background
  svgElement.style.backgroundColor = chartColors.background;
  
  // Ensure text is visible
  const texts = svgElement.querySelectorAll('text');
  texts.forEach(text => {
    text.style.fill = chartColors.text;
  });
  
  // Ensure axes are visible
  const axes = svgElement.querySelectorAll('.axis line, .axis path');
  axes.forEach(axis => {
    (axis as SVGElement).style.stroke = chartColors.axis;
  });
  
  // Ensure grids are visible
  const grids = svgElement.querySelectorAll('.grid line');
  grids.forEach(grid => {
    (grid as SVGElement).style.stroke = chartColors.grid;
  });
};

// CSS class names for chart containers
export const chartContainerClass = "bg-white border border-gray-300 rounded shadow";
export const chartSvgClass = "bg-white text-gray-800";

// Default chart margins
export const defaultMargin = { top: 40, right: 40, bottom: 50, left: 60 }; 