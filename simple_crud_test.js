const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';
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

    if (method === 'POST' && endpoint === '/login') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    console.log(`🔍 ${method} ${endpoint}`);
    
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

    console.log(`✅ SUCCESS: ${response.status}`);
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
  console.log('🔐 Logging in...');
  
  const formData = new URLSearchParams();
  formData.append('username', TEST_USER.email);
  formData.append('password', TEST_USER.password);
  
  const result = await makeRequest('POST', '/login', formData);
  if (result.success) {
    authToken = result.data.access_token;
    console.log(`✅ Login successful!`);
    return true;
  }
  return false;
}

// Test CRUD operations
async function testCRUDOperations() {
  console.log('\n🔄 TESTING CRUD OPERATIONS');
  console.log('='.repeat(50));
  
  let results = {
    taskCreate: false,
    taskUpdate: false,
    taskDelete: false,
    eventCreate: false,
    eventUpdate: false,
    eventDelete: false
  };
  
  // Test Task CRUD
  console.log('\n📋 TASK CRUD OPERATIONS:');
  
  // 1. Create Task
  const taskCreateResult = await makeRequest('POST', '/tasks', {
    label: 'Test Task',
    description: 'This is a test task for CRUD operations'
  });
  
  results.taskCreate = taskCreateResult.success;
  let taskId = null;
  
  if (taskCreateResult.success && taskCreateResult.data.task) {
    taskId = taskCreateResult.data.task;
    console.log(`   📝 Created task with ID: ${taskId}`);
    
    // 2. Update Task
    const taskUpdateResult = await makeRequest('PUT', `/tasks/${taskId}`, {
      label: 'Updated Test Task',
      description: 'This task has been updated'
    });
    
    results.taskUpdate = taskUpdateResult.success;
    if (taskUpdateResult.success) {
      console.log(`   ✏️  Updated task ID: ${taskId}`);
    }
    
    // 3. Delete Task
    const taskDeleteResult = await makeRequest('DELETE', `/tasks/${taskId}`);
    results.taskDelete = taskDeleteResult.success;
    if (taskDeleteResult.success) {
      console.log(`   🗑️  Deleted task ID: ${taskId}`);
    }
  }
  
  // Test Event CRUD
  console.log('\n📅 EVENT CRUD OPERATIONS:');
  
  // 1. Create Event
  const eventCreateResult = await makeRequest('POST', '/events', {
    date: new Date().toISOString(),
    type: 'meeting',
    turnaround_time: 60
  });
  
  results.eventCreate = eventCreateResult.success;
  let eventId = null;
  
  if (eventCreateResult.success && eventCreateResult.data.event) {
    eventId = eventCreateResult.data.event;
    console.log(`   📝 Created event with ID: ${eventId}`);
    
    // 2. Update Event
    const eventUpdateResult = await makeRequest('PUT', `/events/${eventId}`, {
      date: new Date().toISOString(),
      type: 'updated-meeting',
      turnaround_time: 90
    });
    
    results.eventUpdate = eventUpdateResult.success;
    if (eventUpdateResult.success) {
      console.log(`   ✏️  Updated event ID: ${eventId}`);
    }
    
    // 3. Delete Event
    const eventDeleteResult = await makeRequest('DELETE', `/events/${eventId}`);
    results.eventDelete = eventDeleteResult.success;
    if (eventDeleteResult.success) {
      console.log(`   🗑️  Deleted event ID: ${eventId}`);
    }
  }
  
  return results;
}

// Main test function
async function runTest() {
  console.log('🎯 SIMPLE CRUD TEST FOR NIURA API');
  console.log('='.repeat(60));
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test CRUD operations
  const results = await testCRUDOperations();
  
  // Step 3: Generate report
  console.log('\n📊 CRUD TEST RESULTS');
  console.log('='.repeat(60));
  
  const taskSuccess = results.taskCreate && results.taskUpdate && results.taskDelete;
  const eventSuccess = results.eventCreate && results.eventUpdate && results.eventDelete;
  
  console.log('\n📋 TASK OPERATIONS:');
  console.log(`   ${results.taskCreate ? '✅' : '❌'} Create Task`);
  console.log(`   ${results.taskUpdate ? '✅' : '❌'} Update Task`);
  console.log(`   ${results.taskDelete ? '✅' : '❌'} Delete Task`);
  console.log(`   📊 Task CRUD: ${taskSuccess ? 'WORKING' : 'FAILED'}`);
  
  console.log('\n📅 EVENT OPERATIONS:');
  console.log(`   ${results.eventCreate ? '✅' : '❌'} Create Event`);
  console.log(`   ${results.eventUpdate ? '✅' : '❌'} Update Event`);
  console.log(`   ${results.eventDelete ? '✅' : '❌'} Delete Event`);
  console.log(`   📊 Event CRUD: ${eventSuccess ? 'WORKING' : 'FAILED'}`);
  
  const overallSuccess = taskSuccess && eventSuccess;
  console.log('\n🎯 OVERALL RESULT:');
  if (overallSuccess) {
    console.log('   🎉 ALL CRUD OPERATIONS WORKING PERFECTLY!');
    console.log('   ✅ All 5 previously failing endpoints are now fixed!');
  } else {
    console.log('   ⚠️  Some CRUD operations still need attention.');
    console.log('   🔧 Check the detailed output above for specific issues.');
  }
}

// Run the test
runTest().catch(console.error); 