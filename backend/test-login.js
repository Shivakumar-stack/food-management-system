/**
 * Backend Login Test
 * Run this to verify the login endpoint works correctly
 * 
 * Usage: node test-login.js
 */

const http = require('http');

const testData = {
  email: 'admin@foodbridge.org',
  password: 'TestPassword123!'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing login endpoint...');
console.log('URL: http://localhost:5000/api/auth/login');
console.log('Payload:', JSON.stringify(testData, null, 2));
console.log('');

const req = http.request(options, (res) => {
  let data = '';
  
  console.log('Response Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('Token received:', jsonData.data?.token ? 'Yes ✓' : 'No ✗');
        console.log('User received:', jsonData.data?.user ? 'Yes ✓' : 'No ✗');
      } else {
        console.log('\n❌ LOGIN FAILED:', jsonData.message);
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ Invalid JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\nMake sure the backend server is running on port 5000');
  console.log('Run: cd backend && npm run dev');
});

req.write(JSON.stringify(testData));
req.end();
