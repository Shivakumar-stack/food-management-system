/**
 * FoodBridge Login System Test Script
 * Run this in browser console (F12) to verify all fixes
 */

(function() {
  console.log('=====================================');
  console.log('FoodBridge Login System Verification');
  console.log('=====================================\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  function test(name, condition) {
    if (condition) {
      console.log(`✅ ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ ${name}`);
      testsFailed++;
    }
  }
  
  // Test 1: Config Loaded
  test('window.appConfig exists', typeof window.appConfig !== 'undefined');
  test('window.appConfig.API_BASE_URL is defined', 
    window.appConfig && typeof window.appConfig.API_BASE_URL !== 'undefined');
  test('window.appConfig.API_BASE_URL has value', 
    window.appConfig && window.appConfig.API_BASE_URL && window.appConfig.API_BASE_URL.length > 0);
  
  if (window.appConfig) {
    console.log('   → API_BASE_URL:', window.appConfig.API_BASE_URL);
  }
  
  // Test 2: Services Loaded
  test('authService exists', typeof window.authService !== 'undefined');
  test('apiService exists', typeof window.apiService !== 'undefined');
  test('formValidation exists', typeof window.formValidation !== 'undefined');
  test('ui helper exists', typeof window.ui !== 'undefined');
  
  // Test 3: Auth Service Methods
  if (window.authService) {
    test('authService.login is a function', typeof window.authService.login === 'function');
    test('authService.logout is a function', typeof window.authService.logout === 'function');
    test('authService.getToken is a function', typeof window.authService.getToken === 'function');
    test('authService.isLoggedIn is a function', typeof window.authService.isLoggedIn === 'function');
    test('authService.setSession is a function', typeof window.authService.setSession === 'function');
  }
  
  // Test 4: API Service Methods
  if (window.apiService) {
    test('apiService.request is a function', typeof window.apiService.request === 'function');
    test('apiService.get is a function', typeof window.apiService.get === 'function');
    test('apiService.post is a function', typeof window.apiService.post === 'function');
  }
  
  // Test 5: DOM Elements
  test('Login form exists', document.getElementById('loginForm') !== null);
  test('Email input exists', document.getElementById('email') !== null);
  test('Password input exists', document.getElementById('password') !== null);
  test('Submit button exists', document.getElementById('submitBtn') !== null);
  test('Alert container exists', document.getElementById('alertContainer') !== null);
  
  // Test 6: Current Session
  if (window.authService) {
    const isLoggedIn = window.authService.isLoggedIn();
    const token = window.authService.getToken();
    test('Session check working', true);
    console.log('   → User logged in:', isLoggedIn);
    console.log('   → Has token:', token !== null);
    if (token) {
      console.log('   → Token preview:', token.substring(0, 20) + '...');
    }
  }
  
  // Test 7: Input Styling
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  if (emailInput && passwordInput) {
    const emailStyles = window.getComputedStyle(emailInput);
    const passwordStyles = window.getComputedStyle(passwordInput);
    test('Email input has padding', parseInt(emailStyles.paddingLeft) > 30);
    test('Password input has padding', parseInt(passwordStyles.paddingLeft) > 30);
    console.log('   → Email padding-left:', emailStyles.paddingLeft);
    console.log('   → Password padding-left:', passwordStyles.paddingLeft);
  }
  
  // Summary
  console.log('\n=====================================');
  console.log(`Tests Passed: ${testsPassed}/${testsPassed + testsFailed}`);
  console.log(`Tests Failed: ${testsFailed}/${testsPassed + testsFailed}`);
  console.log('=====================================\n');
  
  if (testsFailed === 0) {
    console.log('✨ All systems operational! Ready for login testing.');
    console.log('\nNext steps:');
    console.log('1. Try logging in with: admin@foodbridge.org / TestPassword123!');
    console.log('2. Check browser console for detailed logs');
    console.log('3. Verify icons are properly aligned');
  } else {
    console.log('⚠️  Some tests failed. Please check:');
    console.log('- Is config.js loaded? (Check Network tab)');
    console.log('- Are there any JavaScript errors?');
    console.log('- Did you refresh the page after fixes?');
  }
  
  return {
    passed: testsPassed,
    failed: testsFailed,
    total: testsPassed + testsFailed
  };
})();
