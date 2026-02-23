/**
 * Deep Debug Script for Login Issues
 * Run this in the browser console on the login page
 */

(async function deepDebug() {
  console.log('🔍 DEEP LOGIN DEBUG STARTED\n');
  
  // 1. Check if config loaded
  console.log('1️⃣ CONFIGURATION CHECK:');
  console.log('   window.appConfig exists:', typeof window.appConfig !== 'undefined');
  if (window.appConfig) {
    console.log('   API_BASE_URL:', window.appConfig.API_BASE_URL);
  } else {
    console.error('   ❌ CRITICAL: appConfig not loaded!');
    console.log('   💡 Fix: config.js must load BEFORE app.js');
    return;
  }
  
  // 2. Check services
  console.log('\n2️⃣ SERVICES CHECK:');
  console.log('   apiService:', typeof apiService !== 'undefined' ? '✅' : '❌');
  console.log('   authService:', typeof authService !== 'undefined' ? '✅' : '❌');
  
  // 3. Try to make a test request
  console.log('\n3️⃣ API CONNECTIVITY TEST:');
  try {
    const testUrl = window.appConfig.API_BASE_URL + '/auth/dashboard';
    console.log('   Testing:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('   Response status:', response.status);
    console.log('   Response OK:', response.ok);
    
    if (response.status === 401) {
      console.log('   ✅ Server is reachable (401 is expected without token)');
    } else if (response.ok) {
      console.log('   ✅ Server is reachable and responding');
    } else {
      console.log('   ⚠️  Server responded with:', response.status);
    }
  } catch (error) {
    console.error('   ❌ Cannot reach server:', error.message);
    console.log('   💡 Make sure backend is running on port 5000');
    return;
  }
  
  // 4. Test login with known credentials
  console.log('\n4️⃣ LOGIN TEST:');
  console.log('   Testing with: admin@foodbridge.org / TestPassword123!');
  
  try {
    const loginUrl = window.appConfig.API_BASE_URL + '/auth/login';
    console.log('   POST to:', loginUrl);
    
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@foodbridge.org',
        password: 'TestPassword123!'
      })
    });
    
    console.log('   Response status:', loginResponse.status);
    
    const data = await loginResponse.json();
    console.log('   Response data:', data);
    
    if (loginResponse.ok && data.success) {
      console.log('   ✅ LOGIN SUCCESSFUL!');
      console.log('   Token received:', data.data?.token ? 'Yes' : 'No');
      console.log('   User received:', data.data?.user ? 'Yes' : 'No');
    } else {
      console.error('   ❌ LOGIN FAILED:', data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('   ❌ Login request failed:', error.message);
  }
  
  console.log('\n🔍 DEBUG COMPLETE');
})();
