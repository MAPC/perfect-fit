/**
 * Standalone fullscreen page functionality
 * This file contains all the logic needed for the fullscreen.html page
 */

// Import all necessary modules
import { projection, getGlobalState, updateGlobalState } from './modules/core-utils.js';
import { createTownMap, createJobMap, createTrainMap, createRapidTransitMap, populateMap, highlightMunicipality } from './modules/map-visualization.js';
import { createTable, toggleSelected } from './modules/table.js';
import { createSlider } from './modules/slider.js';
import { filterPhaseData, filterMunicipalityData } from './modules/data-filtering.js';

// Local state for fullscreen (independent from main page)
let fullscreenState = {
    selectedMunicipality: 'all',
    phases: ["1", "2", "3", "4", "5"],
    brushState: [0.0, 2.0],
    pastMax: false,
    pastMin: false,
    allData: null,
    surveyedMunicipalities: []
};

/**
 * Initialize the fullscreen visualization
 */
async function initializeFullscreen() {
    try {
        // Load all data files
        const [municipalities, sites, commuterRail, rapidTransit, jobs] = await Promise.all([
            d3.json('./assets/data/ma-munis.geojson'),
            d3.csv('./assets/data/perfect-fit-parking-data.csv'),
            d3.json('./assets/data/mbta-commuter-rail-lines.json'),
            d3.json('./assets/data/mbta-rapid-transit.json'),
            d3.json('./assets/data/job-categories-topo.json')
        ]);

        // Process sites data
        const processedSites = sites.map(d => ({
            ...d,
            lat: +d.lat,
            lng: +d.lng,
            phase: d.phase,
            muni: d.muni
        }));

        // Get surveyed municipalities (use same list as normal mode)
        const surveyedMunicipalities = [
            'ARLINGTON', 'BELMONT', 'BOSTON', 'BROOKLINE', 'CAMBRIDGE', 'CHELSEA', 'EVERETT',
            'MALDEN', 'MEDFORD', 'MELROSE', 'MILTON', 'NEWTON', 'QUINCY', 'SOMERVILLE', 'REVERE',
            'WALTHAM', 'WATERTOWN', 'WINTHROP', 'BEVERLY', 'CONCORD', 'DANVERS', 'LEXINGTON',
            'SALEM', 'SUDBURY', 'NEEDHAM', 'PEABODY', 'LINCOLN', 'WAYLAND', 'WESTON', 'LYNNFIELD',
            'WAKEFIELD', 'SAUGUS', 'LYNN', 'STONEHAM', 'WOBURN', 'WELLESLEY', 'SWAMPSCOTT',
            'MARBLEHEAD', 'NAHANT', 'WINCHESTER'
        ];

        // Update fullscreen state
        fullscreenState.allData = [municipalities, processedSites, commuterRail, rapidTransit, jobs];
        fullscreenState.surveyedMunicipalities = surveyedMunicipalities;

        // Initialize visualization
        setupFullscreenVisualization();
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

/**
 * Setup the fullscreen visualization
 */
function setupFullscreenVisualization() {
    // Clear any existing content
    d3.select('.fullscreen-map .parking-map').selectAll('*').remove();
    d3.select('.fullscreen-table .parking-table').selectAll('*').remove();
    d3.select('.slider').selectAll('*').remove();
    d3.select('.slider-group').remove();
    
    // Get current filtered data using local state
    const currentPhaseData = fullscreenState.allData[1].filter(site => {
        const phaseSplit = site.phase.split(" ");
        for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
            const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
            if (!Number.isNaN(phaseParse) && fullscreenState.phases.includes(phaseSplit[phaseInd])) {
                return true;
            }
        }
        return false;
    });
    
    const currentFilteredData = fullscreenState.selectedMunicipality === 'all' 
        ? currentPhaseData 
        : currentPhaseData.filter(site => site.muni === fullscreenState.selectedMunicipality);
    
    // Create town map
    const filteredMunicipalities = fullscreenState.allData[0].features.filter(municipality => 
        fullscreenState.surveyedMunicipalities.includes(municipality.properties.muni_name.toUpperCase())
    );
    createTownMap(filteredMunicipalities, '.fullscreen-map .parking-map');
    
    // Create job map
    const topology = topojson.feature(fullscreenState.allData[4], fullscreenState.allData[4].objects['UMN_8cats_ICC_Simp_noLynn']);
    createJobMap(topology.features, '.fullscreen-map .parking-map');
    
    // Create train and rapid transit maps
    createTrainMap(fullscreenState.allData[2], '.fullscreen-map .parking-map');
    createRapidTransitMap(fullscreenState.allData[3], '.fullscreen-map .parking-map');
    
    // Populate map with sites
    // Use a selector containing 'fullscreen' so map-visualization uses fullscreen site ID prefix
    populateMap(currentFilteredData, '.fullscreen-map .parking-map', (d) => toggleSelected(d, true));
    
    // Create table
    // Use a selector containing 'fullscreen' so table rows use fullscreen ID prefix
    createTable(currentFilteredData, '.fullscreen-table .parking-table');
    
    // Create slider with custom fullscreen implementation
    createFullscreenSlider(currentFilteredData);
    
    // Setup controls
    setupFullscreenControls();
    setupFullscreenPhaseButtons();
    populateMunicipalityDropdown();
}

/**
 * Setup fullscreen controls (transit, jobs, municipality filter)
 */
function setupFullscreenControls() {
    // Ensure initial hidden state for jobs layer and legend
    d3.select('.parking-map__jobs').classed('parking-map__jobs--hidden', true);
    d3.select('.parking-data__legend').classed('parking-data__legend--hidden', true);
    d3.select('.toggle__jobs').classed('is-active', false).text('Show Jobs Heatmap');

    // Transit toggle
    d3.select('.toggle__transit').on('click', function() {
        const isHidden = d3.select('.parking-map__train-lines').classed('parking-map__train-lines--hidden');
        d3.select('.parking-map__train-lines').classed('parking-map__train-lines--hidden', !isHidden);
        d3.select('.parking-map__rapid-transit-lines').classed('parking-map__rapid-transit-lines--hidden', !isHidden);
        
        const buttonElement = d3.select(this);
        // reflect active state styling
        buttonElement.classed('is-active', isHidden);
        if (isHidden) {
            buttonElement.text('Hide Public Transit');
        } else {
            buttonElement.text('Show Public Transit');
        }
    });

    // Jobs toggle
    d3.select('.toggle__jobs').on('click', function() {
        const isHidden = d3.select('.parking-map__jobs').classed('parking-map__jobs--hidden');
        d3.select('.parking-map__jobs').classed('parking-map__jobs--hidden', !isHidden);
        d3.select('.parking-data__legend').classed('parking-data__legend--hidden', !isHidden);
        
        const buttonElement = d3.select(this);
        // reflect active state styling
        buttonElement.classed('is-active', isHidden);
        if (isHidden) {
            buttonElement.text('Hide Jobs Heatmap');
        } else {
            buttonElement.text('Show Jobs Heatmap');
        }
    });

    // Municipality filter
    d3.select('#municipality-select-fullscreen').on('change', function() {
        const selectedMunicipality = d3.select(this).property('value');
        fullscreenState.selectedMunicipality = selectedMunicipality;
        
        // Filter data based on current phase selection (don't reset phases)
        const phaseFilteredData = fullscreenState.allData[1].filter(site => {
            const phaseSplit = site.phase.split(" ");
            for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
                const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
                if (!Number.isNaN(phaseParse) && fullscreenState.phases.includes(phaseSplit[phaseInd])) {
                    return true;
                }
            }
            return false;
        });
        
        // Update local state
        fullscreenState.selectedMunicipality = selectedMunicipality;
        
        // If a specific municipality is selected, turn on all phases by default
        if (selectedMunicipality !== 'all') {
            fullscreenState.phases = ["1", "2", "3", "4", "5"];
            
            // Update phase button visual states
            d3.select('.bp1').classed('toggled__p1', true);
            d3.select('.bp3').classed('toggled__p3', true);
            d3.select('.bp4').classed('toggled__p4', true);
            d3.select('.bp5').classed('toggled__p5', true);
        }
        
        // Filter and refresh visualization
        refreshFullscreenVisualizationWithCurrentState();
        
        // Highlight municipality on map
        if (selectedMunicipality !== 'all') {
            highlightMunicipality(selectedMunicipality, '.parking-map');
        } else {
            // Remove highlighting
            d3.select('.parking-map').selectAll('.municipality').classed('highlighted', false);
        }
    });
}

/**
 * Setup fullscreen phase buttons
 */
function setupFullscreenPhaseButtons() {
    // Phase 1 & 2 button
    d3.select('.bp1').on('click', function() {
        const isActive = d3.select(this).classed('toggled__p1');
        
        // Update local state - toggle phases 1 and 2 together
        if (isActive) {
            // Remove phases 1 and 2
            fullscreenState.phases = fullscreenState.phases.filter(p => p !== "1" && p !== "2");
        } else {
            // Add phases 1 and 2
            if (!fullscreenState.phases.includes("1")) fullscreenState.phases.push("1");
            if (!fullscreenState.phases.includes("2")) fullscreenState.phases.push("2");
        }
        
        // Update button visual state
        d3.select(this).classed('toggled__p1', !isActive);
        
        // Filter and refresh visualization
        refreshFullscreenVisualizationWithCurrentState();
    });

    // Phase 3 button
    d3.select('.bp3').on('click', function() {
        const isActive = d3.select(this).classed('toggled__p3');
        
        // Update local state
        if (isActive) {
            // Remove phase 3
            fullscreenState.phases = fullscreenState.phases.filter(p => p !== "3");
        } else {
            // Add phase 3
            if (!fullscreenState.phases.includes("3")) fullscreenState.phases.push("3");
        }
        
        // Update button visual state
        d3.select(this).classed('toggled__p3', !isActive);
        
        // Filter and refresh visualization
        refreshFullscreenVisualizationWithCurrentState();
    });

    // Phase 4 button
    d3.select('.bp4').on('click', function() {
        const isActive = d3.select(this).classed('toggled__p4');
        
        // Update local state
        if (isActive) {
            // Remove phase 4
            fullscreenState.phases = fullscreenState.phases.filter(p => p !== "4");
        } else {
            // Add phase 4
            if (!fullscreenState.phases.includes("4")) fullscreenState.phases.push("4");
        }
        
        // Update button visual state
        d3.select(this).classed('toggled__p4', !isActive);
        
        // Filter and refresh visualization
        refreshFullscreenVisualizationWithCurrentState();
    });

    // Phase 5 button
    d3.select('.bp5').on('click', function() {
        const isActive = d3.select(this).classed('toggled__p5');
        
        // Update local state
        if (isActive) {
            // Remove phase 5
            fullscreenState.phases = fullscreenState.phases.filter(p => p !== "5");
        } else {
            // Add phase 5
            if (!fullscreenState.phases.includes("5")) fullscreenState.phases.push("5");
        }
        
        // Update button visual state
        d3.select(this).classed('toggled__p5', !isActive);
        
        // Filter and refresh visualization
        refreshFullscreenVisualizationWithCurrentState();
    });
}

/**
 * Populate municipality dropdown
 */
function populateMunicipalityDropdown() {
    const municipalitySelect = d3.select('#municipality-select-fullscreen');
    
    // Clear existing options
    municipalitySelect.selectAll('option').remove();
    
    // Add "All Municipalities" option
    municipalitySelect.append('option')
        .attr('value', 'all')
        .text('All Municipalities');
    
    // Add municipality options
    const municipalities = [...new Set(fullscreenState.allData[1].map(d => d.muni))].sort();
    municipalities.forEach(muni => {
        municipalitySelect.append('option')
            .attr('value', muni)
            .text(muni);
    });
    
    // Set default selection
    municipalitySelect.property('value', 'all');
}

/**
 * Create slider specifically for fullscreen mode with local state
 */
function createFullscreenSlider(sliderData) {
    const sliderSvg = d3.select('.slider');
    
    // Clear existing content
    sliderSvg.selectAll('*').remove();
    
    if (!sliderData || sliderData.length === 0) {
        const sliderMargin = { top: 20, right: 80, bottom: 60, left: 80 };
        const sliderWidth = +sliderSvg.style('width').slice(0,-2) - sliderMargin.left - sliderMargin.right;
        const sliderHeight = +sliderSvg.attr('height') - sliderMargin.top - sliderMargin.bottom;
        const g = sliderSvg.append('g').attr('transform', `translate(${sliderMargin.left}, ${sliderMargin.top})`).attr("class", "slider-group");

        // Create empty axes
        g.append('g')
            .attr('class', 'slider__x-axis')
            .attr('transform', `translate(0, ${sliderHeight})`);

        g.append('text')
            .attr('class', 'slider__x-axis-label')
            .attr('transform', `translate(${sliderWidth / 2}, ${sliderHeight + 45})`)
            .attr('text-anchor', 'middle')
            .text('Parking Demand Per Unit');

        g.append('g')
            .attr('class', 'slider__y-axis');

        g.append('text')
            .attr('class', 'slider__y-axis-label')
            .attr('transform', `rotate(-90) translate(-${sliderHeight / 2} , -40)`)
            .attr('text-anchor', 'middle')
            .text('Parking Utilization');
        
        return;
    }

    const park_dem = sliderData.map(object => object.park_dem).filter(d => !isNaN(d) && d !== null && d !== undefined);
    const utilization = sliderData.map(object => object.util_rate).filter(d => !isNaN(d) && d !== null && d !== undefined);

    if (park_dem.length === 0 || utilization.length === 0) {
        return;
    }

    const sliderMargin = { top: 20, right: 80, bottom: 60, left: 80 };
    const sliderWidth = +sliderSvg.style('width').slice(0,-2) - sliderMargin.left - sliderMargin.right;
    const sliderHeight = +sliderSvg.attr('height') - sliderMargin.top - sliderMargin.bottom;

    const sliderX = d3.scaleLinear()
        .domain(d3.extent(park_dem))
        .range([0, sliderWidth]);

    const sliderY = d3.scaleLinear()
        .domain(d3.extent(utilization))
        .range([sliderHeight, 0]);

    const x_axis = d3.axisBottom(sliderX);
    const y_axis = d3.axisLeft(sliderY);

    const g = sliderSvg.append('g').attr('transform', `translate(${sliderMargin.left}, ${sliderMargin.top})`).attr("class", "slider-group");

    g.append('g')
        .attr('class', 'slider__x-axis')
        .attr('transform', `translate(0, ${sliderHeight})`)
        .call(x_axis);

    g.append('text')
        .attr('class', 'slider__x-axis-label')
        .attr('transform', `translate(${sliderWidth / 2}, ${sliderHeight + 45})`)
        .attr('text-anchor', 'middle')
        .text('Parking Demand Per Unit');

    g.append('g')
        .attr('class', 'slider__y-axis')
        .call(y_axis);

    g.append('text')
        .attr('class', 'slider__y-axis-label')
        .attr('transform', `rotate(-90) translate(-${sliderHeight / 2} , -40)`)
        .attr('text-anchor', 'middle')
        .text('Parking Utilization');

    const circle = g.append('g')
        .selectAll('circle')
        .data(sliderData.filter(d => !isNaN(d.park_dem) && !isNaN(d.util_rate)))
        .enter()
        .append('circle')
        .attr('class', d => `circle p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`)
        .attr('transform', d => `translate(${sliderX(d.park_dem)}, ${sliderY(d.util_rate)})`)
        .attr('r', 3.5);

    const brush = d3.brushX()
        .extent([[0, 0], [sliderWidth, sliderHeight]])
        .on('start brush end', () => fullscreenBrushMoved(sliderX, circle, sliderHeight, sliderData));

    const gBrush = g.append('g')
        .attr('class', 'brush')
        .call(brush);
        
    // Only create handles if we have valid dimensions
    if (sliderHeight > 0 && !isNaN(sliderHeight)) {
        gBrush.selectAll('.handle--custom')
            .data([{ type: 'w' }, { type: 'e' }])
            .enter().append('rect')
            .attr('class', 'handle--custom')
            .attr('fill', '#666')
            .attr('fill-opacity', 0.8)
            .attr('stroke', '#000')
            .attr('stroke-width', 1.5)
            .attr('cursor', 'ew-resize')
            .attr('width', 8)
            .attr('height', sliderHeight)
            .attr('x', (d, i) => i ? -4 : -4)
            .attr('y', -60);

        // Reset brush to full width
        gBrush.call(brush.move, [0, sliderWidth]);
    }
}

/**
 * Handle brush movement for fullscreen mode
 */
function fullscreenBrushMoved(x, circle, sliderHeight, sliderData) {
    try {
        const s = d3.event.selection;
        const handle = d3.selectAll('.slider .handle--custom');
        
        // Validate inputs
        if (!x || !circle || isNaN(sliderHeight) || !sliderData) {
            console.warn('Invalid inputs for fullscreenBrushMoved');
            return;
        }
        
        if (s == null) {
            handle.attr('display', 'none');
            circle.classed('active', false);
            // Reset all dots to grey when brush is cleared
            circle.style('fill', '#cccccc')
                  .style('stroke', '#cccccc')
                  .style('fill-opacity', '0.3');
        } else {
            const sx = s.map(x.invert);
            
            // Validate brush selection
            if (sx.some(val => isNaN(val))) {
                console.warn('Invalid brush selection');
                return;
            }
            
            circle.classed('active', d => {
                if (!d || isNaN(d.park_dem)) return false;
                return sx[0] <= d.park_dem && d.park_dem <= sx[1];
            });
            
            // Add visual styling for inactive dots (outside brush selection)
            circle.each(function(d) {
                if (!d || isNaN(d.park_dem)) return;
                const isInactive = !(sx[0] <= d.park_dem && d.park_dem <= sx[1]);
                const dot = d3.select(this);
                
                if (isInactive) {
                    dot.style('fill', '#cccccc')
                       .style('stroke', '#cccccc')
                       .style('fill-opacity', '0.3');
                } else {
                    // Reset to original phase colors
                    dot.style('fill', null)
                       .style('stroke', null)
                       .style('fill-opacity', '0.8');
                }
            });
            
            // Only update handle transform if sliderHeight is valid
            if (!isNaN(sliderHeight) && sliderHeight > 0) {
                handle.attr('display', null).attr('transform', (d, i) => `translate(${s[i]}, ${sliderHeight / 2})`);
            }
            
            const filteredSliderData = sliderData.filter(d => {
                if (!d || isNaN(d.park_dem)) return false;
                return sx[0] <= d.park_dem && d.park_dem <= sx[1];
            });
            
            // Filter by current municipality selection
            const municipalityFilteredData = fullscreenState.selectedMunicipality === 'all' 
                ? filteredSliderData 
                : filteredSliderData.filter(site => site.muni === fullscreenState.selectedMunicipality);
            
            // Update visualizations
            d3.selectAll('.site').remove();
            d3.selectAll('.parking-map__sites').remove();
            populateMap(municipalityFilteredData, '.fullscreen-map .parking-map', (d) => toggleSelected(d, true));
            d3.selectAll('thead').remove();
            d3.selectAll('tbody').remove();
            d3.selectAll('tr').remove();
            d3.selectAll('td').remove();
            createTable(municipalityFilteredData, '.fullscreen-table .parking-table');
        }
    } catch (error) {
        console.error('Error in fullscreenBrushMoved:', error);
    }
}

/**
 * Refresh fullscreen visualization with current state (following normal mode pattern)
 */
function refreshFullscreenVisualizationWithCurrentState() {
    // Filter data based on current state
    const phaseFilteredData = fullscreenState.phases.length === 0 ? [] : fullscreenState.allData[1].filter(site => {
        const phaseSplit = site.phase.split(" ");
        for (let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++) {
            const phaseParse = Number.parseInt(phaseSplit[phaseInd]);
            if (!Number.isNaN(phaseParse) && fullscreenState.phases.includes(phaseSplit[phaseInd])) {
                return true;
            }
        }
        return false;
    });
    
    const filteredData = fullscreenState.selectedMunicipality === 'all' 
        ? phaseFilteredData 
        : phaseFilteredData.filter(site => site.muni === fullscreenState.selectedMunicipality);
    
    // Clear existing content - be more specific to fullscreen map
    d3.select('.slider').selectAll('*').remove();
    d3.select('.slider-group').remove();
    d3.select('.fullscreen-map .parking-map').selectAll('*').remove();
    d3.selectAll('thead').remove();
    d3.selectAll('tbody').remove();
    d3.selectAll('tr').remove();
    d3.selectAll('td').remove();
    
    // Recreate municipality map (same as normal mode)
    const filteredMunicipalities = fullscreenState.allData[0].features.filter(municipality => 
        fullscreenState.surveyedMunicipalities.includes(municipality.properties.muni_name.toUpperCase())
    );
    createTownMap(filteredMunicipalities, '.fullscreen-map .parking-map');
    
    // Recreate job map
    const topology = topojson.feature(fullscreenState.allData[4], fullscreenState.allData[4].objects['UMN_8cats_ICC_Simp_noLynn']);
    createJobMap(topology.features, '.fullscreen-map .parking-map');
    
    // Recreate train and rapid transit maps
    createTrainMap(fullscreenState.allData[2], '.fullscreen-map .parking-map');
    createRapidTransitMap(fullscreenState.allData[3], '.fullscreen-map .parking-map');
    
    // Update map with sites
    populateMap(filteredData, '.fullscreen-map .parking-map', (d) => toggleSelected(d, true));
    
    // Update table
    createTable(filteredData, '.fullscreen-table .parking-table');
    
    // Update slider
    createFullscreenSlider(filteredData);
    
    // Update municipality highlighting
    if (fullscreenState.selectedMunicipality !== 'all') {
        highlightMunicipality(fullscreenState.selectedMunicipality, '.fullscreen-map .parking-map');
    } else {
        // Remove highlighting
        d3.select('.fullscreen-map .parking-map').selectAll('.municipality').classed('highlighted', false);
    }
}

/**
 * Refresh fullscreen visualization with new data
 */
function refreshFullscreenVisualization(data) {
    // Clear existing content to prevent shadow buildup
    d3.select('.slider').selectAll('*').remove();
    d3.select('.slider-group').remove();
    d3.select('.fullscreen-map .parking-map').selectAll('*').remove();
    
    // Update map
    populateMap(data, '.fullscreen-map .parking-map', (d) => toggleSelected(d, true));
    
    // Update table
    createTable(data, '.fullscreen-table .parking-table');
    
    // Update slider
    createFullscreenSlider(data);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeFullscreen);