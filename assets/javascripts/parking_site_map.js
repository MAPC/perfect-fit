const projection = d3.geoAlbers()
  .scale(85000)
  .rotate([71.057, 0])
  .center([-0.021, 42.38])
  .translate([960 / 2, 700 / 2]);

let currentSortState = 'ascending';

function sortText(a, b) {
  const upA = a.toUpperCase();
  const upB = b.toUpperCase();
  return (upA < upB) ? -1 : (upA > upB) ? 1 : 0;
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function toggleSelected(d) {
  if (d3.select(`#site-${d.site_id}`).attr('class').includes('site') && !d3.select(`#site-${d.site_id}`).attr('class').includes('selected')) {
    d3.select(`#site-${d.site_id}`).attr('r', '6px').attr('class', 'site--selected');
    d3.select(`#block-${d.site_id}`).attr('class', 'parking-table__data-row--selected');
  } else {
    d3.select(`#site-${d.site_id}`).attr('r', '4px').attr('class', d => `site p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
    d3.select(`#block-${d.site_id}`).attr('class', d => `parking-table__data-row p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`);
  }
}

function createTransitMapToggle() {
  const toggleButton = d3.select('.toggle__transit');
  toggleButton.on('click', (d) => {
    if (d3.select('.parking-map__train-lines--hidden').empty() === true) {
      d3.select('.parking-map__train-lines').attr('class', 'parking-map__train-lines parking-map__train-lines--hidden');
      d3.select('.parking-map__rapid-transit-lines').attr('class', 'parking-map__rapid-transit-lines parking-map__rapid-transit-lines--hidden');
      d3.select('.toggle__transit').text('Show Public Transit');
    } else {
      d3.select('.parking-map__train-lines--hidden').attr('class', 'parking-map__train-lines');
      d3.select('.parking-map__rapid-transit-lines--hidden').attr('class', 'parking-map__rapid-transit-lines');
      d3.select('.toggle__transit').text('Hide Public Transit');
    }
  });
}

function createJobsMapToggle() {
  const toggleButton = d3.select('.toggle__jobs');
  toggleButton.on('click', (d) => {
    if (d3.select('.parking-map__jobs--hidden').empty() === true) {
      d3.select('.parking-map__jobs').attr('class', 'parking-map__jobs parking-map__jobs--hidden');
      d3.select('.parking-data__legend').attr('class', 'parking-data__legend parking-data__legend--hidden');
      d3.select('.toggle__jobs').text('Show Jobs Heatmap');
    } else {
      d3.select('.parking-map__jobs--hidden').attr('class', 'parking-map__jobs');
      d3.select('.parking-data__legend--hidden').attr('class', 'parking-data__legend');
      d3.select('.toggle__jobs').text('Hide Jobs Heatmap');
    }
  });
}

function populateMap(data) {
  const parkingMap = d3.select('.parking-map');

  parkingMap.append('g')
    .attr('class', 'parking-map__sites')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', d=> `site p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`)
    .attr('id', d => `site-${d.site_id}`)
    .attr('cx', d => projection([d.y_coord, d.x_coord])[0])
    .attr('cy', d => projection([d.y_coord, d.x_coord])[1])
    .attr('r', '4px')
    .on('click', d => toggleSelected(d));
}

function brushmoved(x, circle, sliderHeight, sliderData) {
  const s = d3.event.selection;
  const handle = d3.selectAll('.handle--custom');
  if (s == null) {
    handle.attr('display', 'none');
    circle.classed('active', false);
  } else {
    const sx = s.map(x.invert);
    circle.classed('active', d => sx[0] <= d.park_dem && d.park_dem <= sx[1]);
    handle.attr('display', null).attr('transform', (d, i) => `translate(${s[i]}, ${sliderHeight / 2})`);
    const filteredSliderData = sliderData.filter(d => sx[0] <= d.park_dem && d.park_dem <= sx[1]);
    d3.selectAll('.site').remove();
    d3.selectAll('.parking-map__sites').remove();
    populateMap(filteredSliderData, projection);
    d3.selectAll('thead').remove();
    d3.selectAll('tbody').remove();
    d3.selectAll('tr').remove();
    d3.selectAll('td').remove();
    createTable(filteredSliderData);
  }
}

function createSlider(sliderData) {
  const park_dem = sliderData.map(object => object.park_dem);
  const utilization = sliderData.map(object => object.util_rate);
  const sliderSvg = d3.select('.slider');
  const sliderMargin = { top: 0, right: 64, bottom: 50, left: 64 };
  const sliderWidth = +sliderSvg.style('width').slice(0,-2) - sliderMargin.left - sliderMargin.right;
  const sliderHeight = +sliderSvg.attr('height') - sliderMargin.top - sliderMargin.bottom;
  const g = sliderSvg.append('g').attr('transform', `translate(${sliderMargin.left}, ${sliderMargin.top})`).attr("class", "slider-group");

  const sliderX = d3.scaleLinear().domain(d3.extent(park_dem)).range([0, sliderWidth]);
  const sliderY = d3.scaleLinear().domain(d3.extent(utilization)).range([0, sliderHeight]);

  g.append('g')
    .attr('class', 'slider__x-axis')
    .attr('transform', `translate(0, ${sliderHeight})`)
    .call(d3.axisBottom(sliderX));

  g.append('text')
    .attr('class', 'slider__x-axis-label')
    .attr('transform', `translate(${sliderWidth / 2}, ${sliderHeight + 35})`)
    .attr('text-anchor', 'middle')
    .text('Demand Per Unit');

  g.append('text')
    .attr('class', 'slider__y-axis-label')
    .attr('transform', `rotate(-90) translate(-${sliderHeight - 15} , 0)`)
    .text('Utilization')

  const circle = g.append('g')
    .selectAll('circle')
    .data(sliderData)
    .enter()
    .append('circle')
    .attr('class', d => `circle p${d.phase.replace(/[^0-9]/g,"").split("").join(" p")}`)
    .attr('transform', d => `translate(${sliderX(d.park_dem)}, ${sliderY(d.util_rate)})`)
    .attr('r', 3.5);

  const brush = d3.brushX()
    .extent([[0, 0], [sliderWidth, sliderHeight]])
    .on('start brush end', () => brushmoved(sliderX, circle, sliderHeight, sliderData));

  const gBrush = g.append('g')
    .attr('class', 'brush')
    .call(brush);

  gBrush.selectAll('.handle--custom')
    .data([{ type: 'w' }, { type: 'e' }])
    .enter().append('path')
    .attr('class', 'handle--custom')
    .attr('fill', '#666')
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#000')
    .attr('stroke-width', 1.5)
    .attr('cursor', 'ew-resize')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(sliderHeight / 2)
      .startAngle(0)
      .endAngle((d, i) => { return i ? Math.PI : -Math.PI; }));

  gBrush.call(brush.move, [0.3, 0.5].map(sliderX));
}

function createTownMap(data) {
  const parkingMap = d3.select('.parking-map');
  const path = d3.geoPath().projection(projection);
  let tooltip = d3.select('.parking-data').append('div')
    .attr('class', 'tooltip');
  parkingMap.append('g')
    .attr('class', 'parking-map__municipalities')
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('fill', '#eee')
    .attr('stroke', '#999')
    .attr('d', path)
    .on('mouseover', (d) => {
      tooltip.style('display', 'inline');
    })
    .on('mousemove', (d) => {
      tooltip.text(d.properties.muni_name.toLowerCase().toTitleCase());
    })
    .on('mouseout', (d) => {
      tooltip.style('display', 'none');
    })
}

function createTrainMap(data) {
  const parkingMap = d3.select('.parking-map');
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

function createRapidTransitMap(data) {
  const parkingMap = d3.select('.parking-map');
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

function createTable(data) {
  const table = d3.select('.parking-table');
  const headerNames = {
    'Site Name': 'prop_name',
    Municipality: 'muni',
    'Parking Supply per Unit': 'park_sup_tot',
    'Parking Demand per Unit': 'park_dem',
    '% Utilization': 'util_rate',
    '% Affordable Units': 'bldg_affp',
    'Walk Score': 'walk_score',
    'Jobs Accessible by Transit': 'b_umn_t30jobs',
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
      if (currentSortState === 'ascending') {
        currentSortState = 'descending';
        rows.sort((a, b) => {
          return sortText(b[headerNames[d]], a[headerNames[d]]);
        });
      } else {
        currentSortState = 'ascending';
        rows.sort((a, b) => {
          return sortText(a[headerNames[d]], b[headerNames[d]]);
        });
      }
    });
  const rows = table.append('tbody')
    .attr('class', 'parking-table__body')
    .selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    .attr('class', "parking-table__data-row")
    .attr('id', d => `block-${d.site_id}`)
    .on('click', d => toggleSelected(d));
  rows.selectAll('td')
    .data(row => [row.prop_name,
      row.muni,
      row.park_sup_tot != "" ? parseFloat(row.park_sup_tot).toFixed(2) : "--",
      parseFloat(row.park_dem).toFixed(2),
      Math.round(+row.util_rate * 100),
      Math.round(+row.bldg_affp * 100),
      row.walk_score,
      row.b_umn_t30jobs != "" ? Number(row.b_umn_t30jobs) : "--"])
    .enter()
    .append('td')
    .text(d => d)
    .attr('class', 'parking-table__data-cell');
}

function refreshVisualization(data){
  // refresh sites visualization
  d3.selectAll('.site').remove();
  d3.selectAll('.parking-map__sites').remove();
  populateMap(data, projection);

  //refresh table representation
  d3.selectAll('thead').remove();
  d3.selectAll('tbody').remove();
  d3.selectAll('tr').remove();
  d3.selectAll('td').remove();
  createTable(data);

  //refresh brush visualization
  d3.select('.slider-group').remove()
  createSlider(data)
}

function createJobMap(data) {
  const colors = d3.scaleOrdinal()
    .domain([1, 2, 3, 4, 5, 6, 7, 8])
    .range(['#ffffff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594']);
  const parkingMap = d3.select('.parking-map');
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

function filterPhaseData(data){
  phaseData = data[1].filter(site => {
    phaseSplit = site.phase.split(" ");
    for(let phaseInd = 0; phaseInd < phaseSplit.length; phaseInd++){
      phaseParse = Number.parseInt(phaseSplit[phaseInd]);
      if(! Number.isNaN(phaseParse) && phases.includes(phaseSplit[phaseInd])){
          return true;
      }
    }
    return false;
  })

  return phaseData;
}

window.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    d3.json('./assets/data/ma-munis.geojson'),
    d3.csv('./assets/data/perfect-fit-parking-data.csv'),
    d3.json('./assets/data/mbta-commuter-rail-lines.json'),
    d3.json('./assets/data/mbta-rapid-transit.json'),
    d3.json('./assets/data/job-categories-topo.json'),
  ]).then((data) => {
    const surveyedMunicipalities = [
      'ARLINGTON',
      'BELMONT',
      'BOSTON',
      'BROOKLINE',
      'CAMBRIDGE',
      'CHELSEA',
      'EVERETT',
      'MALDEN',
      'MEDFORD',
      'MELROSE',
      'MILTON',
      'NEWTON',
      'QUINCY',
      'SOMERVILLE',
      'REVERE',
      'WALTHAM',
      'WATERTOWN',
      'WINTHROP',
      'BEVERLY',
      'CONCORD',
      'DANVERS',
      'LEXINGTON',
      'SALEM',
      'SUDBURY',
      'NEEDHAM',
      'PEABODY',
      'LINCOLN',
      'WAYLAND',
      'WESTON',
      'LYNNFIELD',
      'WAKEFIELD',
      'SAUGUS',
      'LYNN',
      'STONEHAM',
      'WOBURN',
      'WELLESLEY',
      'SWAMPSCOTT',
      'MARBLEHEAD',
      'NAHANT',
      'WINCHESTER'
    ];
    phases = ["1", "2", "3", "4"];

    phaseData = filterPhaseData(data);

    const togglePhaseOne = d3.select('.bp1');

    togglePhaseOne.on('click', (d) => {
      if(phases.includes("1")){
        phases.splice(phases.indexOf("1"), 1);
      }
      else{
        phases.push("1");
      }
      phaseData = filterPhaseData(data);

      refreshVisualization(phaseData);

      togglePhaseOne.classed('toggled__p1', phases.includes("1"));
    })

    const togglePhaseTwo = d3.select('.bp2');

    togglePhaseTwo.on('click', (d) => {
      if(phases.includes("2")){
        phases.splice(phases.indexOf("2"), 1);
      }
      else{
        phases.push("2");
      }
      phaseData = filterPhaseData(data);
      refreshVisualization(phaseData);

      togglePhaseTwo.classed('toggled__p2', phases.includes("2"));
    })

    const togglePhaseThree = d3.select('.bp3');

    togglePhaseThree.on('click', (d) => {
      if(phases.includes("3")){
        phases.splice(phases.indexOf("3"), 1);
      }
      else{
        phases.push("3");
      }
      phaseData = filterPhaseData(data);
      refreshVisualization(phaseData);

      togglePhaseThree.classed('toggled__p3', phases.includes("3"));
    })

    const togglePhaseFour = d3.select('.bp4');

    togglePhaseFour.on('click', (d) => {
      if(phases.includes("4")){
        phases.splice(phases.indexOf("4"), 1);
      }
      else{
        phases.push("4");
      }
      phaseData = filterPhaseData(data);
      refreshVisualization(phaseData);

      togglePhaseFour.classed('toggled__p4', phases.includes("4"));
    })
    const filteredMunicipalities = data[0].features.filter(municipality => surveyedMunicipalities.includes(municipality.properties.muni_name.toUpperCase()));
    const topology = topojson.feature(data[4], data[4].objects['UMN_8cats_ICC_Simp_noLynn']);
    createTownMap(filteredMunicipalities);
    createJobMap(topology.features);
    createTrainMap(data[2]);
    createRapidTransitMap(data[3]);
    createTable(phaseData);
    populateMap(phaseData, projection);
    createSlider(phaseData);
    createTransitMapToggle();
    createJobsMapToggle();
  });
});
