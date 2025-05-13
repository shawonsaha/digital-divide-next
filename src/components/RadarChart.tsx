"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { StateData } from "@/types";
import { formatValue } from "@/lib/utils";

interface RadarChartProps {
  width?: number;
  height?: number;
  statesData: StateData[];
  metrics: string[];
  onMetricSelect?: (metric: string) => void;
}

const RadarChart: React.FC<RadarChartProps> = ({
  width = 500,
  height = 500,
  statesData,
  metrics,
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
    if (!statesData.length || !metrics.length || !svgRef.current) return;

    // Setup
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 80, bottom: 50, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    // Create a group for the chart
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Prepare the data
    const normalizedData = statesData.map((state) => {
      const values = metrics.map((metric) => {
        let value = parseFloat(state[metric]);
        if (isNaN(value)) value = 0;

        // Scale down large values for visualization
        if (metric === "Median Household Income") {
          value = value / 1000;
        }
        return { metric, value };
      });
      return { state: state.State, values };
    });

    // Find max value for each metric across all states
    const maxValues: Record<string, number> = {};
    metrics.forEach((metric) => {
      const values = statesData.map((state) => {
        const value = parseFloat(state[metric]);
        return isNaN(value) ? 0 : value;
      });
      maxValues[metric] = Math.max(...values);
      // Scale down large values
      if (metric === "Median Household Income") {
        maxValues[metric] = maxValues[metric] / 1000;
      }
    });

    // Create scales
    const angleScale = d3
      .scalePoint()
      .domain(metrics)
      .range([0, 2 * Math.PI]);

    const radiusScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Draw background circles
    const ticks = [20, 40, 60, 80, 100];
    ticks.forEach((t) => {
      g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", radiusScale(t))
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "2,2");

      g.append("text")
        .attr("x", 0)
        .attr("y", -radiusScale(t) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .text(`${t}%`);
    });

    // Draw axes
    metrics.forEach((metric) => {
      const angle = angleScale(metric) || 0;
      const x = radius * Math.sin(angle);
      const y = -radius * Math.cos(angle);

      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "#999")
        .attr("stroke-width", 1);

      g.append("text")
        .attr("x", 1.1 * x)
        .attr("y", 1.1 * y)
        .attr("text-anchor", angle > Math.PI ? "end" : "start")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "10px")
        .text(metric.length > 15 ? metric.substring(0, 12) + "..." : metric)
        .on("mouseover", (event) => {
          if (metric.length > 15) {
            setTooltip({
              visible: true,
              x: event.pageX,
              y: event.pageY,
              content: <>{metric}</>,
            });
          }
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
        .on("click", () => {
          if (onMetricSelect) onMetricSelect(metric);
        })
        .style("cursor", onMetricSelect ? "pointer" : "default");
    });

    // Create a line generator
    const lineGenerator = d3
      .lineRadial<{ metric: string; value: number }>()
      .angle((d) => angleScale(d.metric) || 0)
      .radius((d) => {
        // Calculate percentage of max for this metric
        const maxVal = maxValues[d.metric] || 1;
        const percentage = (d.value / maxVal) * 100;
        return radiusScale(percentage);
      })
      .curve(d3.curveLinearClosed);

    // Draw a colored polygon for each state
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(statesData.map((d) => d.State))
      .range(d3.schemeCategory10);

    // Draw polygons
    normalizedData.forEach((state) => {
      g.append("path")
        .datum(state.values)
        .attr("d", lineGenerator as any)
        .attr("fill", colorScale(state.state))
        .attr("fill-opacity", 0.3)
        .attr("stroke", colorScale(state.state))
        .attr("stroke-width", 2)
        .on("mouseover", (event) => {
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: <strong>{state.state}</strong>,
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
    });

    // Draw legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - margin.right + 20}, ${margin.top})`
      );

    statesData.forEach((state, i) => {
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(state.State));

      legend
        .append("text")
        .attr("x", 25)
        .attr("y", i * 20 + 12)
        .text(state.State)
        .style("font-size", "12px");
    });

    // Add chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`Radar Chart: ${statesData.length} States`);
  }, [statesData, metrics, width, height, onMetricSelect]);

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

export default RadarChart;
