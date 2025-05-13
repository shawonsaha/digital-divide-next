"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { StateData, TopoJSONFeature } from "@/types";
import { getStateColor, fipsToStateMap } from "@/lib/utils";
import {
  chartColors,
  chartContainerClass,
  chartSvgClass,
} from "@/lib/chartStyles";

interface ChoroplethMapProps {
  width?: number;
  height?: number;
  data: StateData[];
  topoData: any;
  selectedMetric: string;
  onStateSelect: (stateId: string, stateData: StateData) => void;
  selectedStates: { id: string; data: StateData }[];
  multipleSelectionMode: boolean;
  toggleSelectionMode: () => void;
  clearSelection: () => void;
}

const ChoroplethMap: React.FC<ChoroplethMapProps> = ({
  width = 960,
  height = 600,
  data,
  topoData,
  selectedMetric,
  onStateSelect,
  selectedStates,
  multipleSelectionMode,
  toggleSelectionMode,
  clearSelection,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  const dataByFips = new Map<string, StateData>();

  useEffect(() => {
    if (!data || !topoData || !svgRef.current) return;

    // Populate the data map
    data.forEach((d) => {
      const stateId = d.state_id;
      if (stateId) {
        const fips = stateToFipsMap[stateId];
        if (fips) dataByFips.set(fips, d);
      }
    });

    // Process the data for choropleth coloring
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    // Set explicit background
    svg.attr("style", "background-color: white;");

    const g = svg.append("g");

    // Create color scale
    const values = data
      .map((d) => parseFloat(d[selectedMetric]))
      .filter((v) => !isNaN(v));

    const colorScale = d3
      .scaleQuantize<string>()
      .domain([d3.min(values) || 0, d3.max(values) || 100])
      .range(d3.schemeBlues[9]);

    // Create path generator
    const path = d3.geoPath();

    // Extract states features from topojson
    const states = topojson.feature(
      topoData,
      topoData.objects.states
    ) as unknown as { features: TopoJSONFeature[] };

    // Draw states
    g.selectAll("path")
      .data(states.features)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d) => {
        const stateData = dataByFips.get(d.id);
        if (!stateData) return "#e5e7eb"; // Light gray for unknown states
        const value = parseFloat(stateData[selectedMetric]);
        return isNaN(value) ? "#e5e7eb" : getStateColor(value, colorScale);
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.5)
      .attr("class", (d) => {
        const isSelected = selectedStates.some((s) => s.id === d.id);
        return isSelected ? "state-path selected-state" : "state-path";
      })
      .on("mouseover", (event, d) => {
        const stateData = dataByFips.get(d.id);
        if (!stateData) return;

        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: (
            <>
              <strong>{stateData.State}</strong>
              <br />
              <strong>{selectedMetric}:</strong> {stateData[selectedMetric]}
            </>
          ),
        });
      })
      .on("mousemove", (event) => {
        setTooltip((prev) => ({
          ...prev,
          x: event.pageX + 10,
          y: event.pageY + 10,
        }));
      })
      .on("mouseout", () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on("click", (event, d) => {
        const stateData = dataByFips.get(d.id);
        if (!stateData) return;

        onStateSelect(d.id, stateData);
      });

    // Create zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Create legend
    const legendHeight = 20;
    const legendWidth = 300;
    const legendMargin = { top: 20, right: 30, bottom: 20, left: 30 };

    const legendX = d3
      .scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const legendXAxis = d3
      .axisBottom(legendX)
      .tickSize(13)
      .tickFormat(d3.format(".1f"));

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${(width - legendWidth) / 2},${height - legendHeight - 10})`
      );

    // Draw legend rectangles
    const colorDomain = colorScale.domain();
    const colorRange = colorScale.range();
    const step = (colorDomain[1] - colorDomain[0]) / colorRange.length;

    for (let i = 0; i < colorRange.length; i++) {
      legend
        .append("rect")
        .attr("x", (i * legendWidth) / colorRange.length)
        .attr("width", legendWidth / colorRange.length)
        .attr("height", 10)
        .attr("fill", colorRange[i]);
    }

    // Add legend axis
    legend
      .append("g")
      .attr("transform", `translate(0,10)`)
      .call(legendXAxis)
      .select(".domain")
      .remove();

    // Ensure legend text is visible
    legend.selectAll("text").attr("fill", chartColors.text);
  }, [data, topoData, selectedMetric, selectedStates]);

  return (
    <div className="relative bg-white p-4 rounded border border-gray-200">
      <div className="flex mb-4 space-x-2">
        <button
          onClick={toggleSelectionMode}
          className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {multipleSelectionMode ? "Selection Mode: ON" : "Selection Mode: OFF"}
        </button>
        <button
          onClick={clearSelection}
          className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Selection
        </button>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={chartSvgClass}
      />

      {tooltip.visible && (
        <div
          className="absolute bg-white border border-gray-300 rounded p-2 shadow-md text-sm pointer-events-none z-10 text-gray-800"
          style={{
            left: tooltip.x + "px",
            top: tooltip.y + "px",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// Convert FIPS to state abbreviation map to state abbreviation to FIPS map
const stateToFipsMap: Record<string, string> = Object.entries(
  fipsToStateMap
).reduce((acc, [fips, state]) => {
  acc[state] = fips;
  return acc;
}, {} as Record<string, string>);

export default ChoroplethMap;
