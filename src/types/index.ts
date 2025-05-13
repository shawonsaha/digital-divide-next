export interface StateData {
  Geo_ID: string;
  State: string;
  state_id: string;
  "% Households Without Computer": string;
  "% Smartphone-Only Households": string;
  "% Households with Broadband": string;
  "% Households Using Internet at Home": string;
  "% Without High School Diploma": string;
  "% With Bachelor's or Higher": string;
  "% School-Age (5–17) No Internet": string;
  "% School-Age (5–17) Not Enrolled": string;
  "Median Household Income": string;
  "% Below Poverty Line": string;
  "Unemployment Rate (%)": string;
  "% With Public Assistance": string;
  [key: string]: string; // Allow for dynamic key access
}

export interface TopoJSONFeature {
  type: string;
  id: string;
  properties: {
    name: string;
  };
  geometry: {
    type: string;
    coordinates: any[];
  };
}

export interface SelectedState {
  id: string;
  data: StateData;
} 