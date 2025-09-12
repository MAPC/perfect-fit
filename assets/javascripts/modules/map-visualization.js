/**
 * Map visualization functions for parking site map
 */

import { projection } from './core-utils.js';

/**
 * Create town map with municipalities
 */
export function createTownMap(data, selector = '.parking-map') {
  const parkingMap = d3.select(selector);
  const path = d3.geoPath().projection(projection);
  let tooltip = d3.select('.parking-data').append('div')
    .attr('class', 'tooltip');
  parkingMap.append('g')
    .attr('class', 'parking-map__municipalities')
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('id', d => `municipality-${d.properties.muni_name.toLowerCase().replace(/\s+/g, '-')}`)
    .attr('fill', '#eee')
    .attr('stroke', '#999')
    .attr('d', path);
}

/**
 * Create job map heatmap
 */
export function createJobMap(data, selector = '.parking-map') {
  const colors = d3.scaleOrdinal()
    .domain([1, 2, 3, 4, 5, 6, 7, 8])
    .range(['#ffffff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594']);
  const parkingMap = d3.select(selector);
  const path = d3.geoPath().projection(projection);
  parkingMap.append('g')
    .attr('class', 'parking-map__jobs parking-map__jobs--hidden')
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('fill', d => colors(d.properties.OBJECTID))
    .attr('opacity', '0.8')
    .attr('d', path);
}

/**
 * Create train lines map
 */
export function createTrainMap(data, selector = '.parking-map') {
  const parkingMap = d3.select(selector);
  const path = d3.geoPath().projection(projection);
  parkingMap.append('g')
    .attr('class', 'parking-map__train-lines parking-map__train-lines--hidden')
    .selectAll('path')
    .data(data.features)
    .enter()
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', '#80276c')
    .attr('stroke-width', '3')
    .attr('stroke-opacity', 0.6)
    .attr('d', path);
}

/**
 * Create rapid transit lines map
 */
export function createRapidTransitMap(data, selector = '.parking-map') {
  const parkingMap = d3.select(selector);
  const path = d3.geoPath().projection(projection);
  parkingMap.append('g')
    .attr('class', 'parking-map__rapid-transit-lines parking-map__rapid-transit-lines--hidden')
    .selectAll('path')
    .data(data.features)
    .enter()
    .append('path')
    .attr('fill', 'none')
    .attr('stroke', d => d.properties.LINE)
    .attr('stroke-width', '3')
    .attr('stroke-opacity', 0.4)
    .attr('d', path);
}

/**
 * Populate map with parking sites
 */
export function populateMap(data, selector = '.parking-map', toggleFunction) {
  const parkingMap = d3.select(selector);
  const isFullScreen = selector.includes('fullscreen');
  const siteIdPrefix = isFullScreen ? 'site-fullscreen-' : 'site-';

  parkingMap.append('g')
    .attr('class', 'parking-map__sites')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', d=> `site p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`)
    .attr('id', d => `${siteIdPrefix}${d.site_id}`)
    .attr('cx', d => projection([d.y_coord, d.x_coord])[0])
    .attr('cy', d => projection([d.y_coord, d.x_coord])[1])
    .attr('r', '4px')
    .on('click', toggleFunction);
}

/**
 * Highlight municipality on map
 */
export function highlightMunicipality(municipalityName, selector = '.parking-map') {
  // Reset all municipalities to default color
  d3.selectAll(`${selector} .parking-map__municipalities path`)
    .attr('fill', '#eee')
    .attr('fill-opacity', 1);
  
  // If a specific municipality is selected, highlight it
  if (municipalityName && municipalityName !== 'all') {
    const municipalityId = `municipality-${municipalityName.toLowerCase().replace(/\s+/g, '-')}`;
    // Use scoped selector to avoid affecting other maps
    d3.select(`${selector} #${municipalityId}`)
      .attr('fill', '#F0E0AB')
      .attr('fill-opacity', 0.5);
  }
}

/**
 * Create transit map toggle functionality
 */
export function createTransitMapToggle(selector = '') {
  const toggleButton = d3.select(`${selector} .toggle__transit`);
  toggleButton.on('click', (d) => {
    if (d3.select(`${selector} .parking-map__train-lines--hidden`).empty() === true) {
      d3.select(`${selector} .parking-map__train-lines`).attr('class', 'parking-map__train-lines parking-map__train-lines--hidden');
      d3.select(`${selector} .parking-map__rapid-transit-lines`).attr('class', 'parking-map__rapid-transit-lines parking-map__rapid-transit-lines--hidden');
      d3.select(`${selector} .toggle__transit`).text('Show Public Transit');
    } else {
      d3.select(`${selector} .parking-map__train-lines--hidden`).attr('class', 'parking-map__train-lines');
      d3.select(`${selector} .parking-map__rapid-transit-lines--hidden`).attr('class', 'parking-map__rapid-transit-lines');
      d3.select(`${selector} .toggle__transit`).text('Hide Public Transit');
    }
  });
}

/**
 * Create jobs map toggle functionality
 */
export function createJobsMapToggle(selector = '') {
  const toggleButton = d3.select(`${selector} .toggle__jobs`);
  toggleButton.on('click', (d) => {
    if (d3.select(`${selector} .parking-map__jobs--hidden`).empty() === true) {
      d3.select(`${selector} .parking-map__jobs`).attr('class', 'parking-map__jobs parking-map__jobs--hidden');
      d3.select(`${selector} .parking-data__legend`).attr('class', 'parking-data__legend parking-data__legend--hidden');
      d3.select(`${selector} .toggle__jobs`).text('Show Jobs Heatmap');
    } else {
      d3.select(`${selector} .parking-map__jobs--hidden`).attr('class', 'parking-map__jobs');
      d3.select(`${selector} .parking-data__legend--hidden`).attr('class', 'parking-data__legend');
      d3.select(`${selector} .toggle__jobs`).text('Hide Jobs Heatmap');
    }
  });
}
