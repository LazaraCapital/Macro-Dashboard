// testConnection.js - Test API connections
import { testDataConnections, fetchAllIndicators } from './dataService.js';

// Run the connection test
console.log('Starting API connection tests...\n');

// Test basic connections
testDataConnections().then(() => {
  console.log('\n--- Connection tests complete ---\n');
  
  // Test fetching all indicators for USA
  console.log('Testing full indicator fetch for USA...');
  
  fetchAllIndicators('USA', '2023-01-01', '2023-12-31').then(data => {
    console.log('\nData received for indicators:');
    Object.entries(data).forEach(([indicator, values]) => {
      console.log(`- ${indicator}: ${values.length} data points`);
    });
  });
});

// Export for use in App.js if needed
export { testDataConnections };