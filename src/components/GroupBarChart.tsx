"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { StateData } from "@/types";
import { formatValue } from "@/lib/utils";
import {
  chartColors,
  chartContainerClass,
  chartSvgClass,
} from "@/lib/chartStyles";

interface GroupBarChartProps {
  width?: number;
  height?: number;
  statesData: StateData[];
  metric: string;
  onStateSelect?: (stateId: string, stateData: StateData) => void;
}

const GroupBarChart: React.FC<GroupBarChartProps> = ({
  width = 960,
  height = 500,
  statesData,
  metric,
  onStateSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  useEffect(() => {
    if (!statesData.length || !metric || !svgRef.current) return;

    // Setup
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set explicit background color
    svg.attr("style", "background-color: white;");

    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Sort data
    const sortedData = [...statesData].sort((a, b) => {
      const aValue = parseFloat(a[metric]);
      const bValue = parseFloat(b[metric]);

      if (isNaN(aValue) && isNaN(bValue)) return 0;
      if (isNaN(aValue)) return sortOrder === "asc" ? -1 : 1;
      if (isNaN(bValue)) return sortOrder === "asc" ? 1 : -1;

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(sortedData.map((d) => d.State))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const values = sortedData.map((d) => {
      const value = parseFloat(d[metric]);
      return isNaN(value) ? 0 : value;
    });

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(values) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Draw X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "10px")
      .attr("fill", chartColors.text);

    // Draw Y axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(10))
      .selectAll("text")
      .style("font-size", "10px")
      .attr("fill", chartColors.text);

    // Add Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", margin.left / 3)
      .attr("x", -(height / 2))
      .attr("text-anchor", "middle")
      .attr("fill", chartColors.text)
      .text(metric);

    // Add bars
    svg
      .selectAll(".bar")
      .data(sortedData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.State) || 0)
      .attr("y", (d) => {
        const value = parseFloat(d[metric]);
        return isNaN(value) ? height - margin.bottom : yScale(value);
      })
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => {
        const value = parseFloat(d[metric]);
        return isNaN(value) ? 0 : height - margin.bottom - yScale(value);
      })
      .attr("fill", chartColors.bars)
      .on("mouseover", (event, d) => {
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: (
            <>
              <strong>{d.State}</strong>
              <br />
              <strong>{metric}:</strong> {formatValue(d[metric], metric)}
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
        if (onStateSelect) {
          onStateSelect(d.state_id, d);
        }
      })
      .style("cursor", onStateSelect ? "pointer" : "default");

    // Add chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", chartColors.text)
      .text(`${metric} by State`);
  }, [statesData, metric, width, height, sortOrder, onStateSelect]);

  if (!statesData.length) {
    return (
      <div
        className="flex items-center justify-center border border-gray-300 rounded bg-white text-gray-500"
        style={{ width, height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex mb-4">
        <button
          onClick={toggleSortOrder}
          className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sort {sortOrder === "asc" ? "↑" : "↓"}
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

export default GroupBarChart;
