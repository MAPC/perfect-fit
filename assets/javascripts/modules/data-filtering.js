/**
 * Data filtering functionality for parking site map
 */

import { getGlobalState, updateGlobalState } from './core-utils.js';

/**
 * Filter data by selected phases
 */
export function filterPhaseData(data) {
  const state = getGlobalState();
  const filteredData = data[1].filter(site => {
    const phaseSplit = site.phase.split(" ");
    for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
      const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
      if (!Number.isNaN(phaseParse) && state.phases.includes(phaseSplit[phaseInd])) {
        return true;
      }
    }
    return false;
  });

  // Update global phaseData
  updateGlobalState({ ...state, phaseData: filteredData });
  return filteredData;
}

/**
 * Filter data by selected municipality
 */
export function filterMunicipalityData(data) {
  const state = getGlobalState();
  if (state.selectedMunicipality === 'all') {
    return data;
  }
  return data.filter(site => site.muni === state.selectedMunicipality);
}

/**
 * Populate municipality dropdown
 */
export function populateMunicipalityDropdown(data, selector = '#municipality-select') {
  const municipalities = [...new Set(data.map(site => site.muni))].sort();
  const select = d3.select(selector);
  
  // Clear existing options except "All Municipalities"
  select.selectAll('option:not([value="all"])').remove();
  
  // Add municipality options
  select.selectAll('option.municipality-option')
    .data(municipalities)
    .enter()
    .append('option')
    .attr('class', 'municipality-option')
    .attr('value', d => d)
    .text(d => d);
}

/**
 * Create municipality filter functionality
 */
export function createMunicipalityFilter(selector = '#municipality-select', refreshCallback) {
  const select = d3.select(selector);
  select.on('change', function() {
    const state = getGlobalState();
    updateGlobalState({ ...state, selectedMunicipality: this.value });
    
    // Highlight the selected municipality on the map
    highlightMunicipality(this.value);
    
    // If a specific municipality is selected, turn on all phases
    if (this.value !== 'all') {
      updateGlobalState({ 
        ...state, 
        phases: ["1", "2", "3", "4", "5"],
        selectedMunicipality: this.value
      });
      
      const newState = getGlobalState();
      
      // Update phase button visual states
      d3.select('.bp1').classed('toggled__p1', true);
      d3.select('.bp2').classed('toggled__p2', true);
      d3.select('.bp3').classed('toggled__p3', true);
      d3.select('.bp4').classed('toggled__p4', true);
      d3.select('.bp5').classed('toggled__p5', true);
      
      // Re-filter phase data with all phases active
      const newPhaseData = filterPhaseData(newState.allData);
    }
    
    const currentState = getGlobalState();
    const filteredData = filterMunicipalityData(currentState.phaseData);
    
    // Reset brush state to full width
    updateGlobalState({ 
      ...currentState, 
      brushState: [0.0, 2.0],
      pastMax: false,
      pastMin: false
    });
    
    // Call refresh callback
    if (refreshCallback) {
      refreshCallback(filteredData);
    }
  });
}

/**
 * Highlight municipality (placeholder - should be imported from map-visualization)
 */
function highlightMunicipality(municipalityName) {
  // This should be imported from map-visualization module
  console.log('Highlighting municipality:', municipalityName);
}
