/**
 * Main parking site map application - Modular version
 * 
 * This file imports and coordinates all the modular components
 */

// Import all modules
import { 
  projection, 
  updateGlobalState, 
  getGlobalState 
} from './modules/core-utils.js';

import { 
  createTownMap, 
  createJobMap, 
  createTrainMap, 
  createRapidTransitMap, 
  populateMap, 
  highlightMunicipality,
  createTransitMapToggle,
  createJobsMapToggle
} from './modules/map-visualization.js';

import { 
  createSlider 
} from './modules/slider.js';

import { 
  createTable, 
  toggleSelected 
} from './modules/table.js';

import { 
  filterPhaseData, 
  filterMunicipalityData, 
  populateMunicipalityDropdown, 
  createMunicipalityFilter 
} from './modules/data-filtering.js';

import { 
  initializeFullScreenVisualization, 
  createFullScreenToggle 
} from './modules/fullscreen.js';

/**
 * Refresh main page visualization
 */
function refreshMainPageVisualization() {
  const currentState = getGlobalState();
  const currentFilteredData = filterMunicipalityData(currentState.phaseData);
  
  // Refresh main page visualization
  d3.selectAll('.site').remove();
  d3.selectAll('.parking-map__sites').remove();
  populateMap(currentFilteredData, '.parking-map', toggleSelected);
  
  // Refresh main page table
  d3.selectAll('thead').remove();
  d3.selectAll('tbody').remove();
  d3.selectAll('tr').remove();
  d3.selectAll('td').remove();
  createTable(currentFilteredData, '.parking-table');
  
  // Refresh main page slider
  d3.select('.slider-group').remove();
  createSlider(currentFilteredData, '.slider', false);
  
  // Update main page municipality highlighting
  highlightMunicipality(currentState.selectedMunicipality, '.parking-map');
  
  // Update main page municipality dropdown
  d3.select('#municipality-select').property('value', currentState.selectedMunicipality);
  
  // Update main page phase button states
  d3.select('.bp1').classed('toggled__p1', currentState.phases.includes("1") && currentState.phases.includes("2"));
  d3.select('.bp2').classed('toggled__p2', currentState.phases.includes("2"));
  d3.select('.bp3').classed('toggled__p3', currentState.phases.includes("3"));
  d3.select('.bp4').classed('toggled__p4', currentState.phases.includes("4"));
  d3.select('.bp5').classed('toggled__p5', currentState.phases.includes("5"));
}

/**
 * Setup phase buttons for main page
 */
function setupPhaseButtons() {
  const state = getGlobalState();
  
  // Phase 1 & 2 button
  d3.select('.bp1').on('click', (d) => {
    const currentState = getGlobalState();
    if (currentState.phases.includes("1") && currentState.phases.includes("2")) {
      currentState.phases.splice(currentState.phases.indexOf("1"), 1);
      currentState.phases.splice(currentState.phases.indexOf("2"), 1);
    } else {
      currentState.phases.push("1");
      currentState.phases.push("2");
    }
    updateGlobalState({ ...currentState });
    
    const newPhaseData = filterPhaseData(currentState.allData);
    const filteredData = filterMunicipalityData(newPhaseData);
    refreshMainPageVisualization();
    d3.select('.bp1').classed('toggled__p1', currentState.phases.includes("1") && currentState.phases.includes("2"));
  });

  // Phase 2 button
  d3.select('.bp2').on('click', (d) => {
    const currentState = getGlobalState();
    if (currentState.phases.includes("2")) {
      currentState.phases.splice(currentState.phases.indexOf("2"), 1);
    } else {
      currentState.phases.push("2");
    }
    updateGlobalState({ ...currentState });
    
    const newPhaseData = filterPhaseData(currentState.allData);
    const filteredData = filterMunicipalityData(newPhaseData);
    refreshMainPageVisualization();
    d3.select('.bp2').classed('toggled__p2', currentState.phases.includes("2"));
  });

  // Phase 3 button
  d3.select('.bp3').on('click', (d) => {
    const currentState = getGlobalState();
    if (currentState.phases.includes("3")) {
      currentState.phases.splice(currentState.phases.indexOf("3"), 1);
    } else {
      currentState.phases.push("3");
    }
    updateGlobalState({ ...currentState });
    
    const newPhaseData = filterPhaseData(currentState.allData);
    const filteredData = filterMunicipalityData(newPhaseData);
    refreshMainPageVisualization();
    d3.select('.bp3').classed('toggled__p3', currentState.phases.includes("3"));
  });

  // Phase 4 button
  d3.select('.bp4').on('click', (d) => {
    const currentState = getGlobalState();
    if (currentState.phases.includes("4")) {
      currentState.phases.splice(currentState.phases.indexOf("4"), 1);
    } else {
      currentState.phases.push("4");
    }
    updateGlobalState({ ...currentState });
    
    const newPhaseData = filterPhaseData(currentState.allData);
    const filteredData = filterMunicipalityData(newPhaseData);
    refreshMainPageVisualization();
    d3.select('.bp4').classed('toggled__p4', currentState.phases.includes("4"));
  });

  // Phase 5 button
  d3.select('.bp5').on('click', (d) => {
    const currentState = getGlobalState();
    if (currentState.phases.includes("5")) {
      currentState.phases.splice(currentState.phases.indexOf("5"), 1);
    } else {
      currentState.phases.push("5");
    }
    updateGlobalState({ ...currentState });
    
    const newPhaseData = filterPhaseData(currentState.allData);
    const filteredData = filterMunicipalityData(newPhaseData);
    refreshMainPageVisualization();
    d3.select('.bp5').classed('toggled__p5', currentState.phases.includes("5"));
  });
}

/**
 * Initialize the application
 */
function initializeApp() {
  Promise.all([
    d3.json('./assets/data/ma-munis.geojson'),
    d3.csv('./assets/data/perfect-fit-parking-data.csv'),
    d3.json('./assets/data/mbta-commuter-rail-lines.json'),
    d3.json('./assets/data/mbta-rapid-transit.json'),
    d3.json('./assets/data/job-categories-topo.json')
  ]).then((data) => {
    const surveyedMunicipalities = [
      'ARLINGTON', 'BELMONT', 'BOSTON', 'BROOKLINE', 'CAMBRIDGE', 'CHELSEA', 'EVERETT',
      'MALDEN', 'MEDFORD', 'MELROSE', 'MILTON', 'NEWTON', 'QUINCY', 'SOMERVILLE', 'REVERE',
      'WALTHAM', 'WATERTOWN', 'WINTHROP', 'BEVERLY', 'CONCORD', 'DANVERS', 'LEXINGTON',
      'SALEM', 'SUDBURY', 'NEEDHAM', 'PEABODY', 'LINCOLN', 'WAYLAND', 'WESTON', 'LYNNFIELD',
      'WAKEFIELD', 'SAUGUS', 'LYNN', 'STONEHAM', 'WOBURN', 'WELLESLEY', 'SWAMPSCOTT',
      'MARBLEHEAD', 'NAHANT', 'WINCHESTER'
    ];
    
    // Initialize global state
    updateGlobalState({
      brushState: [0.0, 2.0],
      pastMax: false,
      pastMin: false,
      currentSortState: 'ascending',
      selectedMunicipality: 'all',
      allData: data,
      surveyedMunicipalities: surveyedMunicipalities,
      phases: ["1", "2", "3", "4", "5"],
      phaseData: null
    });
    
    const state = getGlobalState();
    
    // Filter initial data
    const initialPhaseData = filterPhaseData(data);
    const filteredMunicipalities = data[0].features.filter(municipality => 
      surveyedMunicipalities.includes(municipality.properties.muni_name.toUpperCase())
    );
    
    const topology = topojson.feature(data[4], data[4].objects['UMN_8cats_ICC_Simp_noLynn']); 
    console.log(topology);
    // Populate municipality dropdown and create filter
    populateMunicipalityDropdown(initialPhaseData, '#municipality-select');
    createMunicipalityFilter('#municipality-select', refreshMainPageVisualization);
    
    // Apply initial municipality filter and highlighting
    const initialFilteredData = filterMunicipalityData(initialPhaseData);
    highlightMunicipality(state.selectedMunicipality, '.parking-map');
    
    // Create all visualizations
    createTownMap(filteredMunicipalities, '.parking-map');
    createJobMap(topology.features, '.parking-map');
    createTrainMap(data[2], '.parking-map');
    createRapidTransitMap(data[3], '.parking-map');
    createTable(initialFilteredData, '.parking-table');
    populateMap(initialFilteredData, '.parking-map', toggleSelected);
    createSlider(initialFilteredData, '.slider', false);
    
    // Setup controls
    createTransitMapToggle('');
    createJobsMapToggle('');
    createFullScreenToggle();
    setupPhaseButtons();
  });
}

// Initialize the application when DOM is loaded
window.addEventListener('DOMContentLoaded', initializeApp);
