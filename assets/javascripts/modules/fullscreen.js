/**
 * Full screen mode functionality for parking site map
 */

import { projection, getGlobalState, updateGlobalState } from './core-utils.js';
import { createTownMap, createJobMap, createTrainMap, createRapidTransitMap, populateMap, highlightMunicipality } from './map-visualization.js';
import { createTable, toggleSelected } from './table.js';
import { createSlider } from './slider.js';
import { filterPhaseData, filterMunicipalityData } from './data-filtering.js';

/**
 * Initialize full screen visualization with default state
 */
export function initializeFullScreenVisualization() {
  // Clear any existing content in the full screen popup
  d3.select('#fullscreen-popup .parking-map').selectAll('*').remove();
  d3.select('#fullscreen-popup .parking-table').selectAll('*').remove();
  d3.select('#fullscreen-popup .slider').selectAll('*').remove();
  
  // Reset all options to default state for full screen
  const state = getGlobalState();
  updateGlobalState({
    ...state,
    selectedMunicipality: 'all',
    phases: ["1", "2", "3", "4", "5"],
    brushState: [0.0, 2.0],
    pastMax: false,
    pastMin: false
  });
  
  // Get fresh filtered data with all phases and all municipalities
  const currentState = getGlobalState();
  const currentPhaseData = filterPhaseData(currentState.allData);
  const currentFilteredData = filterMunicipalityData(currentPhaseData);
  
  // Initialize the full screen visualization with fresh data
  if (currentState.allData && currentFilteredData && currentState.surveyedMunicipalities) {
    // Create town map for full screen
    const filteredMunicipalities = currentState.allData[0].features.filter(municipality => 
      currentState.surveyedMunicipalities.includes(municipality.properties.muni_name.toUpperCase())
    );
    createTownMap(filteredMunicipalities, '#fullscreen-popup .parking-map');
    
    // Create job map for full screen
    const topology = topojson.feature(currentState.allData[4], currentState.allData[4].objects['UMN_8cats_ICC_Simp_noLynn']);
    createJobMap(topology.features, '#fullscreen-popup .parking-map');
    
    // Create train and rapid transit maps for full screen
    createTrainMap(currentState.allData[2], '#fullscreen-popup .parking-map');
    createRapidTransitMap(currentState.allData[3], '#fullscreen-popup .parking-map');
    
    // Populate map with sites
    populateMap(currentFilteredData, '#fullscreen-popup .parking-map', (d) => toggleSelected(d, true));
    
    // Create table
    createTable(currentFilteredData, '#fullscreen-popup .parking-table');
    
    // Create slider
    createSlider(currentFilteredData, '#fullscreen-popup', true);
    
    // Populate municipality dropdown for full screen
    populateMunicipalityDropdownForFullScreen(currentPhaseData);
    
    // Set up full screen controls
    setupFullScreenControls();
    
    // Reset municipality dropdown to "all"
    d3.select('#municipality-select-fullscreen').property('value', 'all');
    
    // Reset all phase buttons to active state (matching normal mode logic)
    d3.select('#fullscreen-popup .bp1').classed('toggled__p1', true); // Phase 1 & 2 combined
    d3.select('#fullscreen-popup .bp3').classed('toggled__p3', true);
    d3.select('#fullscreen-popup .bp4').classed('toggled__p4', true);
    d3.select('#fullscreen-popup .bp5').classed('toggled__p5', true);
    
    // Reset transit and jobs buttons to default state (closed/hidden)
    d3.select('#fullscreen-popup .toggle__transit').text('Show Public Transit');
    d3.select('#fullscreen-popup .toggle__jobs').text('Show Jobs Heatmap');
    
    // Hide legend by default
    d3.select('#fullscreen-popup .parking-data__legend').classed('parking-data__legend--hidden', true);
    
    // Apply default municipality highlighting (none)
    highlightMunicipality('all', '#fullscreen-popup .parking-map');
  }
}


/**
 * Populate municipality dropdown for full screen
 */
function populateMunicipalityDropdownForFullScreen(data) {
  const municipalities = [...new Set(data.map(site => site.muni))].sort();
  const select = d3.select('#municipality-select-fullscreen');
  
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
 * Setup full screen controls
 */
function setupFullScreenControls() {
  // Set up jobs toggle for full screen
  d3.select('#fullscreen-popup .toggle__jobs').on('click', (d) => {
    const jobsElement = d3.select('#fullscreen-popup .parking-map__jobs');
    const legendElement = d3.select('#fullscreen-popup .parking-data__legend');
    const buttonElement = d3.select('#fullscreen-popup .toggle__jobs');
    
    if (jobsElement.classed('parking-map__jobs--hidden')) {
      jobsElement.classed('parking-map__jobs--hidden', false);
      legendElement.classed('parking-data__legend--hidden', false);
      buttonElement.text('Hide Jobs Heatmap');
    } else {
      jobsElement.classed('parking-map__jobs--hidden', true);
      legendElement.classed('parking-data__legend--hidden', true);
      buttonElement.text('Show Jobs Heatmap');
    }
  });

  // Set up municipality filter for full screen
  d3.select('#municipality-select-fullscreen').on('change', function() {
    const state = getGlobalState();
    
    // Highlight the selected municipality on the fullscreen map (don't affect global state)
    highlightMunicipality(this.value, '#fullscreen-popup .parking-map');
    
    // Update phase button visual states (always show all phases as selected)
    d3.select('#fullscreen-popup .bp1').classed('toggled__p1', true);
    d3.select('#fullscreen-popup .bp3').classed('toggled__p3', true);
    d3.select('#fullscreen-popup .bp4').classed('toggled__p4', true);
    d3.select('#fullscreen-popup .bp5').classed('toggled__p5', true);
    
    // Filter data locally for fullscreen (don't affect global state)
    const allPhases = ["1", "2", "3", "4", "5"];
    const selectedMunicipality = this.value;
    
    // Filter by phases (all phases active)
    const phaseFilteredData = state.allData[1].filter(site => {
      const phaseSplit = site.phase.split(" ");
      for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
        const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
        if (!Number.isNaN(phaseParse) && allPhases.includes(phaseSplit[phaseInd])) {
          return true;
        }
      }
      return false;
    });
    
    // Filter by municipality
    const filteredData = selectedMunicipality === 'all' 
      ? phaseFilteredData 
      : phaseFilteredData.filter(site => site.muni === selectedMunicipality);
    
    refreshFullScreenVisualization(filteredData);
  });

  // Set up phase buttons and transit button for full screen
  setupFullScreenPhaseButtons();
}

/**
 * Setup full screen phase buttons
 */
function setupFullScreenPhaseButtons() {
  const state = getGlobalState();
  
  // Set up transit toggle for full screen
  d3.select('#fullscreen-popup .toggle__transit').on('click', (d) => {
    const trainLinesElement = d3.select('#fullscreen-popup .parking-map__train-lines');
    const rapidTransitElement = d3.select('#fullscreen-popup .parking-map__rapid-transit-lines');
    const buttonElement = d3.select('#fullscreen-popup .toggle__transit');
    
    if (trainLinesElement.classed('parking-map__train-lines--hidden')) {
      trainLinesElement.classed('parking-map__train-lines--hidden', false);
      rapidTransitElement.classed('parking-map__rapid-transit-lines--hidden', false);
      buttonElement.text('Hide Public Transit');
    } else {
      trainLinesElement.classed('parking-map__train-lines--hidden', true);
      rapidTransitElement.classed('parking-map__rapid-transit-lines--hidden', true);
      buttonElement.text('Show Public Transit');
    }
  });

  // Phase 1 & 2 button (local fullscreen state only)
  d3.select('#fullscreen-popup .bp1').on('click', (d) => {
    const state = getGlobalState();
    const currentMunicipality = d3.select('#municipality-select-fullscreen').property('value');
    
    // Toggle phases locally for fullscreen (don't affect global state)
    const isActive = d3.select('#fullscreen-popup .bp1').classed('toggled__p1');
    const phases = isActive ? ["3", "4", "5"] : ["1", "2", "3", "4", "5"];
    
    // Update button visual state
    d3.select('#fullscreen-popup .bp1').classed('toggled__p1', !isActive);
    
    // Filter data locally for fullscreen
    const phaseFilteredData = state.allData[1].filter(site => {
      const phaseSplit = site.phase.split(" ");
      for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
        const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
        if (!Number.isNaN(phaseParse) && phases.includes(phaseSplit[phaseInd])) {
          return true;
        }
      }
      return false;
    });
    
    // Filter by municipality
    const filteredData = currentMunicipality === 'all' 
      ? phaseFilteredData 
      : phaseFilteredData.filter(site => site.muni === currentMunicipality);
    
    refreshFullScreenVisualization(filteredData);
  });

  // Phase 3, 4, 5 buttons (local fullscreen state only)
  ['bp3', 'bp4', 'bp5'].forEach((buttonClass, index) => {
    d3.select(`#fullscreen-popup .${buttonClass}`).on('click', (d) => {
      try {
        const state = getGlobalState();
        const currentMunicipality = d3.select('#municipality-select-fullscreen').property('value');
        const phaseNum = (index + 3).toString(); // bp3 = phase 3, bp4 = phase 4, bp5 = phase 5
        
        // Toggle phase locally for fullscreen (don't affect global state)
        const isActive = d3.select(`#fullscreen-popup .${buttonClass}`).classed(`toggled__p${phaseNum}`);
        d3.select(`#fullscreen-popup .${buttonClass}`).classed(`toggled__p${phaseNum}`, !isActive);
        
        // Get current active phases from button states
        const activePhases = [];
        if (d3.select('#fullscreen-popup .bp1').classed('toggled__p1')) {
          activePhases.push("1", "2");
        }
        if (d3.select('#fullscreen-popup .bp3').classed('toggled__p3')) {
          activePhases.push("3");
        }
        if (d3.select('#fullscreen-popup .bp4').classed('toggled__p4')) {
          activePhases.push("4");
        }
        if (d3.select('#fullscreen-popup .bp5').classed('toggled__p5')) {
          activePhases.push("5");
        }
        
        // Filter data locally for fullscreen
        const phaseFilteredData = state.allData[1].filter(site => {
          const phaseSplit = site.phase.split(" ");
          for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
            const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
            if (!Number.isNaN(phaseParse) && activePhases.includes(phaseSplit[phaseInd])) {
              return true;
            }
          }
          return false;
        });
        
        // Filter by municipality
        const filteredData = currentMunicipality === 'all' 
          ? phaseFilteredData 
          : phaseFilteredData.filter(site => site.muni === currentMunicipality);
        
        refreshFullScreenVisualization(filteredData);
      } catch (error) {
        console.error(`Error in Phase ${index + 3} button:`, error);
      }
    });
  });
}

/**
 * Refresh full screen visualization
 */
function refreshFullScreenVisualization(data) {
  // Clear existing content
  d3.selectAll('#fullscreen-popup .site').remove();
  d3.selectAll('#fullscreen-popup .parking-map__sites').remove();
  d3.selectAll('#fullscreen-popup thead').remove();
  d3.selectAll('#fullscreen-popup tbody').remove();
  d3.selectAll('#fullscreen-popup tr').remove();
  d3.selectAll('#fullscreen-popup td').remove();
  d3.select('#fullscreen-popup .slider-group').remove();
  
  // Recreate visualizations
  populateMap(data, '#fullscreen-popup .parking-map', (d) => toggleSelected(d, true));
  createTable(data, '#fullscreen-popup .parking-table');
  createSlider(data, '#fullscreen-popup', true);
}

/**
 * Create full screen toggle functionality
 */
export function createFullScreenToggle() {
  const fullScreenButton = d3.select('.explore-the-data__button');
  
  fullScreenButton.on('click', () => {
    // Open fullscreen.html in a new tab
    window.open('./fullscreen.html', '_blank', 'width=1920,height=1080,scrollbars=yes,resizable=yes');
  });
}

/**
 * Refresh main page visualization (placeholder - should be imported from main module)
 */
function refreshMainPageVisualization() {
  // This function should be imported from the main module
  console.log('Refreshing main page visualization...');
}
