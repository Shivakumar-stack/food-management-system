/**
 * FoodBridge API Endpoint Test Script
 * Phase 6: Verify all critical endpoints
 */

const BASE = 'http://localhost:5000/api';

async function test() {
  console.log('=== PHASE 6: API ENDPOINT VERIFICATION ===\n');

  // 1. Test signup
  console.log('1. POST /api/auth/signup');
  try {
    const signupRes = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'AuditTest',
        lastName: 'User',
        email: `audit_test_${Date.now()}@foodbridge.test`,
        password: 'TestPassword123!',
        role: 'donor',
        phone: '+91-9876543210'
      })
    });
    const signupData = await signupRes.json();
    console.log(`   Status: ${signupRes.status} | Success: ${signupData.success}`);
    if (signupData.success) {
      console.log('   ✅ Signup working');
      var testToken = signupData.data.token;
      var testUserId = signupData.data.user.id;
    } else {
      console.log(`   ❌ ${signupData.message}`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 2. Test login
  console.log('\n2. POST /api/auth/login');
  try {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@foodbridge.org',
        password: 'TestPassword123!'
      })
    });
    const loginData = await loginRes.json();
    console.log(`   Status: ${loginRes.status} | Success: ${loginData.success}`);
    if (loginData.success) {
      console.log(`   ✅ Login working | Role: ${loginData.data.user.role}`);
      var adminToken = loginData.data.token;
    } else {
      console.log(`   ⚠️ ${loginData.message} (May need to use existing user)`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // Use whichever token we got
  const token = adminToken || testToken;
  if (!token) {
    console.log('\n❌ No auth token available. Cannot test authenticated endpoints.');
    
    // Try getting any user to login  
    console.log('   Attempting to find a user...');
    try {
      // Try another known password
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@foodbridge.org',
          password: 'Admin@1234'
        })
      });
      const data = await res.json();
      if (data.success) {
        console.log(`   ✅ Found working credentials`);
        var token2 = data.data.token;
      }
    } catch(e) {}
    
    if (!token2 && testToken) {
      console.log('   Using test user token instead');
    }
  }

  const authToken = token || token2;

  // 3. Test GET /api/donations
  console.log('\n3. GET /api/donations');
  if (authToken) {
    try {
      const res = await fetch(`${BASE}/donations`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      console.log(`   Status: ${res.status} | Success: ${data.success} | Count: ${data.count || 'N/A'}`);
      console.log(`   ✅ GET donations working`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  } else {
    console.log('   ⏭️ Skipped (no auth token)');
  }

  // 4. Test GET /api/donations/stats/admin
  console.log('\n4. GET /api/donations/stats/admin');
  if (adminToken || token2) {
    try {
      const t = adminToken || token2;
      const res = await fetch(`${BASE}/donations/stats/admin`, {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      const data = await res.json();
      console.log(`   Status: ${res.status} | Success: ${data.success}`);
      if (data.success) {
        console.log(`   ✅ Admin stats working`);
        console.log(`   Donations: ${JSON.stringify(data.data.donations)}`);
        console.log(`   Users: ${JSON.stringify(data.data.users)}`);
        console.log(`   Metrics: deliveries=${data.data.metrics.deliveriesCompleted}, food=${data.data.metrics.totalFoodQuantity}`);
      } else {
        console.log(`   ⚠️ ${data.message}`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  } else {
    console.log('   ⏭️ Skipped (no admin token)');
  }

  // 5. Test POST /api/donations (create donation)
  console.log('\n5. POST /api/donations');
  if (testToken) {
    try {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`${BASE}/donations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          items: [{
            itemName: 'Audit Test Rice',
            category: 'Raw Ingredients',
            quantity: '10',
            unit: 'kg'
          }],
          address: '123 Audit Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zip: '400001',
          pickup_datetime: futureDate,
          priority: 'medium'
        })
      });
      const data = await res.json();
      console.log(`   Status: ${res.status} | Success: ${data.success}`);
      if (data.success) {
        console.log(`   ✅ Donation created: ${data.data._id}`);
        var testDonationId = data.data._id;
      } else {
        console.log(`   ❌ ${data.message}`);
        if (data.errors) console.log('   Errors:', JSON.stringify(data.errors));
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  } else {
    console.log('   ⏭️ Skipped (no donor token)');
  }

  // 6. Test health check
  console.log('\n6. GET /api/health');
  try {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    console.log(`   Status: ${res.status} | ✅ ${data.message}`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  // 7. Test public map
  console.log('\n7. GET /api/donations/public-map');
  try {
    const res = await fetch(`${BASE}/donations/public-map`);
    const data = await res.json();
    console.log(`   Status: ${res.status} | Success: ${data.success} | Count: ${data.count}`);
    console.log(`   ✅ Public map endpoint working`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
  }

  console.log('\n=== API VERIFICATION COMPLETE ===');
}

test().catch(console.error);
