"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { StateData, TopoJSONFeature } from "@/types";
import { getStateColor, fipsToStateMap } from "@/lib/utils";
import RadarChart from "./RadarChart";
import {
  chartColors,
  chartContainerClass,
  chartSvgClass,
} from "@/lib/chartStyles";

// Define regions for the US
const regions: Record<string, string[]> = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  Midwest: [
    "IL",
    "IN",
    "MI",
    "OH",
    "WI",
    "IA",
    "KS",
    "MN",
    "MO",
    "NE",
    "ND",
    "SD",
  ],
  South: [
    "DE",
    "FL",
    "GA",
    "MD",
    "NC",
    "SC",
    "VA",
    "WV",
    "AL",
    "KY",
    "MS",
    "TN",
    "AR",
    "LA",
    "OK",
    "TX",
  ],
  West: [
    "AZ",
    "CO",
    "ID",
    "MT",
    "NV",
    "NM",
    "UT",
    "WY",
    "AK",
    "CA",
    "HI",
    "OR",
    "WA",
  ],
};

interface RegionalMapProps {
  width?: number;
  height?: number;
  data: StateData[];
  topoData: any;
  selectedMetrics: string[];
  onRegionSelect: (region: string, states: StateData[]) => void;
  selectedRegion: string | null;
}

const RegionalMap: React.FC<RegionalMapProps> = ({
  width = 960,
  height = 500,
  data,
  topoData,
  selectedMetrics,
  onRegionSelect,
  selectedRegion,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
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
  const dataByState = new Map<string, StateData>();

  useEffect(() => {
    if (!data || !topoData || !svgRef.current) return;

    // Populate data maps
    data.forEach((d) => {
      const stateId = d.state_id;
      if (stateId) {
        dataByState.set(stateId, d);
        const fips = stateToFipsMap[stateId];
        if (fips) dataByFips.set(fips, d);
      }
    });

    // Process the data for map coloring
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    // Set explicit background
    svg.attr("style", "background-color: white;");

    const g = svg.append("g");

    // Create path generator
    const path = d3.geoPath();

    // Extract states features from topojson
    const states = topojson.feature(
      topoData,
      topoData.objects.states
    ) as unknown as { features: TopoJSONFeature[] };

    // Create a color scale for regions
    const regionColorScale = d3
      .scaleOrdinal<string>()
      .domain(Object.keys(regions))
      .range(d3.schemeSet1);

    // Draw states
    g.selectAll("path")
      .data(states.features)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d) => {
        const stateCode = fipsToStateMap[d.id];
        if (!stateCode) return "#e5e7eb"; // Light gray for unknown states

        // Find which region this state belongs to
        const region = Object.entries(regions).find(([_, states]) =>
          states.includes(stateCode)
        );

        if (!region) return "#e5e7eb";
        return regionColorScale(region[0]);
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.5)
      .attr("class", "state-path")
      .on("mouseover", (event, d) => {
        const stateCode = fipsToStateMap[d.id];
        if (!stateCode) return;

        const region = Object.entries(regions).find(([_, states]) =>
          states.includes(stateCode)
        );

        if (!region) return;

        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: (
            <>
              <strong>State: {stateCode}</strong>
              <br />
              <strong>Region: {region[0]}</strong>
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
      });

    // Draw region boundaries
    const regionPaths: Record<string, d3.GeoPath> = {};

    Object.entries(regions).forEach(([regionName, statesList]) => {
      const regionStates = states.features.filter((state) => {
        const stateCode = fipsToStateMap[state.id];
        return stateCode && statesList.includes(stateCode);
      });

      if (regionStates.length) {
        // Create hull or boundary for region
        const merged = topojson.merge(
          topoData,
          topoData.objects.states.geometries.filter((geo: any) => {
            const stateCode = fipsToStateMap[geo.id];
            return stateCode && statesList.includes(stateCode);
          })
        );

        g.append("path")
          .datum(merged)
          .attr("d", path as any)
          .attr("fill", "none")
          .attr("stroke", regionColorScale(regionName))
          .attr("stroke-width", selectedRegion === regionName ? 3 : 2)
          .attr(
            "stroke-dasharray",
            selectedRegion === regionName ? "none" : "5,5"
          )
          .attr("class", "region-path")
          .attr("pointer-events", "all")
          .on("click", () => {
            const regionStateData = data.filter((d) =>
              statesList.includes(d.state_id)
            );
            onRegionSelect(regionName, regionStateData);
          })
          .style("cursor", "pointer");

        // Add region label
        const centroid = path.centroid(merged);
        g.append("text")
          .attr("x", centroid[0])
          .attr("y", centroid[1])
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("font-weight", "bold")
          .attr("fill", "#000000") // Ensure text is visible
          .attr("pointer-events", "none")
          .text(regionName);
      }
    });

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10]) // Extend the zoom range like in ChoroplethMap
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
      });

    // Add double-click to reset zoom
    svg.on("dblclick", () => {
      svg
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity);
      zoomTransformRef.current = d3.zoomIdentity;
    });

    // Add zoom controls
    const zoomControls = svg
      .append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 60}, 20)`);

    // Zoom in button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 24)
      .attr("height", 24)
      .attr("fill", "white")
      .attr("stroke", "#999")
      .attr("rx", 3)
      .style("cursor", "pointer")
      .on("click", () => {
        svg
          .transition()
          .duration(750)
          .call(zoom.scaleBy as any, 1.3);
      });

    zoomControls
      .append("text")
      .attr("x", 12)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
      .style("font-size", "18px")
      .style("pointer-events", "none")
      .text("+");

    // Zoom out button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 30)
      .attr("width", 24)
      .attr("height", 24)
      .attr("fill", "white")
      .attr("stroke", "#999")
      .attr("rx", 3)
      .style("cursor", "pointer")
      .on("click", () => {
        svg
          .transition()
          .duration(750)
          .call(zoom.scaleBy as any, 0.7);
      });

    zoomControls
      .append("text")
      .attr("x", 12)
      .attr("y", 46)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
      .style("font-size", "18px")
      .style("pointer-events", "none")
      .text("−");

    // Reset button
    zoomControls
      .append("rect")
      .attr("x", 0)
      .attr("y", 60)
      .attr("width", 24)
      .attr("height", 24)
      .attr("fill", "white")
      .attr("stroke", "#999")
      .attr("rx", 3)
      .style("cursor", "pointer")
      .on("click", () => {
        svg
          .transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity);
        zoomTransformRef.current = d3.zoomIdentity;
      });

    zoomControls
      .append("text")
      .attr("x", 12)
      .attr("y", 76)
      .attr("text-anchor", "middle")
      .attr("fill", "#555")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .text("⟲");

    svg.call(zoom as any);

    // Apply existing transform if available, otherwise use initial zoom
    if (zoomTransformRef.current !== d3.zoomIdentity) {
      svg.call(zoom.transform as any, zoomTransformRef.current);
    } else {
      // Initial zoom out to show more context
      const initialTransform = d3.zoomIdentity
        .scale(0.95)
        .translate(width * 0.025, height * 0.025);
      svg.call(zoom.transform as any, initialTransform);
      zoomTransformRef.current = initialTransform;
    }
  }, [data, topoData, selectedRegion]);

  // Get states for selected region
  const getRegionStates = (regionName: string): StateData[] => {
    if (!regionName || !regions[regionName as keyof typeof regions]) return [];

    const statesList = regions[regionName as keyof typeof regions];
    return data.filter((d) => statesList.includes(d.state_id));
  };

  return (
    <div className="relative flex flex-col bg-white p-4 rounded border border-gray-200">
      <div className="text-lg font-semibold mb-2 text-gray-800">US Regions</div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-full">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={chartSvgClass}
          />
        </div>
      </div>

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

export default RegionalMap;
