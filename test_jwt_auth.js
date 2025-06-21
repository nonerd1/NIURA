const axios = require('axios');

// Configuration
const BASE_URL = 'http://192.168.86.42:8000/api'\;
const TEST_USER = {
  email: 'testica@example.com',
  password: 'test123'
};

let authToken = '';

// Test endpoints configuration
const ENDPOINTS = {
  // Working endpoints (no auth required or working with JWT)
  login: { method: 'POST', url: '/login', requiresAuth: false },
  register: { method: 'POST', url: '/register', requiresAuth: false },
  forgotPassword: { method: 'POST', url: '/forgot-password', requiresAuth: false },
  resetPassword: { method: 'POST', url: '/reset-password', requiresAuth: false },
  updateUser: { method: 'PUT', url: '/users/1', requiresAuth: true },
  createTask: { method: 'POST', url: '/tasks', requiresAuth: true },
  getTasks: { method: 'GET', url: '/tasks', requiresAuth: true },
  getCurrentGoals: { method: 'GET', url: '/eeg/current-goals', requiresAuth: true },
  getRecommendations: { method: 'GET', url: '/eeg/recommendations', requiresAuth: true },
  getLatestEEG: { method: 'GET', url: '/eeg/latest', requiresAuth: true },
  getEEGAggregate: { method: 'GET', url: '/eeg/aggregate', requiresAuth: true },
  getBestFocusTime: { method: 'GET', url: '/eeg/best-focus-time', requiresAuth: true },
  getMusicSuggestion: { method: 'GET', url: '/eeg/music-suggestion', requiresAuth: true },
  createSession: { method: 'POST', url: '/sessions/create', requiresAuth: true },
  getSessionHistory: { method: 'GET', url: '/sessions/history', requiresAuth: true },
  
  // Problematic endpoints (JWT validation issues)
  updateTask: { method: 'PUT', url: '/tasks/1', requiresAuth: true },
  deleteTask: { method: 'DELETE', url: '/tasks/1', requiresAuth: true },
  getEvents: { method: 'GET', url: '/events', requiresAuth: true },
  
  // Schema validation issue
  bulkEegUpload: { method: 'POST', url: '/eeg/bulk', requiresAuth: true }
};

// Helper function to make API calls
async function makeRequest(endpoint, config = {}) {
  try {
    const url = `${BASE_URL}${config.url}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(config.requiresAuth && authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    };

    console.log(`\n🔍 Testing ${config.method} ${config.url}`);
    console.log(`Headers: ${JSON.stringify(headers, null, 2)}`);

    let response;
    switch (config.method) {
      case 'GET':
        response = await axios.get(url, { headers });
        break;
      case 'POST':
        response = await axios.post(url, config.data || {}, { headers });
        break;
      case 'PUT':
        response = await axios.put(url, config.data || {}, { headers });
        break;
      case 'DELETE':
        response = await axios.delete(url, { headers });
        break;
      default:
        throw new Error(`Unsupported method: ${config.method}`);
    }

    console.log(`✅ SUCCESS: ${response.status} ${response.statusText}`);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    console.log(`❌ ERROR: ${error.response?.status || 'Network'} - ${error.response?.statusText || error.message}`);
    if (error.response?.data) {
      console.log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`);
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

// Test JWT token validation
async function testJWTValidation() {
  console.log('\n🔬 JWT TOKEN VALIDATION TEST');
  console.log('='.repeat(50));
  
  // Test endpoints that should work with JWT
  const workingEndpoints = [
    { name: 'getTasks', ...ENDPOINTS.getTasks },
    { name: 'getCurrentGoals', ...ENDPOINTS.getCurrentGoals },
    { name: 'getLatestEEG', ...ENDPOINTS.getLatestEEG }
  ];
  
  console.log('\n📝 Testing WORKING endpoints with JWT:');
  for (const endpoint of workingEndpoints) {
    await makeRequest(endpoint.name, endpoint);
  }
  
  // Test problematic endpoints
  const problematicEndpoints = [
    { name: 'updateTask', ...ENDPOINTS.updateTask, data: { label: 'Test Update', description: 'Test' } },
    { name: 'deleteTask', ...ENDPOINTS.deleteTask },
    { name: 'getEvents', ...ENDPOINTS.getEvents }
  ];
  
  console.log('\n❌ Testing PROBLEMATIC endpoints with JWT:');
  for (const endpoint of problematicEndpoints) {
    await makeRequest(endpoint.name, endpoint);
  }
}

// Test token expiration
async function testTokenExpiration() {
  console.log('\n⏰ TESTING TOKEN EXPIRATION');
  console.log('='.repeat(50));
  
  // Save original token
  const originalToken = authToken;
  
  // Test with invalid token
  authToken = 'invalid.token.here';
  console.log('\n🔍 Testing with invalid token:');
  await makeRequest('getTasks', ENDPOINTS.getTasks);
  
  // Test with expired token (simulated)
  authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  console.log('\n🔍 Testing with fake expired token:');
  await makeRequest('getTasks', ENDPOINTS.getTasks);
  
  // Restore original token
  authToken = originalToken;
  console.log('\n🔍 Testing with restored valid token:');
  await makeRequest('getTasks', ENDPOINTS.getTasks);
}

// Main test function
async function runTests() {
  console.log('🚀 NIURA JWT AUTHENTICATION DIAGNOSTIC TEST');
  console.log('='.repeat(60));
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without valid login');
    return;
  }
  
  // Step 2: Test JWT validation inconsistencies
  await testJWTValidation();
  
  // Step 3: Test token expiration handling
  await testTokenExpiration();
  
  // Step 4: Summary and recommendations
  console.log('\n📊 TEST SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('\nIf you see "Invalid or expired token" errors for some endpoints but not others,');
  console.log('this indicates inconsistent JWT validation middleware in your FastAPI backend.');
  console.log('\nLikely causes:');
  console.log('1. Some endpoints missing @require_auth decorator');
  console.log('2. Inconsistent JWT validation middleware application');
  console.log('3. Different route groups with different auth configurations');
  console.log('4. Token validation logic differences between endpoints');
  console.log('\nNext steps:');
  console.log('1. Navigate to your EarBud-BE directory');
  console.log('2. Check main.py or app.py for JWT middleware configuration');
  console.log('3. Ensure all protected endpoints use the same auth decorator');
  console.log('4. Verify JWT secret key consistency across all auth functions');
}

// Run the tests
runTests().catch(console.error);
