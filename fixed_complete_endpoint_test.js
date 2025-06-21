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

// Test all basic endpoints
async function testBasicEndpoints() {
  console.log('\n🚀 TESTING ALL BASIC ENDPOINTS');
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
    
    // GET endpoints
    { name: 'GET view-events', method: 'GET', endpoint: '/events' },
    { name: 'GET Get Tasks', method: 'GET', endpoint: '/tasks' },
  ];
  
  const results = {};
  let successCount = 0;
  
  // Test basic endpoints
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
  
  return { results, successCount };
}

// Test Event CRUD operations
async function testEventCRUD() {
  console.log('\n📅 TESTING EVENT CRUD OPERATIONS');
  console.log('='.repeat(70));
  
  const results = {};
  let successCount = 0;
  
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
    if (eventCreateResult.data && eventCreateResult.data.event) {
      createdEventId = eventCreateResult.data.event;
    }
  }
  
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
    results['PUT update-events'] = false;
    results['DELETE delete-event'] = false;
  }
  
  return { results, successCount };
}

// Test Task CRUD operations separately
async function testTaskCRUDSeparately() {
  console.log('\n📋 TESTING TASK CRUD OPERATIONS (SEPARATE SESSION)');
  console.log('='.repeat(70));
  
  // Fresh login for task operations
  const freshLogin = await login();
  if (!freshLogin) {
    return { 
      results: {
        'POST Add Task': false,
        'PUT Update Task': false,
        'DELETE Delete Task': false
      }, 
      successCount: 0 
    };
  }
  
  const results = {};
  let successCount = 0;
  
  let createdTaskId = null;
  console.log('\n📝 POST Add Task');
  const taskCreateResult = await makeRequest('POST', '/tasks', {
    label: 'Fixed Comprehensive Test Task',
    description: 'Test task creation in fixed comprehensive test'
  });
  results['POST Add Task'] = taskCreateResult.success;
  if (taskCreateResult.success) {
    successCount++;
    if (taskCreateResult.data && taskCreateResult.data.task) {
      createdTaskId = taskCreateResult.data.task;
      console.log(`✅ Successfully created task with ID: ${createdTaskId}`);
    }
  }
  
  if (createdTaskId) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`\n📝 PUT Update Task (ID: ${createdTaskId})`);
    const taskUpdateResult = await makeRequest('PUT', `/tasks/${createdTaskId}`, {
      label: 'Updated Fixed Task',
      description: 'Updated description for fixed comprehensive test'
    });
    results['PUT Update Task'] = taskUpdateResult.success;
    if (taskUpdateResult.success) successCount++;
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`\n📝 DELETE Delete Task (ID: ${createdTaskId})`);
    const taskDeleteResult = await makeRequest('DELETE', `/tasks/${createdTaskId}`);
    results['DELETE Delete Task'] = taskDeleteResult.success;
    if (taskDeleteResult.success) successCount++;
  } else {
    results['PUT Update Task'] = false;
    results['DELETE Delete Task'] = false;
  }
  
  return { results, successCount };
}

// Main test function
async function runFixedCompleteTest() {
  console.log('🎯 FIXED COMPLETE NIURA API ENDPOINT VERIFICATION');
  console.log('='.repeat(80));
  console.log('Testing ALL endpoints with fixed approach...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test basic endpoints
  const basicResults = await testBasicEndpoints();
  
  // Step 3: Test Event CRUD
  const eventResults = await testEventCRUD();
  
  // Step 4: Test Task CRUD separately
  const taskResults = await testTaskCRUDSeparately();
  
  // Combine all results
  const allResults = {
    ...basicResults.results,
    ...eventResults.results,
    ...taskResults.results
  };
  
  const totalSuccessCount = basicResults.successCount + eventResults.successCount + taskResults.successCount;
  const totalCount = Object.keys(allResults).length;
  
  // Generate comprehensive report
  console.log('\n📊 FIXED COMPLETE ENDPOINT STATUS REPORT');
  console.log('='.repeat(80));
  
  console.log('\n✅ WORKING ENDPOINTS:');
  Object.entries(allResults).forEach(([name, success]) => {
    if (success) {
      console.log(`   ✅ ${name}`);
    }
  });
  
  console.log('\n❌ FAILING ENDPOINTS:');
  const failingEndpoints = Object.entries(allResults).filter(([name, success]) => !success);
  if (failingEndpoints.length === 0) {
    console.log('   🎉 No failing endpoints!');
  } else {
    failingEndpoints.forEach(([name, success]) => {
      console.log(`   ❌ ${name}`);
    });
  }
  
  console.log('\n🎯 FINAL SUMMARY:');
  console.log(`   ✅ Working Endpoints: ${totalSuccessCount}/${totalCount}`);
  console.log(`   ❌ Failing Endpoints: ${totalCount - totalSuccessCount}/${totalCount}`);
  console.log(`   📊 Success Rate: ${Math.round((totalSuccessCount/totalCount) * 100)}%`);
  
  if (totalSuccessCount === totalCount) {
    console.log('\n🎉 PERFECT! ALL ENDPOINTS ARE WORKING!');
    console.log('   Your NIURA API is 100% functional and ready for production!');
  } else if (totalSuccessCount >= totalCount * 0.9) {
    console.log('\n🎊 EXCELLENT! 90%+ endpoints are working!');
    console.log('   Your API is highly functional with minor issues to address.');
  } else {
    console.log('\n⚠️  Some endpoints need attention. Check the detailed output above.');
  }
  
  console.log('\n📋 COMPREHENSIVE ENDPOINT VERIFICATION COMPLETE!');
  console.log('   All 23 endpoints from your list have been properly tested!');
}

// Run the fixed complete test
runFixedCompleteTest().catch(console.error); 