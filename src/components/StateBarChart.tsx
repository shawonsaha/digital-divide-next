"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { StateData } from "@/types";
import { formatValue } from "@/lib/utils";

interface StateBarChartProps {
  width?: number;
  height?: number;
  stateData: StateData | null;
  currentMetric: string;
  onMetricSelect: (metric: string) => void;
}

const StateBarChart: React.FC<StateBarChartProps> = ({
  width = 480,
  height = 570,
  stateData,
  currentMetric,
  onMetricSelect,
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

  useEffect(() => {
    if (!stateData || !svgRef.current) {
      return;
    }

    // Extract metrics from state data
    const metrics = Object.keys(stateData).filter(
      (key) => !["Geo_ID", "State", "state_id"].includes(key)
    );

    // Create SVG and margins
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    const margin = {
      top: 60,
      right: 60,
      bottom: 40,
      left: 180,
    };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Data for ${stateData.State}`);

    // Create normalized metrics for display
    const chartMetrics = metrics.map((m) => {
      const value = parseFloat(stateData[m]);
      let normalizedValue = value;

      // If this is Median Household Income, scale it down
      if (m === "Median Household Income") {
        normalizedValue = value / 1000; // Scale down by 1000
      }

      return {
        name: m,
        value: isNaN(value) ? 0 : value,
        normalizedValue: isNaN(normalizedValue) ? 0 : normalizedValue,
        displayValue: stateData[m],
        isIncome: m === "Median Household Income",
      };
    });

    // Create a secondary array for scaled values
    const normalizedMetrics = chartMetrics.map((d) => ({
      ...d,
      chartValue: d.isIncome ? d.normalizedValue : d.value,
    }));

    // Set up scales
    const maxValue = d3.max(normalizedMetrics, (d) => d.chartValue) || 0;
    const xScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1]) // Add 10% padding
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(metrics)
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    // Add X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("transform", "rotate(-35)")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("font-size", "10px");

    // Add Y axis
    const yAxis = svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "11px")
      .text((d: any) => {
        // Shorten long labels
        const text = d as string;
        if (text.length > 20) {
          return text.substring(0, 17) + "...";
        }
        return text;
      });

    // Add bars
    svg
      .selectAll(".bar")
      .data(normalizedMetrics)
      .join("rect")
      .attr("class", "bar")
      .attr("x", margin.left)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("width", (d) => xScale(d.chartValue) - margin.left)
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => (d.name === currentMetric ? "orange" : "steelblue"))
      .on("mouseover", (event, d) => {
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: (
            <>
              <strong>{d.name}:</strong> {formatValue(d.displayValue, d.name)}
              {d.isIncome && (
                <div className="text-xs italic">
                  (scaled in chart for comparison)
                </div>
              )}
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
        onMetricSelect(d.name);
      });

    // Add value labels if there's enough space
    if (yScale.bandwidth() > 15) {
      svg
        .selectAll(".value-label")
        .data(normalizedMetrics)
        .join("text")
        .attr("class", "value-label")
        .attr("x", (d) => xScale(d.chartValue) + 5)
        .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 4)
        .text((d) => formatValue(d.displayValue, d.name))
        .attr("font-size", "9px")
        .attr("fill", "black");
    }

    // Add a note about scaling income
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-style", "italic")
      .text("Note: Median Household Income is scaled down for comparison");
  }, [stateData, currentMetric, width, height, onMetricSelect]);

  if (!stateData) {
    return (
      <div
        className="flex items-center justify-center border border-gray-300 rounded bg-white text-gray-500"
        style={{ width, height }}
      >
        Select a state to view its metrics
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-300 bg-white"
      />

      {tooltip.visible && (
        <div
          className="absolute bg-white border border-gray-300 rounded p-2 shadow-md text-sm pointer-events-none z-10"
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

export default StateBarChart;
