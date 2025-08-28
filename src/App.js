// src/App.js
import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, Label
} from 'recharts';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import axios from 'axios';
import MacroIndicatorSuite from './MacroIndicatorSuite';  

// KPI definitions
const INDICATORS = {
  gdp:   { code: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth (YoY %)' },
  cpi:   { code: 'FP.CPI.TOTL.ZG',    label: 'Headline CPI (YoY %)' },
  unemp: { code: 'SL.UEM.TOTL.ZS',    label: 'Unemployment (%)' },
  rate:  { code: 'FR.INR.RINR',       label: 'Policy Rate (%)' },
};

// Colour bands & breaks
const COLOR_BANDS = ['#003B5C','#005580','#0070A3','#4A90C7','#7FADD0'];
const BREAKS = {
  gdp:   [5,3,1,0],
  cpi:   [2,5,10,15],
  unemp: [4,7,10,15],
  rate:  [1,3,5,8]
};

function getBand(key, val) {
  const b = BREAKS[key];
  if (key === 'gdp') {
    if (val >= b[0]) return 0;
    if (val >= b[1]) return 1;
    if (val >= b[2]) return 2;
    if (val >= b[3]) return 3;
    return 4;
  }
  if (val <= b[0]) return 0;
  if (val <= b[1]) return 1;
  if (val <= b[2]) return 2;
  if (val <= b[3]) return 3;
  return 4;
}

// Solid compare colours
const COMPARE_COLORS = ['#003B5C','#005580','#0070A3','#4A90C7'];



// Regional groupings
const REGIONAL_GROUPS = {
  'North America': ['United States', 'Canada', 'Mexico'],
  'Europe': [
    'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
    'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland',
    'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland',
    'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'United Kingdom',
    'Switzerland', 'Norway', 'Iceland', 'Albania', 'Serbia', 'Montenegro',
    'North Macedonia', 'Bosnia and Herzegovina', 'Ukraine', 'Belarus', 'Moldova'
  ],
  'EMEA': [
    // Europe
    'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark',
    'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland',
    'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland',
    'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'United Kingdom',
    'Switzerland', 'Norway', 'Iceland', 'Albania', 'Serbia', 'Montenegro',
    'North Macedonia', 'Bosnia and Herzegovina', 'Ukraine', 'Belarus', 'Moldova',
    // Middle East
    'Saudi Arabia', 'United Arab Emirates', 'Israel', 'Turkiye', 'Iran, Islamic Rep.',
    'Iraq', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Yemen, Rep.',
    'Syrian Arab Republic',
    // Africa
    'Nigeria', 'South Africa', 'Kenya', 'Ethiopia', 'Ghana', 'Tanzania', 'Uganda',
    'Mozambique', 'Madagascar', 'Cameroon', 'Cote d\'Ivoire', 'Niger', 'Burkina Faso',
    'Mali', 'Malawi', 'Zambia', 'Zimbabwe', 'Rwanda', 'Guinea', 'Benin', 'Burundi',
    'Egypt, Arab Rep.', 'Morocco', 'Algeria', 'Tunisia', 'Libya'
  ],
  'East Asia': ['China', 'Japan', 'Korea, Rep.', 'Mongolia'],
  'South Asia': ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Afghanistan'],
  'Southeast Asia': ['Indonesia', 'Thailand', 'Philippines', 'Vietnam', 'Malaysia', 'Singapore', 'Myanmar', 'Cambodia', 'Lao PDR'],
  'Middle East': [
    'Saudi Arabia', 'United Arab Emirates', 'Israel', 'Turkiye', 'Iran, Islamic Rep.',
    'Iraq', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Yemen, Rep.',
    'Syrian Arab Republic'
  ],
  'South America': [
    'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Venezuela, RB',
    'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Guyana', 'Suriname'
  ],
  'Central America': [
    'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Belize'
  ],
  'Caribbean': [
    'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Trinidad and Tobago',
    'Bahamas, The', 'Barbados', 'St. Lucia', 'Grenada', 'St. Vincent and the Grenadines',
    'Antigua and Barbuda', 'Dominica', 'St. Kitts and Nevis'
  ],
  'Sub-Saharan Africa': [
    'Nigeria', 'South Africa', 'Kenya', 'Ethiopia', 'Ghana', 'Tanzania', 'Uganda',
    'Mozambique', 'Madagascar', 'Cameroon', 'Cote d\'Ivoire', 'Niger', 'Burkina Faso',
    'Mali', 'Malawi', 'Zambia', 'Zimbabwe', 'Rwanda', 'Guinea', 'Benin', 'Burundi',
    'South Sudan', 'Togo', 'Sierra Leone', 'Liberia', 'Mauritania',
    'Eritrea', 'Gambia, The', 'Botswana', 'Namibia', 'Gabon', 'Lesotho', 'Guinea-Bissau',
    'Equatorial Guinea', 'Mauritius', 'Eswatini', 'Djibouti', 'Comoros', 'Cabo Verde',
    'Sao Tome and Principe', 'Seychelles', 'Angola', 'Chad', 'Central African Republic',
    'Congo, Rep.', 'Congo, Dem. Rep.', 'Senegal'
  ],
  'North Africa': ['Egypt, Arab Rep.', 'Morocco', 'Algeria', 'Tunisia', 'Libya'],
  'Oceania': ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu']
};

// Common country name mappings
const COUNTRY_NAME_MAP = {
  'United States': 'United States',
  'USA': 'United States',
  'United States of America': 'United States',
  'UK': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Russia': 'Russian Federation',
  'South Korea': 'Korea, Rep.',
  'Korea': 'Korea, Rep.',
  'Egypt': 'Egypt, Arab Rep.',
  'Turkey': 'Turkiye',
  'Czech Republic': 'Czechia',
  'Slovak Republic': 'Slovakia',
  'Ivory Coast': "Cote d'Ivoire",
  'Congo': 'Congo, Rep.',
  'Democratic Republic of the Congo': 'Congo, Dem. Rep.',
  'DRC': 'Congo, Dem. Rep.',
  'Iran': 'Iran, Islamic Rep.',
  'Syria': 'Syrian Arab Republic',
  'Venezuela': 'Venezuela, RB',
  'Yemen': 'Yemen, Rep.',
  'Gambia': 'Gambia, The',
  'Bahamas': 'Bahamas, The',
  'Kyrgyzstan': 'Kyrgyz Republic',
  'Laos': 'Lao PDR',
  'Vietnam': 'Viet Nam',
  'Slovakia': 'Slovak Republic',
  'Macedonia': 'North Macedonia',
  'Bolivia': 'Bolivia',
  'Tanzania': 'Tanzania',
  'Moldova': 'Moldova',
  'Cape Verde': 'Cabo Verde',
  'Swaziland': 'Eswatini'
};

// Reverse mapping for news searches
const REVERSE_COUNTRY_MAP = {};
Object.entries(COUNTRY_NAME_MAP).forEach(([common, official]) => {
  REVERSE_COUNTRY_MAP[official] = common;
});

// Check if a selection is a region
const isRegion = (name) => {
  return REGIONAL_GROUPS.hasOwnProperty(name);
};

// Get all countries for selected regions/countries
const getCountriesForSelection = (selections) => {
  const countries = new Set();
  
  selections.forEach(selection => {
    if (isRegion(selection)) {
      // Add all countries in the region
      REGIONAL_GROUPS[selection].forEach(country => countries.add(country));
    } else if (selection !== 'World') {
      // Single country
      countries.add(selection);
    }
  });
  
  return Array.from(countries);
};

// Choropleth Map Component
function ChoroplethMap({ data, selectedMetric, onCountryClick, selectedRegions, compareMode }) {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [geoData, setGeoData] = useState(null);

  // Load world map GeoJSON
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries);
        setGeoData(countries);
      })
      .catch(err => console.error('Error loading map data:', err));
  }, []);

  // Render map
  useEffect(() => {
    if (!geoData || !data) return;

    const width = 960;
    const height = 500;
    
    // Clear previous map
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('font-family', 'Inter, -apple-system, sans-serif');

    // Create comprehensive mapping for country data
    const countryDataMap = {};
    const countryNameToData = {};
    
    // Build multiple lookup maps
    if (Array.isArray(data)) {
      data.forEach(d => {
        if (d && d.value !== null && d.country) {
          const countryInfo = {
            value: d.value,
            name: d.country.value,
            iso2: d.country.id,
            iso3: d.countryiso3code
          };
          
          // Map by ISO codes
          if (d.countryiso3code) {
            countryDataMap[d.countryiso3code] = countryInfo;
            countryDataMap[d.countryiso3code.toUpperCase()] = countryInfo;
          }
          if (d.country.id) {
            countryDataMap[d.country.id] = countryInfo;
            countryDataMap[d.country.id.toUpperCase()] = countryInfo;
          }
          
          // Map by country name
          if (d.country.value) {
            countryNameToData[d.country.value] = countryInfo;
            countryNameToData[d.country.value.toLowerCase()] = countryInfo;
            
            // Add common variations
            Object.entries(COUNTRY_NAME_MAP).forEach(([alias, official]) => {
              if (official === d.country.value) {
                countryNameToData[alias] = countryInfo;
                countryNameToData[alias.toLowerCase()] = countryInfo;
              }
            });
          }
        }
      });
    }

    // Determine coloring logic
    const showWorld = selectedRegions.length === 1 && selectedRegions[0] === 'World';
    const selectedCountries = showWorld ? null : getCountriesForSelection(selectedRegions);
    
    // Create a mapping of country to its selection index for compare mode
    const countryToSelectionIndex = {};
    if (!showWorld) {
      selectedRegions.forEach((selection, idx) => {
        if (isRegion(selection)) {
          REGIONAL_GROUPS[selection].forEach(country => {
            countryToSelectionIndex[country] = idx;
            countryToSelectionIndex[country.toLowerCase()] = idx;
          });
        } else {
          countryToSelectionIndex[selection] = idx;
          countryToSelectionIndex[selection.toLowerCase()] = idx;
        }
      });
    }

    const projection = d3.geoNaturalEarth1()
      .scale(150)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Draw countries
    const countries = svg.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const props = d.properties;
        let countryData = null;
        let matchedName = null;
        
        // Try different properties to find country data
        const tryProperties = [
          props.ISO_A3, props.iso_a3, props.ADM0_A3, props.GU_A3,
          props.ISO_A2, props.iso_a2,
          props.NAME, props.name, props.ADMIN, props.admin,
          props.NAME_EN, props.name_en
        ];
        
        // First try ISO codes
        for (const prop of tryProperties) {
          if (prop && countryDataMap[prop]) {
            countryData = countryDataMap[prop];
            matchedName = countryData.name;
            break;
          }
          if (prop && countryDataMap[prop?.toUpperCase()]) {
            countryData = countryDataMap[prop.toUpperCase()];
            matchedName = countryData.name;
            break;
          }
        }
        
        // Then try names
        if (!countryData) {
          for (const prop of tryProperties) {
            if (prop && countryNameToData[prop]) {
              countryData = countryNameToData[prop];
              matchedName = countryData.name;
              break;
            }
            if (prop && countryNameToData[prop?.toLowerCase()]) {
              countryData = countryNameToData[prop.toLowerCase()];
              matchedName = countryData.name;
              break;
            }
            // Try mapping variations
            if (prop && COUNTRY_NAME_MAP[prop]) {
              const mapped = COUNTRY_NAME_MAP[prop];
              if (countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()]) {
                countryData = countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()];
                matchedName = countryData.name;
                break;
              }
            }
          }
        }

        // Determine color
        if (showWorld) {
          // World selected - show all countries with heat map colors
          if (countryData && countryData.value !== null) {
            const band = getBand(selectedMetric, countryData.value);
            return COLOR_BANDS[band];
          }
          return '#ddd'; // No data
        } else {
          // Specific countries/regions selected - only color those
          if (!matchedName || (!selectedCountries.includes(matchedName) && 
              !countryToSelectionIndex.hasOwnProperty(matchedName) && 
              !countryToSelectionIndex.hasOwnProperty(matchedName?.toLowerCase()))) {
            // Country not in selection - grey
            return '#ddd';
          }
          
          if (compareMode) {
            // Compare mode - use consistent colors based on selection order
            const idx = countryToSelectionIndex[matchedName] ?? 
                       countryToSelectionIndex[matchedName?.toLowerCase()];
            if (idx !== undefined) {
              return COMPARE_COLORS[idx % COMPARE_COLORS.length];
            }
            return '#ddd';
          } else {
            // Single selection mode - use heat map colors for selected countries only
            if (countryData && countryData.value !== null) {
              const band = getBand(selectedMetric, countryData.value);
              return COLOR_BANDS[band];
            }
            return '#ddd';
          }
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer');

    // Add interactivity
    countries
      .on('mouseover', function(event, d) {
        const props = d.properties;
        let countryData = null;
        let displayName = props.NAME || props.name || props.ADMIN || 'Unknown';
        
        // Find data using same logic as fill
        const tryProperties = [
          props.ISO_A3, props.iso_a3, props.ADM0_A3, props.GU_A3,
          props.ISO_A2, props.iso_a2,
          props.NAME, props.name, props.ADMIN, props.admin
        ];
        
        for (const prop of tryProperties) {
          if (prop && (countryDataMap[prop] || countryDataMap[prop?.toUpperCase()])) {
            countryData = countryDataMap[prop] || countryDataMap[prop.toUpperCase()];
            displayName = countryData.name;
            break;
          }
          if (prop && (countryNameToData[prop] || countryNameToData[prop?.toLowerCase()])) {
            countryData = countryNameToData[prop] || countryNameToData[prop.toLowerCase()];
            displayName = countryData.name;
            break;
          }
          if (prop && COUNTRY_NAME_MAP[prop]) {
            const mapped = COUNTRY_NAME_MAP[prop];
            if (countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()]) {
              countryData = countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()];
              displayName = countryData.name;
              break;
            }
          }
        }
        
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style('display', 'block')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px')
          .html(`
            <strong>${displayName}</strong><br/>
            ${INDICATORS[selectedMetric].label}: ${countryData?.value?.toFixed(2) || 'N/A'}%
          `);
        
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
      })
      .on('mouseout', function(event, d) {
        d3.select(tooltipRef.current).style('display', 'none');
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
      })
      .on('click', function(event, d) {
        const props = d.properties;
        let clickedCountryName = null;
        
        // Find the correct country name from our data
        const tryProperties = [
          props.ISO_A3, props.iso_a3, props.ADM0_A3, props.GU_A3,
          props.ISO_A2, props.iso_a2,
          props.NAME, props.name, props.ADMIN, props.admin
        ];
        
        for (const prop of tryProperties) {
          if (prop && (countryDataMap[prop] || countryDataMap[prop?.toUpperCase()])) {
            const data = countryDataMap[prop] || countryDataMap[prop.toUpperCase()];
            clickedCountryName = data.name;
            break;
          }
          if (prop && (countryNameToData[prop] || countryNameToData[prop?.toLowerCase()])) {
            const data = countryNameToData[prop] || countryNameToData[prop.toLowerCase()];
            clickedCountryName = data.name;
            break;
          }
          if (prop && COUNTRY_NAME_MAP[prop]) {
            const mapped = COUNTRY_NAME_MAP[prop];
            if (countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()]) {
              const data = countryNameToData[mapped] || countryNameToData[mapped.toLowerCase()];
              clickedCountryName = data.name;
              break;
            }
          }
        }
        
        if (clickedCountryName && onCountryClick) {
          onCountryClick(clickedCountryName);
        }
      });

    // Add legend on the right side (only show if not in compare mode or if World is selected)
    if (!compareMode || showWorld) {
      const legendWidth = 20;
      const legendHeight = 200;
      const legendX = width - 100;
      const legendY = (height - legendHeight) / 2;
      
      const legend = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      // Legend gradient
      const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'legend-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      COLOR_BANDS.forEach((color, i) => {
        gradient.append('stop')
          .attr('offset', `${i * 25}%`)
          .attr('stop-color', color);
      });

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#legend-gradient)')
        .style('stroke', '#333')
        .style('stroke-width', 1);

      // Legend labels
      const b = BREAKS[selectedMetric];
      const labels = selectedMetric === 'gdp' 
        ? [`>${b[0]}%`, `${b[1]}%`, `${b[2]}%`, `${b[3]}%`, `<${b[3]}%`]
        : [`<${b[0]}%`, `${b[1]}%`, `${b[2]}%`, `${b[3]}%`, `>${b[3]}%`];

      labels.forEach((label, i) => {
        legend.append('text')
          .attr('x', legendWidth + 5)
          .attr('y', i * legendHeight / 4)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .text(label);
      });
    }

  }, [geoData, data, selectedMetric, onCountryClick, selectedRegions, compareMode]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          display: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      ></div>
    </div>
  );
}

function App() {
  const [rawData, setRawData]         = useState([]);
  const [kpiData, setKpiData]         = useState({});
  const [mapData, setMapData]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [regions, setRegions]         = useState(['World']);
  const [chartType, setChartType]     = useState('line');
  const [showChart, setShowChart]     = useState(true);
  const [filterText, setFilterText]   = useState('');
  const [mapMetric, setMapMetric]     = useState('gdp');
  const [allIndicatorData, setAllIndicatorData] = useState({});
  const [showMacroIndicators, setShowMacroIndicators] = useState(false);

  // 1) Fetch full GDP timeseries
  useEffect(() => {
    fetch(
      `https://api.worldbank.org/v2/country/all/indicator/${INDICATORS.gdp.code}` +
      `?format=json&per_page=20000`
    )
      .then(r => r.json())
      .then(j => {
        setRawData(j[1] || []);
        setLoading(false);
      });
  }, []);

  // 2) Fetch latest KPI values when region changes
  useEffect(() => {
    if (!rawData.length) return;
    
    // For World, use global aggregate
    if (regions.length === 1 && regions[0] === 'World') {
      fetch(`https://api.worldbank.org/v2/country/WLD/indicator/${INDICATORS.gdp.code}?format=json&per_page=1`)
        .then(r => r.json())
        .then(j => {
          Promise.all(Object.entries(INDICATORS).map(([key,{code}]) =>
            fetch(`https://api.worldbank.org/v2/country/WLD/indicator/${code}?format=json&per_page=1`)
              .then(r => r.json())
              .then(j => ({ key, value: j[1]?.[0]?.value }))
          ))
          .then(results => {
            const obj = {};
            results.forEach(({key,value})=> obj[key]=value);
            setKpiData(obj);
          });
        });
      return;
    }
    
    // For single country selection
    if (!compareMode && regions.length === 1 && !isRegion(regions[0])) {
      const iso = rawData.find(d => d.country.value === regions[0])?.countryiso3code;
      
      if (!iso) return;
      
      Promise.all(Object.entries(INDICATORS).map(([key,{code}]) =>
        fetch(`https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&per_page=1`)
          .then(r => r.json())
          .then(j => ({ key, value: j[1]?.[0]?.value }))
      ))
      .then(results => {
        const obj = {};
        results.forEach(({key,value})=> obj[key]=value);
        setKpiData(obj);
      })
      .catch(err => console.error(err));
    } else {
      // For regions or compare mode, calculate averages
      const countries = getCountriesForSelection(regions);
      const countryISOs = countries
        .map(country => rawData.find(d => d.country.value === country)?.countryiso3code)
        .filter(iso => iso);
      
      if (countryISOs.length === 0) {
        setKpiData({});
        return;
      }
      
      Promise.all(Object.entries(INDICATORS).map(async ([key, {code}]) => {
        const countryData = await Promise.all(
          countryISOs.map(iso =>
            fetch(`https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&per_page=1`)
              .then(r => r.json())
              .then(j => j[1]?.[0]?.value)
              .catch(() => null)
          )
        );
        
        const validData = countryData.filter(v => v !== null && v !== undefined);
        const avg = validData.length > 0 
          ? validData.reduce((a, b) => a + b, 0) / validData.length 
          : null;
        
        return { key, value: avg };
      }))
      .then(results => {
        const obj = {};
        results.forEach(({key,value})=> obj[key]=value);
        setKpiData(obj);
      });
    }
  }, [regions, rawData, compareMode]);

  // 3) Fetch map data for selected metric
  useEffect(() => {
    if (loading) return;
    
    const currentYear = new Date().getFullYear();
    const yearsToTry = Array.from({length: 5}, (_, i) => currentYear - i - 1);
    
    const fetchDataForYear = async (year) => {
      try {
        const response = await fetch(
          `https://api.worldbank.org/v2/country/all/indicator/${INDICATORS[mapMetric].code}` +
          `?format=json&per_page=500&date=${year}`
        );
        const json = await response.json();
        return json[1] || [];
      } catch (err) {
        console.error(`Error fetching data for ${year}:`, err);
        return [];
      }
    };
    
    const tryYears = async () => {
      for (const year of yearsToTry) {
        const data = await fetchDataForYear(year);
        const filteredData = data.filter(d => 
          d && d.country && !aggregateRegions.includes(d.country.value)
        );
        if (filteredData.length > 0) {
          setMapData(filteredData);
          break;
        }
      }
    };
    
    tryYears();
  }, [mapMetric, loading]);

  // 4) Fetch all indicator data for selected regions - FIXED for continuous data
  useEffect(() => {
    if (!regions.length || loading) return;
    
    const fetchAllIndicators = async () => {
      const indicatorPromises = regions.map(async (region) => {
        if (region === 'World') {
          return Promise.all(
            Object.entries(INDICATORS).map(([key, {code}]) =>
              fetch(`https://api.worldbank.org/v2/country/WLD/indicator/${code}?format=json&per_page=30&date=2015:2024`)
                .then(r => r.json())
                .then(j => ({
                  key,
                  region: 'World',
                  data: j[1] || []
                }))
            )
          );
        } else if (isRegion(region)) {
          // For regions, fetch data for all countries and calculate averages
          const regionCountries = REGIONAL_GROUPS[region];
          const regionISOs = regionCountries
            .map(country => rawData.find(d => d.country.value === country)?.countryiso3code)
            .filter(iso => iso);
          
          if (regionISOs.length === 0) return [];
          
          return Promise.all(
            Object.entries(INDICATORS).map(async ([key, {code}]) => {
              // Fetch data for all countries in the region
              const allCountryData = await Promise.all(
                regionISOs.map(iso =>
                  fetch(`https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&per_page=30&date=2015:2024`)
                    .then(r => r.json())
                    .then(j => j[1] || [])
                    .catch(() => [])
                )
              );
              
              // Aggregate by year
              const yearlyData = {};
              allCountryData.forEach(countryData => {
                countryData.forEach(d => {
                  if (d.value !== null) {
                    if (!yearlyData[d.date]) {
                      yearlyData[d.date] = [];
                    }
                    yearlyData[d.date].push(d.value);
                  }
                });
              });
              
              // Calculate averages
              const aggregatedData = Object.entries(yearlyData)
                .map(([year, values]) => ({
                  date: parseInt(year),
                  value: values.reduce((a, b) => a + b, 0) / values.length,
                  country: { value: region }
                }))
                .sort((a, b) => a.date - b.date);
              
              return {
                key,
                region,
                data: aggregatedData
              };
            })
          );
        } else {
          // Single country
          const iso = rawData.find(d => d.country.value === region)?.countryiso3code;
          if (!iso) return [];
          
          return Promise.all(
            Object.entries(INDICATORS).map(([key, {code}]) =>
              fetch(`https://api.worldbank.org/v2/country/${iso}/indicator/${code}?format=json&per_page=30&date=2015:2024`)
                .then(r => r.json())
                .then(j => ({
                  key,
                  region,
                  data: j[1] || []
                }))
                .catch(() => ({ key, region, data: [] }))
            )
          );
        }
      });
      
      const results = await Promise.all(indicatorPromises);
      
      // Organize data by indicator
      const organized = {};
      Object.keys(INDICATORS).forEach(key => {
        organized[key] = {};
        regions.forEach(region => {
          organized[key][region] = [];
        });
      });
      
      results.forEach(regionResults => {
        regionResults.forEach(({key, region, data}) => {
          organized[key][region] = data;
        });
      });
      
      setAllIndicatorData(organized);
    };
    
    fetchAllIndicators();
  }, [regions, loading, rawData]);

  if (loading) return <div style={{padding:40,textAlign:'center'}}>Loading…</div>;

  // Available regions - filter out aggregate regions
  const aggregateRegions = [
    'East Asia & Pacific', 'Europe & Central Asia', 
    'Latin America & Caribbean', 'Middle East & North Africa',
    'South Asia', 'Sub-Saharan Africa',
    'European Union', 'OECD members', 'Euro area',
    'Arab World', 'Central Europe and the Baltics',
    'Caribbean small states', 'East Asia & Pacific (excluding high income)',
    'East Asia & Pacific (IDA & IBRD countries)',
    'Euro area', 'Europe & Central Asia (excluding high income)',
    'Europe & Central Asia (IDA & IBRD countries)',
    'Fragile and conflict affected situations',
    'Heavily indebted poor countries (HIPC)',
    'High income', 'IBRD only', 'IDA & IBRD total',
    'IDA blend', 'IDA only', 'IDA total',
    'Latin America & Caribbean (excluding high income)',
    'Latin America & the Caribbean (IDA & IBRD countries)',
    'Least developed countries: UN classification',
    'Low & middle income', 'Low income', 'Lower middle income',
    'Middle East & North Africa (excluding high income)',
    'Middle East & North Africa (IDA & IBRD countries)',
    'Middle income', 'Not classified',
    'Other small states', 'Pacific island small states',
    'Post-demographic dividend', 'Pre-demographic dividend',
    'Small states', 'South Asia (IDA & IBRD)',
    'Sub-Saharan Africa (excluding high income)',
    'Sub-Saharan Africa (IDA & IBRD countries)',
    'Upper middle income'
  ];

  // Get selectable options
  const countries = Array.from(new Set(rawData.map(d=>d.country.value)))
    .filter(region => !aggregateRegions.includes(region) && region !== 'World')
    .sort();
  
  const selectableRegions = [...Object.keys(REGIONAL_GROUPS).sort(), ...countries];
  
  const allOptions = compareMode 
    ? selectableRegions 
    : ['World', ...Object.keys(REGIONAL_GROUPS).sort(), ...countries];

  const visibleRegions = compareMode
    ? selectableRegions.filter(r => r.toLowerCase().includes(filterText.toLowerCase()))
    : allOptions.filter(r => r.toLowerCase().includes(filterText.toLowerCase()));

  // Build comparison matrix
  const matrix = regions.map(region => {
    const vals = Object.keys(INDICATORS).map(key => {
      const regionData = allIndicatorData[key]?.[region] || [];
      const mostRecent = regionData
        .filter(d => d.value !== null)
        .sort((a, b) => b.date - a.date)[0];
      return mostRecent?.value ?? null;
    });
    
    return { region, vals };
  });

  // Prepare chart data - FIXED to eliminate duplicate years
const selectedIndicatorData = allIndicatorData[chartType === 'line' || chartType === 'bar' ? 'gdp' : mapMetric] || {};

// Get unique years across all selected regions
const yearSet = new Set();
Object.values(selectedIndicatorData).forEach(regionData => {
  regionData.forEach(d => {
    if (d && d.date) {
      yearSet.add(d.date);
    }
  });
});

// Convert to array and filter to 2020-2024
const years = Array.from(yearSet)
  .filter(year => year >= 2020 && year <= 2024)
  .sort()
  .reduce((unique, year) => {
    // Extra safety: only add if not already in array
    if (!unique.includes(year)) {
      unique.push(year);
    }
    return unique;
  }, []);

const chartData = years.map(year => {
  const row = { year };
  regions.forEach(r => {
    const regionData = selectedIndicatorData[r] || [];
    // Find the FIRST occurrence of this year's data
    const yearData = regionData.find(d => d.date === year);
    row[r] = yearData?.value ?? null;
  });
  return row;
});
  // Handle country click from map
  const handleCountryClick = (countryName) => {
    if (!compareMode) {
      setRegions([countryName]);
    } else if (!regions.includes(countryName) && regions.length < 4) {
      setRegions([...regions, countryName]);
    }
  };
  return (
    <div style={{fontFamily:'Inter, -apple-system, sans-serif',maxWidth:1200,margin:'0 auto',padding:20}}>
      <h1 style={{
  textAlign:'center',
  fontSize: 36,
  fontWeight: 300,
  letterSpacing: '-0.5px',
  color: '#003B5C',
  marginBottom: 32
}}>
  Macro KPI & Comparison Dashboard
</h1>

      {/* KPI Banner */}
      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        {Object.entries(INDICATORS).map(([key,{label}],i)=>{
          const val = kpiData[key];
          const band = val !== null ? getBand(key, val) : null;
          return (
            <div key={key} style={{
              flex:1,
              background: band !== null ? COLOR_BANDS[band] : '#F8F9FA',
              color: band !== null ? '#fff' : '#003B5C',  // White for colored bands, dark blue for light background
              padding:'12px 8px',
              borderRadius:8,
              textAlign:'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              transform: mapMetric === key ? 'scale(1.05)' : 'scale(1)'
            }}
            onClick={() => setMapMetric(key)}
            >
              <div style={{fontSize:12,opacity:0.8}}>{label}</div>
              <div style={{fontSize:24,fontWeight:'bold',marginTop:4}}>
                {val!=null?val.toFixed(2):'—'}%
              </div>
              {isRegion(regions[0]) && regions.length === 1 && (
                <div style={{fontSize:10,opacity:0.7,marginTop:2}}>
                  (Regional Avg)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Choropleth Map */}
      <div style={{ marginBottom: 24, background: '#F8F9FA', padding: 20, borderRadius: 8 }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginTop: 0,
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: '#003B5C'
        }}>
  Global {INDICATORS[mapMetric].label} Map
</h2>
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <label>Select Metric: </label>
          <select 
            value={mapMetric} 
            onChange={e => setMapMetric(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 14 }}
          >
            {Object.entries(INDICATORS).map(([key, {label}]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <ChoroplethMap 
          data={mapData} 
          selectedMetric={mapMetric}
          selectedRegions={regions}
          compareMode={compareMode}
          onCountryClick={handleCountryClick}
        />
        <p style={{ textAlign: 'center', fontSize: 12, color: '#003B5C', marginTop: 8 }}>
          Click on a country to select it for detailed analysis
          {compareMode && ' (Compare mode: selected countries/regions shown in chart colors)'}
        </p>
      </div>

      {/* Macro Indicators Suite */}
      {showMacroIndicators && <MacroIndicatorSuite />}

      {/* Controls */}
      <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
        <label>
          <input type="checkbox" checked={compareMode}
            onChange={e=>{
              setCompareMode(e.target.checked);
              if (!e.target.checked) {
                setRegions(['World']);
              } else {
                setRegions([]);
              }
              setFilterText('');
            }}
          /> Compare Mode
        </label>
        {compareMode && (
          <input
            placeholder="Search country or region…"
            value={filterText}
            onChange={e=>setFilterText(e.target.value)}
            style={{flex:1,padding:4}}
          />
        )}
        {compareMode
          ? <div style={{
              flex:'2 1 auto',
              maxHeight:150,
              overflowY:'auto',
              border:'1px solid #ccc',padding:8
            }}>
              {visibleRegions.map(r=>(
                <label key={r} style={{display:'block',margin:'2px 0'}}>
                  <input type="checkbox"
                    checked={regions.includes(r)}
                    disabled={!regions.includes(r)&&regions.length>=4}
                    onChange={()=>
                      setRegions(prev=>prev.includes(r)
                        ?prev.filter(x=>x!==r)
                        :[...prev,r]
                      )
                    }
                  /> {r} {isRegion(r) ? '(Region)' : ''}
                </label>
              ))}
            </div>
          : <select
              value={regions[0]}
              onChange={e=>setRegions([e.target.value])}
              style={{flex:1,padding:4}}
            >
              <optgroup label="Global">
                <option value="World">World</option>
              </optgroup>
              <optgroup label="Regions">
                {Object.keys(REGIONAL_GROUPS).sort().map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
              <optgroup label="Countries">
                {countries.map(r=><option key={r} value={r}>{r}</option>)}
              </optgroup>
            </select>
      }
<label>
  <input type="checkbox" checked={showChart}
    onChange={e=>setShowChart(e.target.checked)}
  /> Show Chart
</label>
<label>
  <input type="checkbox" checked={showMacroIndicators}
    onChange={e=>setShowMacroIndicators(e.target.checked)}
  /> Show Macro Indicators
</label>
<label>  {/* ADD THIS OPENING LABEL TAG */}
  Chart Type:{' '}
  <select
    value={chartType}
    onChange={e=>setChartType(e.target.value)}
  >
    <option value="line">Line</option>
    <option value="bar">Bar</option>
  </select>
</label>
</div>

      {/* Comparison Matrix */}
      {(compareMode && regions.length > 0) && (
        <div style={{overflowX:'auto', marginBottom:20}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:'600px'}}>
            <thead>
              <tr>
                <th style={{
                  border:'1px solid #ccc',
                  padding:8,
                  background:'#F8F9FA',
                  textAlign:'left',
                  minWidth:'150px'
                }}>Selection</th>
                {Object.values(INDICATORS).map(ind=>(
                  <th key={ind.code}
                      style={{
                        border:'1px solid #ccc',
                        padding:8,
                        background:'#F8F9FA',
                        textAlign:'center'
                      }}>
                    {ind.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({region,vals}, regionIdx)=>(
                <tr key={region}>
                  <td style={{
                    padding:8,
                    fontWeight:'bold',
                    background: COMPARE_COLORS[regionIdx % COMPARE_COLORS.length],
                    color: '#fff',
                    border:'1px solid #ccc'
                  }}>
                    {region} {isRegion(region) ? '(Region)' : ''}
                  </td>
                  {vals.map((v,j)=>{
                    const indicator = Object.keys(INDICATORS)[j];
                    const band = v !== null ? getBand(indicator, v) : null;
                    return (
                      <td key={j} style={{
                        padding:8,
                        background: band !== null ? COLOR_BANDS[band] : '#F8F9FA',
                        color: band !== null ? '#fff' : '#999',
                        textAlign:'center',
                        border:'1px solid #ccc'
                      }}>
                        {v!=null?v.toFixed(2):'—'}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chart */}
      {showChart && chartData.length > 0 && (
        <div>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: 8,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: '#003B5C'
          }}>
            {chartType === 'line' ? 'GDP Growth Over Time (Line Chart)' : 'GDP Growth Over Time (Bar Chart)'}
          </h2>
          <div style={{height:350}}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType==='line'
                ? <LineChart data={chartData} margin={{top:20,right:30,bottom:20,left:0}}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="year">
                      <Label value="Year" position="insideBottom" offset={-5} />
                    </XAxis>
                    <YAxis unit="%" >
                      <Label value="Growth (%)" angle={-90} position="insideLeft" offset={10}/>
                    </YAxis>
                    <Tooltip/>
                    <Legend verticalAlign="top" />
                    {regions.map((r,i)=>(
                      <Line key={r}
                        dataKey={r}
                        name={r}
                        stroke={COMPARE_COLORS[i%COMPARE_COLORS.length]}
                        strokeWidth={3}
                        dot={{ r:4 }}
                        type="monotone"
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                : <BarChart data={chartData} margin={{top:20,right:30,bottom:20,left:0}}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="year">
                      <Label value="Year" position="insideBottom" offset={-5} />
                    </XAxis>
                    <YAxis unit="%" >
                      <Label value="Growth (%)" angle={-90} position="insideLeft" offset={10}/>
                    </YAxis>
                    <Tooltip/>
                    <Legend verticalAlign="top" />
                    {regions.map((r,i)=>(
                      <Bar key={r}
                        dataKey={r}
                        name={r}
                        fill={COMPARE_COLORS[i%COMPARE_COLORS.length]}
                        barSize={20}
                      />
                    ))}
                  </BarChart>
              }
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;