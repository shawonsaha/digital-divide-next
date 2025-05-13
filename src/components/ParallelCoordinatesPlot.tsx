"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { StateData } from "@/types";
import { formatValue } from "@/lib/utils";

interface ParallelCoordinatesPlotProps {
  width?: number;
  height?: number;
  statesData: StateData[];
  availableMetrics: string[];
  selectedStates: string[];
}

const ParallelCoordinatesPlot: React.FC<ParallelCoordinatesPlotProps> = ({
  width = 960,
  height = 500,
  statesData,
  availableMetrics,
  selectedStates = [],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [draggedMetric, setDraggedMetric] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
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

  // Initialize selected metrics with first 5 metrics
  useEffect(() => {
    if (availableMetrics.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics(availableMetrics.slice(0, 5));
    }
  }, [availableMetrics, selectedMetrics.length]);

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  // Custom reordering of metrics
  const startDrag = (metric: string) => {
    setDraggedMetric(metric);
  };

  const onDrag = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragPosition(index);
  };

  const onDrop = (targetIndex: number) => {
    if (draggedMetric) {
      const sourceIndex = selectedMetrics.indexOf(draggedMetric);
      const newOrder = [...selectedMetrics];
      // Remove the dragged metric
      newOrder.splice(sourceIndex, 1);
      // Insert at the target position
      newOrder.splice(targetIndex, 0, draggedMetric);
      setSelectedMetrics(newOrder);
      setDraggedMetric(null);
      setDragPosition(null);
    }
  };

  useEffect(() => {
    if (!statesData.length || !selectedMetrics.length || !svgRef.current)
      return;

    // Setup
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create the main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process data
    const normalizedData = statesData.map((state) => {
      const values: Record<string, number> = {};
      selectedMetrics.forEach((metric) => {
        let value = parseFloat(state[metric]);
        if (isNaN(value)) value = 0;
        values[metric] = value;
      });
      return {
        state: state.State,
        values,
        originalData: state,
        isHighlighted: selectedStates.includes(state.State),
      };
    });

    // Create scales for each metric
    const metricScales: Record<string, d3.ScaleLinear<number, number>> = {};
    selectedMetrics.forEach((metric) => {
      const values = statesData.map((state) => {
        const val = parseFloat(state[metric]);
        return isNaN(val) ? 0 : val;
      });

      // Create domain with padding
      const min = d3.min(values) || 0;
      const max = d3.max(values) || 100;
      const padding = (max - min) * 0.05;

      metricScales[metric] = d3
        .scaleLinear()
        .domain([min - padding, max + padding])
        .range([chartHeight, 0]);
    });

    // Create axes
    const xScale = d3
      .scalePoint()
      .domain(selectedMetrics)
      .range([0, chartWidth])
      .padding(0.1);

    // Draw axes
    selectedMetrics.forEach((metric) => {
      const x = xScale(metric) || 0;

      // Draw axis line
      g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${x},0)`)
        .call(d3.axisLeft(metricScales[metric]).ticks(5))
        .call((g) => g.select(".domain").remove())
        .call((g) => {
          g.selectAll("text").attr("transform", "translate(10,0)");
        });

      // Add metric name
      g.append("text")
        .attr("x", x)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
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
        });

      // Add brush for this axis
      const brush = d3
        .brushY()
        .extent([
          [x - 10, 0],
          [x + 10, chartHeight],
        ])
        .on("end", (event) => {
          if (!event.selection) return;
          const [y0, y1] = event.selection as [number, number];
          const range = [
            metricScales[metric].invert(y1),
            metricScales[metric].invert(y0),
          ];
          console.log(`Brushed ${metric}: ${range[0]} to ${range[1]}`);
          // Here you could filter data based on the brush
        });

      g.append("g").attr("class", "brush").call(brush);
    });

    // Draw lines
    const lineGenerator = d3
      .line<{ metric: string; value: number }>()
      .x((d) => xScale(d.metric) || 0)
      .y((d) => metricScales[d.metric](d.value))
      .curve(d3.curveMonotoneX);

    // Color scale for states
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(statesData.map((d) => d.State))
      .range(d3.schemeCategory10);

    // Draw lines for each state
    normalizedData.forEach((state) => {
      // Convert to array of {metric, value} for line generator
      const lineData = selectedMetrics.map((metric) => ({
        metric,
        value: state.values[metric],
      }));

      g.append("path")
        .datum(lineData)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", colorScale(state.state))
        .attr("stroke-width", state.isHighlighted ? 3 : 1.5)
        .attr(
          "opacity",
          state.isHighlighted || selectedStates.length === 0 ? 1 : 0.3
        )
        .on("mouseover", (event) => {
          setTooltip({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            content: (
              <>
                <strong>{state.state}</strong>
                <br />
                {selectedMetrics.map((metric) => (
                  <div key={metric}>
                    {metric.length > 20
                      ? metric.substring(0, 17) + "..."
                      : metric}
                    : {formatValue(state.originalData[metric], metric)}
                  </div>
                ))}
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
    });

    // Draw legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - margin.right - 100}, ${margin.top})`
      );

    if (selectedStates.length > 0) {
      const highlightedStates = normalizedData.filter((s) => s.isHighlighted);

      highlightedStates.forEach((state, i) => {
        legend
          .append("rect")
          .attr("x", 0)
          .attr("y", i * 20)
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", colorScale(state.state));

        legend
          .append("text")
          .attr("x", 25)
          .attr("y", i * 20 + 12)
          .text(state.state)
          .style("font-size", "12px");
      });
    }

    // Add chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Parallel Coordinates Plot");
  }, [statesData, selectedMetrics, width, height, selectedStates]);

  return (
    <div className="relative">
      <div className="mb-4">
        <div className="font-medium mb-2">Select and Reorder Metrics</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedMetrics.map((metric, index) => (
            <div
              key={metric}
              draggable
              onDragStart={() => startDrag(metric)}
              onDragOver={(e) => onDrag(e, index)}
              onDrop={() => onDrop(index)}
              className={`
                px-2 py-1 bg-blue-100 border border-blue-300 rounded cursor-move
                ${dragPosition === index ? "border-dashed border-blue-500" : ""}
              `}
            >
              {metric.length > 15 ? metric.substring(0, 12) + "..." : metric}
              <button
                className="ml-2 text-red-500"
                onClick={() => toggleMetric(metric)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="font-medium mb-2">Available Metrics</div>
        <div className="flex flex-wrap gap-2">
          {availableMetrics
            .filter((m) => !selectedMetrics.includes(m))
            .map((metric) => (
              <div
                key={metric}
                className="px-2 py-1 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200"
                onClick={() => toggleMetric(metric)}
              >
                {metric.length > 15 ? metric.substring(0, 12) + "..." : metric}
              </div>
            ))}
        </div>
      </div>

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

export default ParallelCoordinatesPlot;
