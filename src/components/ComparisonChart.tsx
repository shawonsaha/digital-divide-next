"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { StateData } from "@/types";
import { formatValue } from "@/lib/utils";

interface ComparisonChartProps {
  width?: number;
  height?: number;
  statesData: StateData[];
  currentMetric: string;
  onMetricSelect: (metric: string) => void;
  simpleMode?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  width = 960,
  height = 500,
  statesData,
  currentMetric,
  onMetricSelect,
  simpleMode = false,
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

  // Function to shorten metric names for display
  const shortenMetricName = (metricName: string): string => {
    if (metricName.length <= 20 || simpleMode) return metricName;

    const shortenedMap: Record<string, string> = {
      "% Households Without Computer": "% No Computer",
      "% Smartphone-Only Households": "% Smartphone-Only",
      "% Households with Broadband": "% With Broadband",
      "% Households Using Internet at Home": "% Use Internet at Home",
      "% Without High School Diploma": "% No HS Diploma",
      "% With Bachelor's or Higher": "% Bachelor's+",
      "% School-Age (5–17) No Internet": "% School-Age No Internet",
      "% School-Age (5–17) Not Enrolled": "% School-Age Not Enrolled",
      "Median Household Income": "Median HH Income",
      "% Below Poverty Line": "% Below Poverty",
      "Unemployment Rate (%)": "Unemployment %",
      "% With Public Assistance": "% Public Assistance",
    };

    return shortenedMap[metricName] || metricName.substring(0, 17) + "...";
  };

  const drawGroupedBarChart = () => {
    if (!statesData.length || !svgRef.current) return;

    // Extract metrics for display (either all or top 5 in simple mode)
    const allMetrics = Object.keys(statesData[0]).filter(
      (key) => !["Geo_ID", "State", "state_id"].includes(key)
    );

    const metricsToShow = simpleMode
      ? allMetrics.slice(0, 3) // Show only top 3 in simple mode
      : allMetrics.slice(0, 5); // Show top 5 in full mode

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = simpleMode
      ? { top: 30, right: 30, bottom: 50, left: 40 }
      : { top: 40, right: 120, bottom: 60, left: 60 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Set up scales
    const xScale = d3
      .scaleBand()
      .domain(metricsToShow)
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const stateScale = d3
      .scaleBand()
      .domain(statesData.map((d) => d.State))
      .range([0, xScale.bandwidth()])
      .padding(0.05);

    // Find max value for y scale
    const maxValue =
      d3.max(
        statesData.flatMap((state) =>
          metricsToShow.map((metric) => {
            // Special handling for income
            if (metric === "Median Household Income") {
              return parseFloat(state[metric]) / 1000; // Scale down income
            }
            return parseFloat(state[metric]);
          })
        )
      ) || 0;

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1]) // Add 10% padding
      .range([height - margin.bottom, margin.top]);

    // Color scale for states
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(statesData.map((d) => d.State))
      .range(d3.schemeCategory10);

    // Draw X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3.axisBottom(xScale).tickFormat((d) => shortenMetricName(d as string))
      )
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-25)")
      .style("font-size", simpleMode ? "8px" : "10px");

    // Draw Y axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .style("font-size", simpleMode ? "8px" : "10px");

    // Draw bars
    const bars = svg
      .append("g")
      .selectAll(".metric-group")
      .data(metricsToShow)
      .join("g")
      .attr("class", "metric-group")
      .attr("transform", (d) => `translate(${xScale(d)},0)`);

    bars
      .selectAll(".bar")
      .data((metric) =>
        statesData.map((state) => ({
          state: state.State,
          metric,
          value:
            metric === "Median Household Income"
              ? parseFloat(state[metric]) / 1000 // Scale down income
              : parseFloat(state[metric]),
          displayValue: state[metric],
          isIncome: metric === "Median Household Income",
        }))
      )
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => stateScale(d.state) || 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", stateScale.bandwidth())
      .attr("height", (d) => height - margin.bottom - yScale(d.value))
      .attr("fill", (d) => colorScale(d.state))
      .on("mouseover", (event, d) => {
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          content: (
            <>
              <strong>{d.state}</strong>
              <br />
              <strong>{d.metric}:</strong>{" "}
              {formatValue(d.displayValue, d.metric)}
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
        onMetricSelect(d.metric);
      });

    // Add legend if not in simple mode
    if (!simpleMode) {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr(
          "transform",
          `translate(${width - margin.right + 20},${margin.top})`
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
    }

    // Add chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", simpleMode ? 15 : 20)
      .attr("text-anchor", "middle")
      .style("font-size", simpleMode ? "12px" : "16px")
      .style("font-weight", "bold")
      .text(`Comparing ${statesData.length} States`);

    // Add Y axis label if not in simple mode
    if (!simpleMode) {
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Value");
    }
  };

  useEffect(() => {
    drawGroupedBarChart();
  }, [statesData, currentMetric, width, height, simpleMode]);

  if (!statesData.length) {
    return (
      <div
        className="flex items-center justify-center border border-gray-300 rounded bg-white text-gray-500"
        style={{ width, height }}
      >
        Select multiple states to compare
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

export default ComparisonChart;
