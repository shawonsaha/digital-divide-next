"use client";

import React, { useEffect, useState } from "react";
import ChoroplethMap from "./ChoroplethMap";
import StateBarChart from "./StateBarChart";
import ComparisonChart from "./ComparisonChart";
import { StateData, SelectedState } from "@/types";
import { fetchCSVData, fetchTopoJSONData, getMetrics } from "@/lib/utils";

const Dashboard: React.FC = () => {
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [topoData, setTopoData] = useState<any>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [selectedStates, setSelectedStates] = useState<SelectedState[]>([]);
  const [multipleSelectionMode, setMultipleSelectionMode] = useState(false);
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
  };

  const handleMetricSelect = (metric: string) => {
    setSelectedMetric(metric);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Digital Divide Dashboard
      </h1>

      <div className="mb-6">
        <label htmlFor="metric" className="block font-medium mb-2">
          Select Metric:
        </label>
        <select
          id="metric"
          value={selectedMetric}
          onChange={handleMetricChange}
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded"
        >
          {metrics.map((metric) => (
            <option key={metric} value={metric}>
              {metric}
            </option>
          ))}
        </select>
      </div>

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
    </div>
  );
};

export default Dashboard;
