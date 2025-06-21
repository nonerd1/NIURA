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

// Test task CRUD operations in isolation
async function testTaskCRUDIsolated() {
  console.log('\n🔄 TESTING TASK CRUD OPERATIONS IN ISOLATION');
  console.log('='.repeat(70));
  
  const results = {};
  let successCount = 0;
  
  // Test Task CRUD - Use the exact same approach as simple test
  let createdTaskId = null;
  console.log('\n📝 POST Add Task');
  
  const taskCreateResult = await makeRequest('POST', '/tasks', {
    label: 'Isolated Test Task',
    description: 'Test task creation in isolation'
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
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`\n📝 PUT Update Task (ID: ${createdTaskId})`);
    const taskUpdateResult = await makeRequest('PUT', `/tasks/${createdTaskId}`, {
      label: 'Updated Isolated Task',
      description: 'Updated description for isolated test'
    });
    results['PUT Update Task'] = taskUpdateResult.success;
    if (taskUpdateResult.success) successCount++;
    
    // Add delay before delete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`\n📝 DELETE Delete Task (ID: ${createdTaskId})`);
    const taskDeleteResult = await makeRequest('DELETE', `/tasks/${createdTaskId}`);
    results['DELETE Delete Task'] = taskDeleteResult.success;
    if (taskDeleteResult.success) successCount++;
  } else {
    // Mark as failed if we couldn't create a task to test with
    results['PUT Update Task'] = false;
    results['DELETE Delete Task'] = false;
  }
  
  return { results, successCount, totalCount: 3 };
}

// Main test function
async function runIsolatedTaskTest() {
  console.log('🎯 ISOLATED TASK CRUD TEST FOR NIURA API');
  console.log('='.repeat(80));
  console.log('Testing Task CRUD operations in isolation...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test task CRUD operations
  const { results, successCount, totalCount } = await testTaskCRUDIsolated();
  
  // Step 3: Generate report
  console.log('\n📊 ISOLATED TASK CRUD STATUS REPORT');
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
    console.log('\n🎉 PERFECT! ALL TASK CRUD OPERATIONS ARE WORKING!');
    console.log('   Task CRUD operations work perfectly in isolation!');
  } else {
    console.log('\n⚠️  Some task operations need attention. Check the detailed output above.');
  }
}

// Run the isolated test
runIsolatedTaskTest().catch(console.error); 