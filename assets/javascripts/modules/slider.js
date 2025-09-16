/**
 * Slider functionality for parking site map
 */

import { getGlobalState, updateGlobalState } from './core-utils.js';
import { populateMap } from './map-visualization.js';
import { createTable, toggleSelected } from './table.js';
import { filterMunicipalityData } from './data-filtering.js';

/**
 * Create slider with brush functionality
 */
export function createSlider(sliderData, containerSelector = '.slider', isFullScreen = false) {
  // Determine the actual slider selector based on container
  const sliderSelector = containerSelector.includes('fullscreen') ? `${containerSelector} .slider` : containerSelector;
  // If no data, create empty slider without handles
  if (!sliderData || sliderData.length === 0) {
    const sliderSvg = d3.select(sliderSelector);
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
  
  // Check if we have valid data
  if (park_dem.length === 0 || utilization.length === 0) {
    console.warn('No valid data for slider');
    return;
  }
  
  const sliderSvg = d3.select(sliderSelector);
  const sliderMargin = { top: 20, right: 80, bottom: 60, left: 80 };
  const sliderWidth = +sliderSvg.style('width').slice(0,-2) - sliderMargin.left - sliderMargin.right;
  const sliderHeight = +sliderSvg.attr('height') - sliderMargin.top - sliderMargin.bottom;
  
  // Validate dimensions
  if (isNaN(sliderWidth) || isNaN(sliderHeight) || sliderWidth <= 0 || sliderHeight <= 0) {
    console.warn('Invalid slider dimensions');
    return;
  }
  
  const g = sliderSvg.append('g').attr('transform', `translate(${sliderMargin.left}, ${sliderMargin.top})`).attr("class", "slider-group");

  const sliderX = d3.scaleLinear().domain(d3.extent(park_dem)).range([0, sliderWidth]);
  const sliderY = d3.scaleLinear().domain(d3.extent(utilization)).range([0, sliderHeight]);

  const y_axis = d3.axisLeft().scale(sliderY).tickFormat(d3.format("~%"));
  const maxX = d3.max(park_dem);
  const minX = d3.min(park_dem);

  // Validate data ranges
  if (isNaN(maxX) || isNaN(minX) || maxX === minX) {
    console.warn('Invalid data range for slider');
    return;
  }

  g.append('g')
    .attr('class', 'slider__x-axis')
    .attr('transform', `translate(0, ${sliderHeight})`)
    .call(d3.axisBottom(sliderX));

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
    .text('Parking Utilization')

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
    .on('start brush end', () => brushmoved(sliderX, circle, sliderHeight, sliderData, containerSelector, isFullScreen));

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
      .attr('y', isFullScreen ? -60 : -53);

    // Reset brush to full width
    gBrush.call(brush.move, [0, sliderWidth]);
  }
}

/**
 * Handle brush movement events
 */
function brushmoved(x, circle, sliderHeight, sliderData, containerSelector = '', isFullScreen = false) {
  try {
    const s = d3.event.selection;
    const sliderSelector = containerSelector.includes('fullscreen') ? `${containerSelector} .slider` : containerSelector;
    const handle = d3.selectAll(`${sliderSelector} .handle--custom`);
    
    // Validate inputs
    if (!x || !circle || isNaN(sliderHeight) || !sliderData) {
      console.warn('Invalid inputs for brushmoved');
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
      
      const state = getGlobalState();
      const municipalityFilteredData = filterMunicipalityData(filteredSliderData);
      
      // Update visualizations based on isFullScreen parameter
      if (isFullScreen) {
        d3.selectAll(`${containerSelector} .site`).remove();
        d3.selectAll(`${containerSelector} .parking-map__sites`).remove();
        populateMap(municipalityFilteredData, `${containerSelector} .parking-map`, (d) => toggleSelected(d, true));
        d3.selectAll(`${containerSelector} thead`).remove();
        d3.selectAll(`${containerSelector} tbody`).remove();
        d3.selectAll(`${containerSelector} tr`).remove();
        d3.selectAll(`${containerSelector} td`).remove();
        createTable(municipalityFilteredData, `${containerSelector} .parking-table`);
      } else {
        d3.selectAll('.site').remove();
        d3.selectAll('.parking-map__sites').remove();
        populateMap(municipalityFilteredData, '.parking-map', (d) => toggleSelected(d, false));
        d3.selectAll('thead').remove();
        d3.selectAll('tbody').remove();
        d3.selectAll('tr').remove();
        d3.selectAll('td').remove();
        createTable(municipalityFilteredData, '.parking-table');
      }
    }
  } catch (error) {
    console.error('Error in brushmoved:', error);
  }
}

