/**
 * Full screen mode functionality for parking site map
 */

import { projection, getGlobalState, updateGlobalState } from './core-utils.js';
import { createTownMap, createJobMap, createTrainMap, createRapidTransitMap, populateMap, highlightMunicipality } from './map-visualization.js';
import { createTable } from './table.js';
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
    populateMap(currentFilteredData, '#fullscreen-popup .parking-map', toggleSelectedForFullScreen);
    
    // Create table
    createTable(currentFilteredData, '#fullscreen-popup .parking-table');
    
    // Create slider
    createSlider(currentFilteredData, '#fullscreen-popup .slider', true);
    
    // Populate municipality dropdown for full screen
    populateMunicipalityDropdownForFullScreen(currentPhaseData);
    
    // Set up full screen controls
    setupFullScreenControls();
    
    // Reset municipality dropdown to "all"
    d3.select('#municipality-select-fullscreen').property('value', 'all');
    
    // Reset all phase buttons to active state
    d3.select('#fullscreen-popup .bp1').classed('toggled__p1', true);
    d3.select('#fullscreen-popup .bp2').classed('toggled__p2', true);
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
 * Toggle site selection for full screen
 */
function toggleSelectedForFullScreen(d) {
  if (d3.select(`#site-fullscreen-${d.site_id}`).attr('class').includes('site') && !d3.select(`#site-fullscreen-${d.site_id}`).attr('class').includes('selected')) {
    d3.select(`#site-fullscreen-${d.site_id}`).attr('r', '6px').attr('class', 'site--selected');
    d3.select(`#block-fullscreen-${d.site_id}`).attr('class', 'parking-table__data-row--selected');
  } else {
    d3.select(`#site-fullscreen-${d.site_id}`).attr('r', '4px').attr('class', d => `site p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
    d3.select(`#block-fullscreen-${d.site_id}`).attr('class', d => `parking-table__data-row p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
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
    updateGlobalState({ ...state, selectedMunicipality: this.value });
    
    highlightMunicipality(this.value, '#fullscreen-popup .parking-map');
    
    if (this.value !== 'all') {
      updateGlobalState({ ...state, phases: ["1", "2", "3", "4", "5"] });
      const newPhaseData = filterPhaseData(state.allData);
      updateGlobalState({ ...state, phaseData: newPhaseData });
    }
    
    const currentState = getGlobalState();
    const filteredData = filterMunicipalityData(currentState.phaseData);
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

  ['bp1', 'bp2', 'bp3', 'bp4', 'bp5'].forEach((buttonClass, index) => {
    d3.select(`#fullscreen-popup .${buttonClass}`).on('click', (d) => {
      try {
        const currentState = getGlobalState();
        const phaseNum = (index + 1).toString();
        
        // Toggle phase logic here
        if (currentState.phases.includes(phaseNum)) {
          currentState.phases.splice(currentState.phases.indexOf(phaseNum), 1);
        } else {
          currentState.phases.push(phaseNum);
        }
        
        updateGlobalState({ ...currentState });
        
        const newPhaseData = filterPhaseData(currentState.allData);
        const filteredData = filterMunicipalityData(newPhaseData);
        refreshFullScreenVisualization(filteredData);
        
        // Update button visual state
        d3.select(`#fullscreen-popup .${buttonClass}`).classed(`toggled__p${phaseNum}`, currentState.phases.includes(phaseNum));
      } catch (error) {
        console.error(`Error in Phase ${index + 1} button:`, error);
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
  populateMap(data, '#fullscreen-popup .parking-map', toggleSelectedForFullScreen);
  createTable(data, '#fullscreen-popup .parking-table');
  createSlider(data, '#fullscreen-popup .slider', true);
}

/**
 * Create full screen toggle functionality
 */
export function createFullScreenToggle() {
  const fullScreenButton = d3.select('.explore-the-data__button');
  const fullScreenPopup = d3.select('#fullscreen-popup');
  const closeButton = d3.select('#close-fullscreen');
  
  fullScreenButton.on('click', () => {
    fullScreenPopup.style('display', 'flex');
    document.body.style.overflow = 'hidden';
    
    // Initialize full screen visualization
    initializeFullScreenVisualization();
  });
  
  closeButton.on('click', () => {
    fullScreenPopup.style('display', 'none');
    document.body.style.overflow = 'auto';
    
    // Reset main page visualization to current state
    refreshMainPageVisualization();
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullScreenPopup.style('display') === 'flex') {
      fullScreenPopup.style('display', 'none');
      document.body.style.overflow = 'auto';
      
      // Reset main page visualization to current state
      refreshMainPageVisualization();
    }
  });
}

/**
 * Refresh main page visualization (placeholder - should be imported from main module)
 */
function refreshMainPageVisualization() {
  // This function should be imported from the main module
  console.log('Refreshing main page visualization...');
}
