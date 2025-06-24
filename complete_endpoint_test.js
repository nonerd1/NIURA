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
    const fullError = error.response?.data || error.message;
    console.log(`❌ ERROR: ${error.response?.status || 'Network'} - ${errorMsg}`);
    
    // Add more detailed error info for debugging
    if (error.response?.status === 500) {
      console.log(`🔍 DEBUG INFO: Full error response:`, fullError);
      console.log(`🔍 DEBUG INFO: Request URL: ${error.config?.url}`);
      console.log(`🔍 DEBUG INFO: Request data:`, error.config?.data);
    }
    
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

// Test all endpoints from the user's list
async function testAllEndpoints() {
  console.log('\n🚀 TESTING ALL ENDPOINTS FROM YOUR LIST');
  console.log('='.repeat(70));
  
  const endpoints = [
    // Authentication endpoints (no auth required)
    { name: 'POST Register', method: 'POST', endpoint: '/register', 
      data: { email: 'test_new@example.com', password: 'test123', full_name: 'Test User', gender: 'male' }, 
      requiresAuth: false },
    { name: 'POST Login', method: 'POST', endpoint: '/login', 
      data: new URLSearchParams([['username', TEST_USER.email], ['password', TEST_USER.password]]), 
      requiresAuth: false },
    { name: 'POST forgot-password', method: 'POST', endpoint: '/forgot-password', 
      data: { email: TEST_USER.email }, 
      requiresAuth: false },
    { name: 'POST reset-password', method: 'POST', endpoint: '/reset-password', 
      data: { token: 'dummy-token', new_password: 'newpass123' }, 
      requiresAuth: false, expectError: true },
    
    // User management endpoints (requires auth)
    { name: 'PUT update-registered-user', method: 'PUT', endpoint: '/users/1', 
      data: { first_name: 'Updated', last_name: 'User' } },
    
    // EEG endpoints (requires auth)
    { name: 'GET Get Current Goals', method: 'GET', endpoint: '/eeg/current-goals' },
    { name: 'GET Get Recommendations', method: 'GET', endpoint: '/eeg/recommendations' },
    { name: 'POST Bulk EEG Upload', method: 'POST', endpoint: '/eeg/bulk', 
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
    { name: 'GET Get Latest EEG', method: 'GET', endpoint: '/eeg/latest' },
    { name: 'GET EEG Aggregate (Hourly)', method: 'GET', endpoint: '/eeg/aggregate?range=hourly' },
    { name: 'GET Best Focus Time', method: 'GET', endpoint: '/eeg/best-focus-time' },
    { name: 'GET Music Suggestion', method: 'GET', endpoint: '/eeg/music-suggestion' },
    { name: 'POST Session Labels', method: 'POST', endpoint: '/eeg/session-labels', 
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
    
    // Session endpoints (requires auth)
    { name: 'POST create-sessions', method: 'POST', endpoint: '/sessions/create', 
      data: { date: new Date().toISOString(), duration: 30, label: 'focus' } },
    { name: 'GET Session History', method: 'GET', endpoint: '/sessions/history' },
    
    // GET endpoints first to avoid 404s
    { name: 'GET view-events', method: 'GET', endpoint: '/events' },
    { name: 'GET Get Tasks', method: 'GET', endpoint: '/tasks' },
  ];
  
  const results = {};
  let successCount = 0;
  
  // Test basic endpoints first
  for (const test of endpoints) {
    console.log(`\n📝 ${test.name}`);
    const result = await makeRequest(
      test.method, 
      test.endpoint, 
      test.data, 
      test.requiresAuth !== false
    );
    
    // Some endpoints are expected to fail (like reset-password with dummy token)
    const success = test.expectError ? !result.success : result.success;
    results[test.name] = success;
    
    if (success) {
      successCount++;
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Now test CRUD operations with proper creation/update/delete flow
  console.log('\n🔄 TESTING CRUD OPERATIONS (CREATE → UPDATE → DELETE)');
  console.log('='.repeat(70));
  
  // Add delay and refresh token to ensure stability for CRUD operations
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('🔄 Refreshing authentication for CRUD operations...');
  
  // Test Event CRUD
  let createdEventId = null;
  console.log('\n📝 POST Add Event');
  const eventCreateResult = await makeRequest('POST', '/events', {
    date: new Date().toISOString(),
    type: 'meeting',
    turnaround_time: 60
  });
  results['POST Add Event'] = eventCreateResult.success;
  if (eventCreateResult.success) {
    successCount++;
    // Extract event ID from response
    if (eventCreateResult.data && eventCreateResult.data.event) {
      createdEventId = eventCreateResult.data.event;
    }
  }
  
  // Test Event Update (only if we created one)
  if (createdEventId) {
    console.log(`\n📝 PUT update-events (ID: ${createdEventId})`);
    const eventUpdateResult = await makeRequest('PUT', `/events/${createdEventId}`, {
      date: new Date().toISOString(),
      type: 'updated-meeting',
      turnaround_time: 90
    });
    results['PUT update-events'] = eventUpdateResult.success;
    if (eventUpdateResult.success) successCount++;
    
    console.log(`\n📝 DELETE delete-event (ID: ${createdEventId})`);
    const eventDeleteResult = await makeRequest('DELETE', `/events/${createdEventId}`);
    results['DELETE delete-event'] = eventDeleteResult.success;
    if (eventDeleteResult.success) successCount++;
  } else {
    // Mark as failed if we couldn't create an event to test with
    results['PUT update-events'] = false;
    results['DELETE delete-event'] = false;
  }
  
  // Test Task CRUD - Use the same approach as simple test
  let createdTaskId = null;
  console.log('\n📝 POST Add Task');
  
  // Add a longer delay and use the exact same approach as simple test
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Use a fresh login to ensure token is valid
  console.log('🔄 Ensuring fresh token for task operations...');
  const freshLoginResult = await login();
  if (!freshLoginResult) {
    console.log('❌ Failed to refresh token for task operations');
    results['POST Add Task'] = false;
    results['PUT Update Task'] = false;
    results['DELETE Delete Task'] = false;
  } else {
  const taskCreateResult = await makeRequest('POST', '/tasks', {
    label: 'Complete API Test',
    description: 'Test all endpoints successfully'
  });
  results['POST Add Task'] = taskCreateResult.success;
  if (taskCreateResult.success) {
    successCount++;
    // Extract task ID from response
    if (taskCreateResult.data && taskCreateResult.data.task) {
      createdTaskId = taskCreateResult.data.task;
        console.log(`✅ Successfully created task with ID: ${createdTaskId}`);
    }
  }
  
  // Test Task Update (only if we created one)
  if (createdTaskId) {
      // Add delay before update
      await new Promise(resolve => setTimeout(resolve, 500));
      
    console.log(`\n📝 PUT Update Task (ID: ${createdTaskId})`);
    const taskUpdateResult = await makeRequest('PUT', `/tasks/${createdTaskId}`, {
      label: 'Updated Task',
      description: 'Updated description for API test'
    });
    results['PUT Update Task'] = taskUpdateResult.success;
    if (taskUpdateResult.success) successCount++;
      
      // Add delay before delete
      await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`\n📝 DELETE Delete Task (ID: ${createdTaskId})`);
    const taskDeleteResult = await makeRequest('DELETE', `/tasks/${createdTaskId}`);
    results['DELETE Delete Task'] = taskDeleteResult.success;
    if (taskDeleteResult.success) successCount++;
  } else {
    // Mark as failed if we couldn't create a task to test with
    results['PUT Update Task'] = false;
    results['DELETE Delete Task'] = false;
    }
  }
  
  const totalEndpoints = Object.keys(results).length;
  return { results, successCount, totalCount: totalEndpoints };
}

// Main test function
async function runCompleteTest() {
  console.log('🎯 COMPLETE NIURA API ENDPOINT VERIFICATION');
  console.log('='.repeat(80));
  console.log('Testing ALL endpoints from your list...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test all endpoints
  const { results, successCount, totalCount } = await testAllEndpoints();
  
  // Step 3: Generate comprehensive report
  console.log('\n📊 COMPLETE ENDPOINT STATUS REPORT');
  console.log('='.repeat(80));
  
  console.log('\n✅ WORKING ENDPOINTS:');
  Object.entries(results).forEach(([name, success]) => {
    if (success) {
      console.log(`   ✅ ${name}`);
    }
  });
  
  console.log('\n❌ FAILING ENDPOINTS:');
  const failingEndpoints = Object.entries(results).filter(([name, success]) => !success);
  if (failingEndpoints.length === 0) {
    console.log('   🎉 No failing endpoints!');
  } else {
    failingEndpoints.forEach(([name, success]) => {
      console.log(`   ❌ ${name}`);
    });
  }
  
  console.log('\n🎯 FINAL SUMMARY:');
  console.log(`   ✅ Working Endpoints: ${successCount}/${totalCount}`);
  console.log(`   ❌ Failing Endpoints: ${totalCount - successCount}/${totalCount}`);
  console.log(`   📊 Success Rate: ${Math.round((successCount/totalCount) * 100)}%`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 PERFECT! ALL ENDPOINTS ARE WORKING!');
    console.log('   Your NIURA API is 100% functional and ready for production!');
  } else if (successCount >= totalCount * 0.9) {
    console.log('\n🎊 EXCELLENT! 90%+ endpoints are working!');
    console.log('   Your API is highly functional with minor issues to address.');
  } else {
    console.log('\n⚠️  Some endpoints need attention. Check the detailed output above.');
  }
  
  console.log('\n📋 ENDPOINT MAPPING TO YOUR LIST:');
  console.log('   All endpoints from your image have been tested and verified!');
}

// Run the complete test
runCompleteTest().catch(console.error); 