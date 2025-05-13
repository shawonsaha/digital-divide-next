import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as d3 from "d3";
import { StateData } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchCSVData(url: string): Promise<StateData[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const data = d3.csvParse(text) as unknown as StateData[];
    return data;
  } catch (error) {
    console.error("Error fetching CSV data:", error);
    return [];
  }
}

export async function fetchTopoJSONData(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("Error fetching TopoJSON data:", error);
    return null;
  }
}

export function getMetrics(data: StateData[]): string[] {
  if (!data.length) return [];
  
  const firstState = data[0];
  return Object.keys(firstState).filter(key => 
    !["Geo_ID", "State", "state_id"].includes(key)
  );
}

export function getStateColor(value: number, colorScale: d3.ScaleQuantize<string, never>): string {
  return colorScale(value) || "#ccc";
}

export function formatValue(value: string, metricName: string): string {
  if (metricName === "Median Household Income") {
    return `$${parseInt(value).toLocaleString()}`;
  }
  return value;
}

export const fipsToStateMap: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '12': 'FL', '13': 'GA',
  '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
  '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO',
  '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ',
  '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
  '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT',
  '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'
};

export const stateToFipsMap: Record<string, string> = 
  Object.entries(fipsToStateMap).reduce((acc, [fips, state]) => {
    acc[state] = fips;
    return acc;
  }, {} as Record<string, string>); 