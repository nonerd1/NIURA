const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.86.42:8000/api';
const TEST_USER = {
  email: 'testica@example.com',
  password: 'test123'
};

let authToken = '';

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    };

    console.log(`\n🔍 Testing ${method} ${endpoint}`);
    
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
    console.log(`❌ ERROR: ${error.response?.status || 'Network'} - ${error.response?.data?.detail || error.message}`);
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
  
  try {
    const response = await axios.post(`${BASE_URL}/login`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    authToken = response.data.access_token;
    console.log(`✅ Login successful! Token: ${authToken.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`❌ Login failed: ${error.response?.data?.detail || error.message}`);
    return false;
  }
}

// Test all the previously failing endpoints
async function testFixedEndpoints() {
  console.log('\n🔧 TESTING PREVIOUSLY FAILING ENDPOINTS');
  console.log('='.repeat(60));
  
  // Test 1: Update Task (was failing)
  console.log('\n1️⃣ Testing PUT /tasks/{id} - Update Task');
  const updateResult = await makeRequest('PUT', '/tasks/1', {
    label: 'Updated Test Task',
    description: 'This task was updated via JWT fix test'
  });
  
  // Test 2: Delete Task (was failing)
  console.log('\n2️⃣ Testing DELETE /tasks/{id} - Delete Task');
  const deleteResult = await makeRequest('DELETE', '/tasks/2');
  
  // Test 3: Get Events (was failing)
  console.log('\n3️⃣ Testing GET /events - List Events');
  const eventsResult = await makeRequest('GET', '/events');
  
  return {
    updateTask: updateResult.success,
    deleteTask: deleteResult.success,
    getEvents: eventsResult.success
  };
}

// Test working endpoints to ensure we didn't break anything
async function testWorkingEndpoints() {
  console.log('\n✅ TESTING PREVIOUSLY WORKING ENDPOINTS');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Get Tasks', method: 'GET', endpoint: '/tasks' },
    { name: 'Create Task', method: 'POST', endpoint: '/tasks', data: { label: 'JWT Fix Test', description: 'Testing after JWT fix' } },
    { name: 'Current Goals', method: 'GET', endpoint: '/eeg/current-goals' },
    { name: 'Latest EEG', method: 'GET', endpoint: '/eeg/latest' },
    { name: 'User Profile Update', method: 'PUT', endpoint: '/users/1', data: { first_name: 'Test', last_name: 'User' } }
  ];
  
  const results = {};
  for (const test of tests) {
    console.log(`\n📝 ${test.name}`);
    const result = await makeRequest(test.method, test.endpoint, test.data);
    results[test.name] = result.success;
  }
  
  return results;
}

// Test EEG bulk upload with proper schema
async function testEEGBulkUpload() {
  console.log('\n🧠 TESTING EEG BULK UPLOAD WITH CORRECT SCHEMA');
  console.log('='.repeat(60));
  
  const sampleData = {
    records: [
      {
        sample_index: 1,
        timestamp: new Date().toISOString(),
        eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
      },
      {
        sample_index: 2,
        timestamp: new Date().toISOString(),
        eeg: [-6680.80, -22742.36, 17379.64, -41726.17, -187500.02, -187500.02, -187500.02, -187500.02]
      }
    ],
    duration: 4
  };
  
  const result = await makeRequest('POST', '/eeg/bulk', sampleData);
  return result.success;
}

// Main test function
async function runComprehensiveTest() {
  console.log('🚀 NIURA JWT AUTHENTICATION FIX VERIFICATION');
  console.log('='.repeat(70));
  console.log('Testing all endpoints after JWT authentication fixes...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test previously failing endpoints
  const fixedResults = await testFixedEndpoints();
  
  // Step 3: Test working endpoints to ensure no regression
  const workingResults = await testWorkingEndpoints();
  
  // Step 4: Test EEG bulk upload
  const bulkUploadSuccess = await testEEGBulkUpload();
  
  // Step 5: Generate final report
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('='.repeat(70));
  
  console.log('\n🔧 PREVIOUSLY FAILING ENDPOINTS:');
  console.log(`   ✅ Update Task: ${fixedResults.updateTask ? 'FIXED' : 'STILL FAILING'}`);
  console.log(`   ✅ Delete Task: ${fixedResults.deleteTask ? 'FIXED' : 'STILL FAILING'}`);
  console.log(`   ✅ Get Events: ${fixedResults.getEvents ? 'FIXED' : 'STILL FAILING'}`);
  
  console.log('\n✅ REGRESSION TEST - WORKING ENDPOINTS:');
  Object.entries(workingResults).forEach(([name, success]) => {
    console.log(`   ${success ? '✅' : '❌'} ${name}: ${success ? 'STILL WORKING' : 'BROKEN'}`);
  });
  
  console.log('\n🧠 SPECIAL CASE:');
  console.log(`   ${bulkUploadSuccess ? '✅' : '❌'} EEG Bulk Upload: ${bulkUploadSuccess ? 'WORKING' : 'NEEDS SCHEMA FIX'}`);
  
  const totalFixed = Object.values(fixedResults).filter(Boolean).length;
  const totalWorking = Object.values(workingResults).filter(Boolean).length;
  
  console.log('\n🎯 SUMMARY:');
  console.log(`   🔧 Fixed Endpoints: ${totalFixed}/3`);
  console.log(`   ✅ Working Endpoints: ${totalWorking}/${Object.keys(workingResults).length}`);
  console.log(`   🧠 EEG Bulk Upload: ${bulkUploadSuccess ? 'Working' : 'Needs Schema Fix'}`);
  
  if (totalFixed === 3 && totalWorking === Object.keys(workingResults).length) {
    console.log('\n🎉 SUCCESS! All JWT authentication issues have been RESOLVED!');
    console.log('   Your API is now ready for complete endpoint testing.');
  } else {
    console.log('\n⚠️  Some issues remain. Check the detailed output above.');
  }
}

// Export for use in other scripts or run directly
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest, makeRequest, login }; 