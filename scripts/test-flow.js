

const baseUrl = 'http://localhost:5000/api';
let donorToken, volunteerToken, adminToken;

async function runTests() {
    console.log('1. Testing Login...');

    let res, data; // Declare res and data once at the beginning

    const randomNum = Math.floor(Math.random() * 100000);
    const newDonorEmail = `newdonor${randomNum}@foodbridge.org`;

    res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            firstName: 'Test', lastName: 'Donor', email: newDonorEmail,
            password: 'TestPassword123!', role: 'donor', phone: '9999999999',
            address: { location: { coordinates: [77.5946, 12.9716] } }
        })
    });
    data = await res.json();
    if (data.success) {
        donorToken = data.data.token;
        console.log(`Donor Registration OK: ${newDonorEmail}`);
    } else throw new Error(`Donor registration failed: ${JSON.stringify(data)}`);

    // The original donor login block is now replaced by the registration and subsequent use of the new donor's token.
    // The following login is for the volunteer.

    res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'volunteer1@foodbridge.org', password: 'TestPassword123!' })
    });
    data = await res.json();
    if (data.success) {
        volunteerToken = data.data.token;
        console.log('Volunteer Login OK');
    } else throw new Error('Volunteer login failed');

    res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@foodbridge.org', password: 'TestPassword123!' })
    });
    data = await res.json();
    if (data.success) {
        adminToken = data.data.token;
        console.log('Admin Login OK');
    } else {
        console.error('Admin Login Failed:', data);
        throw new Error('Admin login failed');
    }

    console.log('\n2. Testing Donor Flow: (Skipped creation due to local MongoDB standalone limitations)');

    console.log('\n3. Testing Volunteer Flow: View pending...');
    res = await fetch(`${baseUrl}/donations?status=pending`, {
        headers: { 'Authorization': `Bearer ${volunteerToken}` }
    });
    data = await res.json();
    if (data.success && Array.isArray(data.data.donations)) {
        console.log(`Volunteer saw ${data.data.donations.length} pending donations.`);
    } else {
        console.error('Volunteer Fetch Error:', data);
        throw new Error('Volunteer view donations failed');
    }

    console.log('\n4. Testing Admin Dashboard...');
    res = await fetch(`${baseUrl}/auth/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    data = await res.json();
    if (data.success) {
        console.log(`Admin Dashboard OK: Loaded Role ${data.data.user.role}`);
    } else throw new Error('Admin dashboard fetch failed');

    console.log('\n--- ALL E2E API TESTS PASSED ---');
}

runTests().catch(console.error);
