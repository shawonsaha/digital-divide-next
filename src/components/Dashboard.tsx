"use client";

import React, { useEffect, useState } from "react";
import ChoroplethMap from "./ChoroplethMap";
import StateBarChart from "./StateBarChart";
import ComparisonChart from "./ComparisonChart";
import GroupBarChart from "./GroupBarChart";
import RadarChart from "./RadarChart";
import ParallelCoordinatesPlot from "./ParallelCoordinatesPlot";
import RegionalMap from "./RegionalMap";
import { StateData, SelectedState } from "@/types";
import { fetchCSVData, fetchTopoJSONData, getMetrics } from "@/lib/utils";

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

const Dashboard: React.FC = () => {
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [topoData, setTopoData] = useState<any>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedStates, setSelectedStates] = useState<SelectedState[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [multipleSelectionMode, setMultipleSelectionMode] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<
    "default" | "advanced"
  >("default");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Fetch the CSV data
        const csvData = await fetchCSVData("/data/D_T_with_state_id.csv");
        setStateData(csvData);

        // Fetch the TopoJSON data
        const topo = await fetchTopoJSONData("/data/states-albers-10m.json");
        setTopoData(topo);

        // Extract metrics from the data
        const metricsList = getMetrics(csvData);
        setMetrics(metricsList);

        // Set the default selected metric
        if (metricsList.length > 0) {
          setSelectedMetric(metricsList[0]);
          setSelectedMetrics(metricsList.slice(0, 5)); // First 5 metrics for radar chart
        }

        setIsLoading(false);
      } catch (err) {
        setError("Failed to load data. Please try again later.");
        setIsLoading(false);
        console.error("Error loading data:", err);
      }
    };

    loadData();
  }, []);

  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(e.target.value);
  };

  const handleStateSelect = (stateId: string, stateData: StateData) => {
    if (multipleSelectionMode) {
      // Check if the state is already selected
      const stateIndex = selectedStates.findIndex((s) => s.id === stateId);

      if (stateIndex >= 0) {
        // Remove the state if it's already selected
        setSelectedStates(selectedStates.filter((s) => s.id !== stateId));
      } else {
        // Add the state to the selected states
        setSelectedStates([
          ...selectedStates,
          { id: stateId, data: stateData },
        ]);
      }
    } else {
      // Single selection mode - replace the selected state
      setSelectedStates([{ id: stateId, data: stateData }]);
    }
  };

  const toggleSelectionMode = () => {
    setMultipleSelectionMode(!multipleSelectionMode);
  };

  const clearSelection = () => {
    setSelectedStates([]);
    setSelectedRegion(null);
  };

  const handleMetricSelect = (metric: string) => {
    setSelectedMetric(metric);
  };

  const handleMultipleMetricsChange = (metrics: string[]) => {
    setSelectedMetrics(metrics);
  };

  const handleRegionSelect = (region: string, states: StateData[]) => {
    setSelectedRegion(region);

    // Create selected states from region
    const selectedRegionStates = states.map((state) => ({
      id: state.state_id,
      data: state,
    }));

    setSelectedStates(selectedRegionStates);
  };

  const toggleVisualizationMode = () => {
    setVisualizationMode(
      visualizationMode === "default" ? "advanced" : "default"
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white text-black">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Digital Divide Dashboard
      </h1>

      <div className="flex justify-between mb-6">
        <div className="w-full md:w-1/2">
          <label
            htmlFor="metric"
            className="block font-medium mb-2 text-gray-700"
          >
            Select Primary Metric:
          </label>
          <select
            id="metric"
            value={selectedMetric}
            onChange={handleMetricChange}
            className="w-full p-2 border border-gray-300 rounded bg-white text-gray-800"
          >
            {metrics.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={toggleVisualizationMode}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ml-4"
          >
            {visualizationMode === "default"
              ? "Advanced View"
              : "Standard View"}
          </button>
        </div>
      </div>

      {/* Standard visualization mode */}
      {visualizationMode === "default" && (
        <>
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex-1">
              {topoData && (
                <ChoroplethMap
                  data={stateData}
                  topoData={topoData}
                  selectedMetric={selectedMetric}
                  onStateSelect={handleStateSelect}
                  selectedStates={selectedStates}
                  multipleSelectionMode={multipleSelectionMode}
                  toggleSelectionMode={toggleSelectionMode}
                  clearSelection={clearSelection}
                  width={600}
                  height={400}
                />
              )}
            </div>

            <div className="flex-1">
              {selectedStates.length === 0 && (
                <div className="flex items-center justify-center h-full border border-gray-300 rounded bg-white text-gray-500 p-4">
                  Select a state on the map to view details
                </div>
              )}

              {selectedStates.length === 1 && (
                <StateBarChart
                  stateData={selectedStates[0].data}
                  currentMetric={selectedMetric}
                  onMetricSelect={handleMetricSelect}
                  width={480}
                  height={400}
                />
              )}

              {selectedStates.length > 1 && (
                <ComparisonChart
                  statesData={selectedStates.map((s) => s.data)}
                  currentMetric={selectedMetric}
                  onMetricSelect={handleMetricSelect}
                  width={480}
                  height={400}
                  simpleMode={true}
                />
              )}
            </div>
          </div>

          {selectedStates.length > 1 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Detailed Comparison</h2>
              <ComparisonChart
                statesData={selectedStates.map((s) => s.data)}
                currentMetric={selectedMetric}
                onMetricSelect={handleMetricSelect}
                width={960}
                height={500}
              />
            </div>
          )}
        </>
      )}

      {/* Advanced visualization mode */}
      {visualizationMode === "advanced" && (
        <div className="space-y-12">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Interactive Choropleth & Bar Charts
            </h2>
            <div className="flex justify-end mb-4">
              <div
                className="inline-flex items-center rounded-md shadow-sm"
                role="group"
              >
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    !selectedRegion
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } border border-gray-300 rounded-l-lg`}
                  onClick={() => {
                    setSelectedRegion(null);
                    clearSelection();
                  }}
                >
                  State View
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    selectedRegion
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } border border-l-0 border-gray-300 rounded-r-lg`}
                  onClick={() => {
                    // If no region is selected yet, default to Northeast
                    if (!selectedRegion) {
                      const regionName = "Northeast";
                      const regionStates = stateData.filter((d) =>
                        regions.Northeast.includes(d.state_id)
                      );
                      handleRegionSelect(regionName, regionStates);
                    }
                  }}
                >
                  Region View
                </button>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/2">
                {topoData && !selectedRegion && (
                  <ChoroplethMap
                    data={stateData}
                    topoData={topoData}
                    selectedMetric={selectedMetric}
                    onStateSelect={handleStateSelect}
                    selectedStates={selectedStates}
                    multipleSelectionMode={multipleSelectionMode}
                    toggleSelectionMode={toggleSelectionMode}
                    clearSelection={clearSelection}
                    width={600}
                    height={400}
                  />
                )}
                {topoData && selectedRegion && (
                  <RegionalMap
                    data={stateData}
                    topoData={topoData}
                    selectedMetrics={selectedMetrics}
                    onRegionSelect={handleRegionSelect}
                    selectedRegion={selectedRegion}
                    width={600}
                    height={400}
                  />
                )}
              </div>
              <div className="lg:w-1/2">
                {!selectedRegion && (
                  <>
                    {selectedStates.length === 0 ? (
                      <GroupBarChart
                        statesData={stateData.slice(0, 10)} // Show top 10 states
                        metric={selectedMetric}
                        onStateSelect={handleStateSelect}
                        width={600}
                        height={400}
                      />
                    ) : (
                      <GroupBarChart
                        statesData={selectedStates.map((s) => s.data)}
                        metric={selectedMetric}
                        onStateSelect={handleStateSelect}
                        width={600}
                        height={400}
                      />
                    )}
                  </>
                )}
                {selectedRegion && (
                  <RadarChart
                    statesData={selectedStates.map((s) => s.data)}
                    metrics={selectedMetrics}
                    onMetricSelect={handleMetricSelect}
                    width={600}
                    height={400}
                  />
                )}
                {selectedRegion && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2 text-gray-800">
                      Selected Metrics
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {metrics.map((metric) => (
                        <div
                          key={metric}
                          className={`
                            px-2 py-1 border rounded cursor-pointer
                            ${
                              selectedMetrics.includes(metric)
                                ? "bg-blue-100 border-blue-300 text-blue-800"
                                : "bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                            }
                          `}
                          onClick={() => {
                            const newSelectedMetrics = selectedMetrics.includes(
                              metric
                            )
                              ? selectedMetrics.filter((m) => m !== metric)
                              : [...selectedMetrics, metric];
                            setSelectedMetrics(newSelectedMetrics);
                          }}
                        >
                          {metric.length > 15
                            ? metric.substring(0, 12) + "..."
                            : metric}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Multi-State Comparison
            </h2>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={toggleSelectionMode}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4"
                >
                  {multipleSelectionMode
                    ? "Selection Mode: ON"
                    : "Selection Mode: OFF"}
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear Selection
                </button>
              </div>

              {selectedStates.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-6">
                  <RadarChart
                    statesData={selectedStates.map((s) => s.data)}
                    metrics={selectedMetrics}
                    onMetricSelect={handleMetricSelect}
                    width={600}
                    height={500}
                  />
                  <div className="lg:w-1/2">
                    <h3 className="text-lg font-medium mb-2 text-gray-800">
                      Selected Metrics
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {metrics.map((metric) => (
                        <div
                          key={metric}
                          className={`
                            px-2 py-1 border rounded cursor-pointer
                            ${
                              selectedMetrics.includes(metric)
                                ? "bg-blue-100 border-blue-300 text-blue-800"
                                : "bg-gray-100 border-gray-300 hover:bg-gray-200 text-gray-800"
                            }
                          `}
                          onClick={() => {
                            const newSelectedMetrics = selectedMetrics.includes(
                              metric
                            )
                              ? selectedMetrics.filter((m) => m !== metric)
                              : [...selectedMetrics, metric];
                            setSelectedMetrics(newSelectedMetrics);
                          }}
                        >
                          {metric.length > 15
                            ? metric.substring(0, 12) + "..."
                            : metric}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 border border-gray-300 rounded bg-white text-gray-500">
                  Select states on the map to compare
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Parallel Coordinates Analysis
            </h2>
            <ParallelCoordinatesPlot
              statesData={stateData}
              availableMetrics={metrics}
              selectedStates={selectedStates.map((s) => s.data.State)}
              width={1200}
              height={500}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
