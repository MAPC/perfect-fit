/**
 * Core utilities and configuration for parking site map
 */

// D3.js projection configuration
export const projection = d3.geoAlbers()
  .scale(85000)
  .rotate([71.057, 0])
  .center([-0.021, 42.38])
  .translate([960 / 2, 700 / 2]);

// Global state variables
export let brushState = [0.0, 2.0];
export let pastMax = false;
export let pastMin = false;
export let currentSortState = 'ascending';
export let selectedMunicipality = 'all';
export let allData = null;
export let surveyedMunicipalities = null;
export let phases = ["1", "2", "3", "4", "5"];
export let phaseData = null;

/**
 * Sort text strings (case insensitive)
 */
export function sortText(a, b) {
  const upA = a.toUpperCase();
  const upB = b.toUpperCase();
  return (upA < upB) ? -1 : (upA > upB) ? 1 : 0;
}

/**
 * Convert string to camelCase
 */
export function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return "";
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

/**
 * Update global state variables
 */
export function updateGlobalState(newState) {
  if (newState.brushState) brushState = newState.brushState;
  if (newState.pastMax !== undefined) pastMax = newState.pastMax;
  if (newState.pastMin !== undefined) pastMin = newState.pastMin;
  if (newState.currentSortState) currentSortState = newState.currentSortState;
  if (newState.selectedMunicipality) selectedMunicipality = newState.selectedMunicipality;
  if (newState.allData) allData = newState.allData;
  if (newState.surveyedMunicipalities) surveyedMunicipalities = newState.surveyedMunicipalities;
  if (newState.phases) phases = newState.phases;
  if (newState.phaseData) phaseData = newState.phaseData;
}

/**
 * Get current global state
 */
export function getGlobalState() {
  return {
    brushState,
    pastMax,
    pastMin,
    currentSortState,
    selectedMunicipality,
    allData,
    surveyedMunicipalities,
    phases,
    phaseData
  };
}
