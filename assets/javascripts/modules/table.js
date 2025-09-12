/**
 * Table functionality for parking site map
 */

import { sortText, getGlobalState } from './core-utils.js';

/**
 * Toggle site selection
 */
export function toggleSelected(d, isFullScreen = false) {
  const sitePrefix = isFullScreen ? 'site-fullscreen-' : 'site-';
  const blockPrefix = isFullScreen ? 'block-fullscreen-' : 'block-';
  
  if (d3.select(`#${sitePrefix}${d.site_id}`).attr('class').includes('site') && 
      !d3.select(`#${sitePrefix}${d.site_id}`).attr('class').includes('selected')) {
    d3.select(`#${sitePrefix}${d.site_id}`).attr('r', '6px').attr('class', 'site--selected');
    d3.select(`#${blockPrefix}${d.site_id}`).attr('class', 'parking-table__data-row--selected');
  } else {
    d3.select(`#${sitePrefix}${d.site_id}`).attr('r', '4px').attr('class', d => `site p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
    d3.select(`#${blockPrefix}${d.site_id}`).attr('class', d => `parking-table__data-row p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
  }
}

/**
 * Create parking data table
 */
export function createTable(data, selector = '.parking-table') {
  const table = d3.select(selector);
  const headerNames = {
    'Site Name': 'prop_name',
    Municipality: 'muni',
    'Parking Supply per Unit': 'supply_tot',
    'Parking Demand per Unit': 'park_dem',
    '% Utilization': 'util_rate',
    '% Affordable Units': 'bldg_affp',
    'Walk Score': 'walk_score',
    'Jobs Accessible by Transit': 'jobs_30min',
  };
  
  const headers = table.append('thead')
    .attr('class', 'parking-table__header')
    .selectAll('tr')
    .data([Object.keys(headerNames)]).enter()
    .append('tr')
    .attr('class', 'parking-table__header-row');
    
  headers.selectAll('td')
    .data(row => row)
    .enter()
    .append('td')
    .text(d => d)
    .attr('class', 'parking-table__header-cell')
    .on('click', (d) => {
      const state = getGlobalState();
      if (state.currentSortState === 'ascending') {
        state.currentSortState = 'descending';
        rows.sort((a, b) => {
          return sortText(b[headerNames[d]], a[headerNames[d]]);
        });
      } else {
        state.currentSortState = 'ascending';
        rows.sort((a, b) => {
          return sortText(a[headerNames[d]], b[headerNames[d]]);
        });
      }
    });
    
  const rows = table.append('tbody')
    .attr('class', 'parking-table__body')
    .selectAll('tr')
    .data(data || [])
    .enter()
    .append('tr')
    .attr('class', "parking-table__data-row")
    .attr('id', d => {
      const prefix = selector.includes('fullscreen') ? 'block-fullscreen-' : 'block-';
      return `${prefix}${d.site_id}`;
    })
    .on('click', d => {
      const isFullScreen = selector.includes('fullscreen');
      toggleSelected(d, isFullScreen);
    });
    
  rows.selectAll('td')
    .data(row => [
      row.prop_name ? row.prop_name : `${row.add_num} ${row.add_str}`,
      row.muni,
      row.supply_tot != "" ? parseFloat(row.supply_tot).toFixed(2) : "--",
      parseFloat(row.park_dem).toFixed(2),
      Math.round(+row.util_rate * 100),
      Math.round(+row.bldg_affp * 100),
      row.walk_score,
      row.jobs_30min != "" ? Number(row.jobs_30min) : "--"
    ])
    .enter()
    .append('td')
    .text(d => d)
    .attr('class', 'parking-table__data-cell');
}
