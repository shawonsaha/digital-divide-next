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
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
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
        <div className="lg:w-1/2">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={chartSvgClass}
          />
        </div>

        <div className="lg:w-1/2">
          {selectedRegion ? (
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-800">
                {selectedRegion} Region
              </h3>
              <RadarChart
                statesData={getRegionStates(selectedRegion)}
                metrics={selectedMetrics}
                width={width / 2}
                height={height}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full border border-gray-300 rounded bg-white text-gray-500 p-4">
              Select a region on the map to view regional data
            </div>
          )}
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
