// dataService.js - Centralized data fetching service

const API_KEYS = {
  FRED: process.env.REACT_APP_FRED_API_KEY,
  ALPHA_VANTAGE: process.env.REACT_APP_ALPHA_VANTAGE_KEY,
  WORLD_BANK: process.env.REACT_APP_WORLD_BANK_API,
  OECD: process.env.REACT_APP_OECD_API,
  IMF: process.env.REACT_APP_IMF_API
};

// FRED Data Fetching
export const fetchFREDData = async (seriesId, startDate, endDate) => {
  const baseUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEYS.FRED}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
  const url = `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.observations;
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    return [];
  }
};

// World Bank Data Fetching
export const fetchWorldBankData = async (countryCode, indicatorCode, startYear, endYear) => {
  const url = `${API_KEYS.WORLD_BANK}/country/${countryCode}/indicator/${indicatorCode}?format=json&date=${startYear}:${endYear}&per_page=1000`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data[1] || [];
  } catch (error) {
    console.error(`Error fetching World Bank data:`, error);
    return [];
  }
};

// OECD Data Fetching
export const fetchOECDData = async (dataset, countries, indicator) => {
  const countryString = countries.join('+');
  const baseUrl = `${API_KEYS.OECD}/${dataset}/${countryString}.${indicator}/all?startTime=2015&endTime=2024`;
  const url = `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return parseOECDResponse(data);
  } catch (error) {
    console.error(`Error fetching OECD data:`, error);
    return {};
  }
};

// Helper function to parse OECD response
const parseOECDResponse = (data) => {
  if (!data || !data.dataSets || !data.dataSets[0]) return {};
  
  const dataset = data.dataSets[0];
  const dimensions = data.structure.dimensions.observation;
  const timeDim = dimensions.find(d => d.id === 'TIME_PERIOD');
  const countryDim = dimensions.find(d => d.id === 'LOCATION');
  
  const result = {};
  
  // Parse observations
  Object.entries(dataset.observations).forEach(([key, value]) => {
    const indices = key.split(':').map(Number);
    const countryIndex = indices[0];
    const timeIndex = indices[dimensions.findIndex(d => d.id === 'TIME_PERIOD')];
    
    if (countryDim && timeDim) {
      const country = countryDim.values[countryIndex].id;
      const time = timeDim.values[timeIndex].id;
      
      if (!result[country]) result[country] = [];
      result[country].push({
        date: time,
        value: value[0]
      });
    }
  });
  
  return result;
};

// Indicator mapping
export const INDICATOR_SOURCES = {
  gdpGrowth: {
    source: 'WORLD_BANK',
    code: 'NY.GDP.MKTP.KD.ZG',
    fredCode: 'NYGDPMKTPKDWB'
  },
  cpiHeadline: {
    source: 'FRED',
    code: 'CPIAUCSL',
    worldBankCode: 'FP.CPI.TOTL.ZG'
  },
  cpiCore: {
    source: 'FRED',
    code: 'CPILFESL'
  },
  ppi: {
    source: 'FRED',
    code: 'PPIACO'
  },
  unemployment: {
    source: 'WORLD_BANK',
    code: 'SL.UEM.TOTL.ZS',
    fredCode: 'UNRATE'
  },
  policyRate: {
    source: 'FRED',
    code: 'DFF', // Fed Funds Rate
    worldBankCode: 'FR.INR.RINR'
  },
  m2: {
    source: 'FRED',
    code: 'M2SL'
  },
  centralBankBalance: {
    source: 'FRED',
    code: 'WALCL' // Fed balance sheet
  },
  tradeBalance: {
    source: 'FRED',
    code: 'BOPGSTB'
  },
  debtToGdp: {
    source: 'OECD',
    dataset: 'EO',
    code: 'GGFL'
  },
  corporateTax: {
    source: 'OECD',
    dataset: 'TABLE_II1',
    code: 'CORP_TAX'
  },
  consumerConfidence: {
    source: 'FRED',
    code: 'UMCSENT'
  }
};

// Main function to fetch all indicators for a country
export const fetchAllIndicators = async (countryCode, startDate, endDate) => {
  const results = {};
  
  for (const [indicator, config] of Object.entries(INDICATOR_SOURCES)) {
    try {
      let data;
      
      switch (config.source) {
        case 'FRED':
          data = await fetchFREDData(config.code, startDate, endDate);
          break;
        case 'WORLD_BANK':
          const startYear = new Date(startDate).getFullYear();
          const endYear = new Date(endDate).getFullYear();
          data = await fetchWorldBankData(countryCode, config.code, startYear, endYear);
          break;
        case 'OECD':
          const oecdData = await fetchOECDData(config.dataset, [countryCode], config.code);
          data = oecdData[countryCode] || [];
          break;
        default:
          data = [];
      }
      
      results[indicator] = data;
    } catch (error) {
      console.error(`Error fetching ${indicator}:`, error);
      results[indicator] = [];
    }
  }
  
  return results;
};

// Test connection function
export const testDataConnections = async () => {
  console.log('Testing data connections...');
  
  // Test World Bank
  try {
    const wbData = await fetchWorldBankData('USA', 'NY.GDP.MKTP.KD.ZG', 2023, 2023);
    console.log('✅ World Bank API: Connected', wbData.length > 0 ? '(Data received)' : '(No data)');
  } catch (error) {
    console.log('❌ World Bank API: Failed');
  }
  
  // Test FRED
  try {
    const fredData = await fetchFREDData('GDP', '2023-01-01', '2023-12-31');
    console.log('✅ FRED API: Connected', fredData.length > 0 ? '(Data received)' : '(No data)');
  } catch (error) {
    console.log('❌ FRED API: Failed - Check your API key');
  }
  
  // Test OECD
  try {
    const oecdData = await fetchOECDData('MEI', ['USA'], 'CPALTT01');
    console.log('✅ OECD API: Connected', Object.keys(oecdData).length > 0 ? '(Data received)' : '(No data)');
  } catch (error) {
    console.log('❌ OECD API: Failed');
  }
};