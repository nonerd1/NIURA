const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';
const TEST_USER = {
  email: 'testica@example.com',
  password: 'test123'
};

let authToken = '';

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null, requiresAuth = true) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(requiresAuth && authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    };

    if (method === 'POST' && endpoint === '/login') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    console.log(`🔍 Testing ${method} ${endpoint}`);
    
    let response;
    const url = `${BASE_URL}${endpoint}`;
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await axios.get(url, { headers });
        break;
      case 'POST':
        response = await axios.post(url, data, { headers });
        break;
      case 'PUT':
        response = await axios.put(url, data, { headers });
        break;
      case 'DELETE':
        response = await axios.delete(url, { headers });
        break;
    }

    console.log(`✅ SUCCESS: ${response.status} ${response.statusText}`);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message;
    console.log(`❌ ERROR: ${error.response?.status || 'Network'} - ${errorMsg}`);
    return { 
      success: false, 
      status: error.response?.status || 0, 
      error: error.response?.data || error.message 
    };
  }
}

// Login to get JWT token
async function login() {
  console.log('🔐 Attempting login...');
  
  const formData = new URLSearchParams();
  formData.append('username', TEST_USER.email);
  formData.append('password', TEST_USER.password);
  
  const result = await makeRequest('POST', '/login', formData, false);
  if (result.success) {
    authToken = result.data.access_token;
    console.log(`✅ Login successful! Token obtained.`);
    return true;
  }
  return false;
}

// Test missing endpoints
async function testMissingEndpoints() {
  console.log('\n🔍 TESTING MISSING ENDPOINTS');
  console.log('='.repeat(50));
  
  const missingEndpoints = [
    // EEG Records endpoint that was missed
    { name: 'GET EEG Records (Bulk Retrieval)', method: 'GET', endpoint: '/eeg/records' },
    { name: 'GET EEG Records with Limit', method: 'GET', endpoint: '/eeg/records?limit=50' },
    
    // Test different EEG aggregate ranges
    { name: 'GET EEG Aggregate (Daily)', method: 'GET', endpoint: '/eeg/aggregate?range=daily' },
    { name: 'GET EEG Aggregate (Weekly)', method: 'GET', endpoint: '/eeg/aggregate?range=weekly' },
    { name: 'GET EEG Aggregate (Monthly)', method: 'GET', endpoint: '/eeg/aggregate?range=monthly' },
  ];
  
  const results = {};
  let successCount = 0;
  
  for (const test of missingEndpoints) {
    console.log(`\n📝 ${test.name}`);
    const result = await makeRequest(test.method, test.endpoint, test.data);
    
    results[test.name] = result.success;
    if (result.success) {
      successCount++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return { results, successCount, totalCount: missingEndpoints.length };
}

// Test bulk operations with different data sizes
async function testBulkOperationsVariations() {
  console.log('\n🚀 TESTING BULK OPERATIONS WITH DIFFERENT DATA SIZES');
  console.log('='.repeat(60));
  
  const bulkTests = [
    {
      name: 'Bulk EEG Upload - Single Record',
      method: 'POST',
      endpoint: '/eeg/bulk',
      data: {
        records: [
          {
            sample_index: 1,
            timestamp: new Date().toISOString(),
            eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
          }
        ],
        duration: 4
      }
    },
    {
      name: 'Bulk EEG Upload - Multiple Records',
      method: 'POST',
      endpoint: '/eeg/bulk',
      data: {
        records: Array.from({length: 10}, (_, i) => ({
          sample_index: i + 1,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
        })),
        duration: 10
      }
    },
    {
      name: 'Session Labels - Single Record',
      method: 'POST',
      endpoint: '/eeg/session-labels',
      data: {
        records: [
          {
            sample_index: 1,
            timestamp: new Date().toISOString(),
            eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
          }
        ],
        duration: 4
      }
    },
    {
      name: 'Session Labels - Multiple Records',
      method: 'POST',
      endpoint: '/eeg/session-labels',
      data: {
        records: Array.from({length: 5}, (_, i) => ({
          sample_index: i + 1,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
        })),
        duration: 5
      }
    }
  ];
  
  const results = {};
  let successCount = 0;
  
  for (const test of bulkTests) {
    console.log(`\n📝 ${test.name}`);
    const result = await makeRequest(test.method, test.endpoint, test.data);
    
    results[test.name] = result.success;
    if (result.success) {
      successCount++;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return { results, successCount, totalCount: bulkTests.length };
}

// Main test function
async function runMissingEndpointsTest() {
  console.log('🎯 TESTING MISSING ENDPOINTS & BULK OPERATIONS');
  console.log('='.repeat(70));
  console.log('Testing endpoints that might have been missed...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test missing endpoints
  const { results: missingResults, successCount: missingSuccess, totalCount: missingTotal } = await testMissingEndpoints();
  
  // Step 3: Test bulk operation variations
  const { results: bulkResults, successCount: bulkSuccess, totalCount: bulkTotal } = await testBulkOperationsVariations();
  
  // Step 4: Generate report
  console.log('\n📊 MISSING ENDPOINTS TEST RESULTS');
  console.log('='.repeat(70));
  
  console.log('\n🔍 MISSING ENDPOINT TESTS:');
  Object.entries(missingResults).forEach(([name, success]) => {
    console.log(`   ${success ? '✅' : '❌'} ${name}`);
  });
  
  console.log('\n🚀 BULK OPERATION VARIATIONS:');
  Object.entries(bulkResults).forEach(([name, success]) => {
    console.log(`   ${success ? '✅' : '❌'} ${name}`);
  });
  
  const totalSuccess = missingSuccess + bulkSuccess;
  const totalTests = missingTotal + bulkTotal;
  
  console.log('\n🎯 FINAL SUMMARY:');
  console.log(`   🔍 Missing Endpoints: ${missingSuccess}/${missingTotal}`);
  console.log(`   🚀 Bulk Variations: ${bulkSuccess}/${bulkTotal}`);
  console.log(`   📊 Overall Success: ${totalSuccess}/${totalTests} (${Math.round((totalSuccess/totalTests) * 100)}%)`);
  
  if (totalSuccess === totalTests) {
    console.log('\n🎉 PERFECT! All additional endpoints are working!');
  } else {
    console.log('\n⚠️  Some additional endpoints need attention.');
  }
}

// Run the test
runMissingEndpointsTest().catch(console.error); 