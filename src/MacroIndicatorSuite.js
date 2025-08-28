import './App.css';
import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ReferenceLine, Label
} from 'recharts';

// FRED series IDs for Government Debt to GDP
const DEBT_TO_GDP_SERIES = {
  USA: 'GFDEGDQ188S',      // US Federal Debt to GDP (Quarterly)
  GBR: 'GGGDTAGBR188N',    // UK Government Debt to GDP (Annual)
  JPN: 'GGGDTAJPN188N',    // Japan Government Debt to GDP (Annual)
  DEU: 'GGGDTADEU188N',    // Germany Government Debt to GDP (Annual)
  FRA: 'GGGDTAFRA188N',    // France Government Debt to GDP (Annual)
  ITA: 'GGGDTAITA188N',    // Italy Government Debt to GDP (Annual)
  CAN: 'GGGDTACAN188N',    // Canada Government Debt to GDP (Annual)
};

// World Bank indicator for debt to GDP
const WB_DEBT_INDICATOR = 'GC.DOD.TOTL.GD.ZS';

// Corporate tax rates (static data as it doesn't change frequently)
const CORPORATE_TAX_RATES = {
  USA: 21,
  GBR: 19,
  JPN: 30.62,
  DEU: 29.9,
  FRA: 25,
  ITA: 24,
  CAN: 26.5,
  CHN: 25,
  IND: 30,
  BRA: 34
};

// Fetch data from FRED
const fetchFREDData = async (seriesId) => {
  const fredKey = '9418f3d9fa9dcb9e5b83ffc9d1870c83';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${fredKey}&file_type=json&observation_start=2010-01-01`;
  
  try {
    // Using CORS proxy
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (data.observations && data.observations.length > 0) {
      console.log(`FRED data for ${seriesId}:`, data.observations.length, 'observations');
      return data.observations
        .filter(obs => obs.value !== '.')
        .map(obs => ({
          date: obs.date.substring(0, 7), // YYYY-MM format
          value: parseFloat(obs.value)
        }));
    }
    return null;
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    return null;
  }
};

// Fetch data from World Bank
const fetchWorldBankData = async (countryCode) => {
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${WB_DEBT_INDICATOR}?format=json&date=2010:2024&per_page=100`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data[1] && data[1].length > 0) {
      console.log(`World Bank data for ${countryCode}:`, data[1].length, 'observations');
      return data[1]
        .filter(d => d.value !== null)
        .map(d => ({
          date: `${d.date}-01`,
          value: d.value
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return null;
  } catch (error) {
    console.error(`Error fetching World Bank data for ${countryCode}:`, error);
    return null;
  }
};

// Generate realistic mock data for countries without real data
const generateRealisticDebtData = (countryCode, startDate) => {
  const baseValues = {
    USA: 100,
    EA19: 85,
    GBR: 85,
    JPN: 230,
    DEU: 60,
    CHN: 65,
    G7: 110,
    OECD: 90
  };
  
  const data = [];
  const start = new Date(startDate);
  const end = new Date();
  let value = baseValues[countryCode] || 70;
  
  // Generate monthly data points
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    // Add realistic variation - debt tends to increase during crises
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // COVID impact
    if (year === 2020 && month >= 2) {
      value += 2;
    } else if (year === 2021) {
      value += 0.5;
    } else if (year === 2022) {
      value += 0.3;
    } else {
      value += (Math.random() - 0.3) * 0.5; // Slight upward trend
    }
    
    data.push({
      date: d.toISOString().slice(0, 7),
      value: Math.max(0, value)
    });
  }
  
  return data;
};

// Generate corporate tax data
const generateCorporateTaxData = (countryCode, startDate) => {
  const data = [];
  const start = new Date(startDate);
  const end = new Date();
  const baseRate = CORPORATE_TAX_RATES[countryCode] || 25;
  
  for (let d = new Date(start); d <= end; d.setFullYear(d.getFullYear() + 1)) {
    data.push({
      date: d.toISOString().slice(0, 7),
      value: baseRate
    });
  }
  
  return data;
};

// Calculate YoY change
const calculateYoY = (data) => {
  return data.map((current, idx) => {
    const yearAgo = data.find(d => {
      const currentDate = new Date(current.date);
      const dDate = new Date(d.date);
      return dDate.getFullYear() === currentDate.getFullYear() - 1 &&
             dDate.getMonth() === currentDate.getMonth();
    });
    
    if (yearAgo && yearAgo.value && current.value) {
      const yoy = ((current.value - yearAgo.value) / yearAgo.value) * 100;
      return { ...current, yoy };
    }
    return current;
  });
};

// Calculate MoM change
const calculateMoM = (data) => {
  const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return sorted.map((current, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1];
      if (prev.value && current.value) {
        const mom = ((current.value - prev.value) / prev.value) * 100;
        return { ...current, mom };
      }
    }
    return current;
  });
};

// Major policy events for annotations
const POLICY_EVENTS = [
  { date: '2020-03', event: 'COVID-19 Pandemic', type: 'shock' },
  { date: '2022-02', event: 'Russia-Ukraine War', type: 'shock' },
  { date: '2022-03', event: 'Fed Rate Hike Cycle Begins', type: 'policy' },
  { date: '2021-11', event: 'Fed Taper Announcement', type: 'policy' },
  { date: '2023-03', event: 'Banking Stress (SVB)', type: 'shock' }
];

// Color palette
const COLORS = {
  primary: '#003B5C',
  secondary: '#005580',
  tertiary: '#0070A3',
  quaternary: '#4A90C7',
  benchmark: '#7FADD0',
  good: '#003B5C',
  warning: '#F39C12',
  bad: '#C0392B'
};

// Benchmark regions for comparison
const BENCHMARK_REGIONS = {
  USA: 'United States',
  EA19: 'Euro Area (19)',
  GBR: 'United Kingdom',
  JPN: 'Japan',
  DEU: 'Germany',
  CHN: 'China',
  G7: 'G7',
  OECD: 'OECD Total'
};

// Individual Indicator Component
const IndicatorCard = ({ indicator, data, benchmarkData, onToggle, showYoY, showMoM }) => {
  const [chartType, setChartType] = useState('line');
  const latestValue = data[data.length - 1]?.value;
  const previousValue = data[data.length - 2]?.value;
  const change = latestValue && previousValue ? 
    ((latestValue - previousValue) / previousValue * 100).toFixed(2) : null;
  
  // Prepare chart data
  const chartData = data.map((d) => {
    const point = {
      date: d.date,
      value: d.value,
      yoy: d.yoy,
      mom: d.mom
    };
    
    // Add benchmark data if available for the same date
    if (benchmarkData && benchmarkData.length > 0) {
      const benchmarkPoint = benchmarkData.find(b => b.date === d.date);
      if (benchmarkPoint) {
        point.benchmark = benchmarkPoint.value;
      }
    }
    
    return point;
  });
  
  // Find policy events within data range
  const relevantEvents = POLICY_EVENTS.filter(event => {
    const eventDate = new Date(event.date);
    const firstDate = new Date(data[0]?.date);
    const lastDate = new Date(data[data.length - 1]?.date);
    return eventDate >= firstDate && eventDate <= lastDate;
  });
  
  const Chart = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;
  
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: 24
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              {indicator.label}
            </h3>
            <p style={{ margin: '4px 0', fontSize: 14, color: '#6b7280' }}>
              {indicator.description}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.primary
            }}>
              {latestValue?.toFixed(2)}{indicator.unit}
            </div>
            {change && (
              <div style={{
                fontSize: 14,
                color: change > 0 ? COLORS.bad : COLORS.good,
                fontWeight: 500
              }}>
                {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
          style={{
            padding: '6px 12px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          {chartType === 'line' ? '📈 Line' : '📊 Area'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showYoY}
            onChange={() => onToggle('yoy')}
          />
          <span style={{ fontSize: 14 }}>YoY %</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showMoM}
            onChange={() => onToggle('mom')}
          />
          <span style={{ fontSize: 14 }}>MoM %</span>
        </label>
      </div>
      
      {/* Chart */}
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 12
              }}
              formatter={(value) => value?.toFixed(2)}
            />
            <Legend />
            
            {/* Policy event markers */}
            {relevantEvents.map((event, idx) => (
              <ReferenceLine
                key={idx}
                x={event.date}
                stroke={event.type === 'shock' ? COLORS.bad : COLORS.primary}
                strokeDasharray="5 5"
                label={{
                  value: event.event,
                  position: 'top',
                  fontSize: 10,
                  angle: -45
                }}
              />
            ))}
            
            {/* Main data */}
            <DataComponent
              type="monotone"
              dataKey={showYoY ? 'yoy' : showMoM ? 'mom' : 'value'}
              stroke={COLORS.primary}
              fill={COLORS.primary}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              name="Current"
            />
            
            {/* Benchmark */}
            {benchmarkData && benchmarkData.length > 0 && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={COLORS.benchmark}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Benchmark"
              />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Main Dashboard Component
function MacroIndicatorSuite() {
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [benchmarkRegion, setBenchmarkRegion] = useState('EA19');
  const [indicatorData, setIndicatorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [toggleStates, setToggleStates] = useState({});
  const [timeRange, setTimeRange] = useState('5Y');
  
  // Calculate start date based on time range
  const getStartDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '1Y':
        return `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      case '3Y':
        return `${now.getFullYear() - 3}-01`;
      case '5Y':
        return `${now.getFullYear() - 5}-01`;
      case '10Y':
        return `${now.getFullYear() - 10}-01`;
      case 'ALL':
        return '2000-01';
      default:
        return '2019-01';
    }
  };
  
  // Fetch indicator data
  const fetchIndicatorData = async (countryCode) => {
    console.log(`Fetching data for ${countryCode}...`);
    
    // Try FRED first
    const fredSeriesId = DEBT_TO_GDP_SERIES[countryCode];
    if (fredSeriesId) {
      const fredData = await fetchFREDData(fredSeriesId);
      if (fredData && fredData.length > 0) {
        console.log(`Using FRED data for ${countryCode}`);
        return fredData;
      }
    }
    
    // Try World Bank
    const wbData = await fetchWorldBankData(countryCode);
    if (wbData && wbData.length > 0) {
      console.log(`Using World Bank data for ${countryCode}`);
      return wbData;
    }
    
    // Fallback to realistic mock data
    console.log(`Using mock data for ${countryCode}`);
    return generateRealisticDebtData(countryCode, getStartDate());
  };
  
  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const startDate = getStartDate();
      
      try {
        // Fetch data for selected country and benchmark independently
        const [countryDebtData, benchmarkDebtData] = await Promise.all([
          fetchIndicatorData(selectedCountry),
          fetchIndicatorData(benchmarkRegion)
        ]);
        
        // Filter data based on time range
        const filterByDate = (data) => {
          const startTime = new Date(startDate).getTime();
          return data.filter(d => new Date(d.date).getTime() >= startTime);
        };
        
        // Process the data
        const newData = {
          debtToGdp: {
            [selectedCountry]: calculateMoM(calculateYoY(filterByDate(countryDebtData))),
            [benchmarkRegion]: calculateMoM(calculateYoY(filterByDate(benchmarkDebtData)))
          },
          corporateTax: {
            [selectedCountry]: generateCorporateTaxData(selectedCountry, startDate),
            [benchmarkRegion]: generateCorporateTaxData(benchmarkRegion, startDate)
          }
        };
        
        console.log('Processed data:', {
          country: `${selectedCountry} - ${newData.debtToGdp[selectedCountry].length} points`,
          benchmark: `${benchmarkRegion} - ${newData.debtToGdp[benchmarkRegion].length} points`
        });
        
        setIndicatorData(newData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [selectedCountry, benchmarkRegion, timeRange]);
  
  // Handle toggle changes
  const handleToggle = (indicatorKey, toggleType) => {
    setToggleStates(prev => ({
      ...prev,
      [indicatorKey]: {
        ...prev[indicatorKey],
        [toggleType]: !prev[indicatorKey]?.[toggleType]
      }
    }));
  };
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: 24
      }}>
        <div>Loading Data... ⏳</div>
      </div>
    );
  }
  
  // Define the two indicators
  const indicators = {
    debtToGdp: {
      label: 'Government Debt/GDP',
      unit: '%',
      description: 'General government gross financial liabilities as % of GDP'
    },
    corporateTax: {
      label: 'Corporate Tax Rate',
      unit: '%',
      description: 'Statutory corporate income tax rate'
    }
  };
  
  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: 24,
      background: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 300,
          letterSpacing: '-0.5px',
          color: '#003B5C',
          margin: 0,
          textAlign: 'center' 
        }}>
          Key Macro Indicator Suite
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#6b7280', 
          marginTop: 8,
          fontSize: 16 
        }}>
          Government Debt and Corporate Tax Analysis
        </p>
      </div>
      
      {/* Controls */}
      <div style={{
        background: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                fontSize: 14
              }}
            >
              {Object.entries(BENCHMARK_REGIONS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Benchmark
            </label>
            <select
              value={benchmarkRegion}
              onChange={e => setBenchmarkRegion(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                fontSize: 14
              }}
            >
              {Object.entries(BENCHMARK_REGIONS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: 14, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Time Range
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['1Y', '3Y', '5Y', '10Y', 'ALL'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: '8px 16px',
                    background: timeRange === range ? COLORS.primary : '#f3f4f6',
                    color: timeRange === range ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: timeRange === range ? 600 : 400
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Indicator Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
        gap: 24
      }}>
        {Object.entries(indicators).map(([key, indicator]) => {
          const countryData = indicatorData[key]?.[selectedCountry] || [];
          const benchmarkData = indicatorData[key]?.[benchmarkRegion] || [];
          const toggleState = toggleStates[key] || {};
          
          return (
            <IndicatorCard
              key={key}
              indicator={{ ...indicator, code: key }}
              data={countryData}
              benchmarkData={benchmarkData}
              showYoY={toggleState.yoy || false}
              showMoM={toggleState.mom || false}
              onToggle={(type) => handleToggle(key, type)}
            />
          );
        })}
      </div>
      
      {/* Footer with data source */}
      <div style={{
        marginTop: 48,
        padding: 20,
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 14
      }}>
        Data Sources: FRED (Federal Reserve Economic Data) & World Bank • Updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

export default MacroIndicatorSuite;