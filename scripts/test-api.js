const http = require('http');

const baseURL = 'http://localhost:5000/api';

const makeRequest = (method, path, data = null, token = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(baseURL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsedData);
                    } else {
                        reject({ status: res.statusCode, data: parsedData });
                    }
                } catch (e) {
                    reject({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
};

async function runTests() {
    try {
        console.log('--- Starting API Testing ---');

        // 1. Create Donor
        const donorData = {
            name: "Donor Test",
            firstName: "Donor",
            lastName: "Test",
            email: `donor${Date.now()}@test.com`,
            password: "password123",
            role: "donor"
        };
        console.log('Registering Donor...');
        const donorReg = await makeRequest('POST', '/auth/register', donorData);
        console.log('Donor Registration Success:', donorReg.success);
        const donorToken = donorReg.data.token;
        const donorId = donorReg.data.user.id;

        // 2. Create Volunteer
        const volunteerData = {
            name: "Volunteer Test",
            firstName: "Volunteer",
            lastName: "Test",
            email: `volunteer${Date.now()}@test.com`,
            password: "password123",
            role: "volunteer"
        };
        console.log('Registering Volunteer...');
        const volunteerReg = await makeRequest('POST', '/auth/register', volunteerData);
        console.log('Volunteer Registration Success:', volunteerReg.success);
        const volunteerToken = volunteerReg.data.token;
        const volunteerUserId = volunteerReg.data.user.id;

        // 3. Make a Donation
        const donationData = {
            items: [{
                itemName: "Test Apples",
                category: "Fruits",
                quantity: "10",
                unit: "kg"
            }],
            address: "123 Fruit Street",
            city: "TestCity",
            state: "TestState",
            zip: "12345",
            pickup_datetime: new Date(Date.now() + 86400000).toISOString(),
            priority: "medium"
        };
        console.log('Creating Donation...');
        const donationRes = await makeRequest('POST', '/donations', donationData, donorToken);
        console.log('Donation Creation Success:', donationRes.success);
        const donationId = donationRes.data._id;

        // 4. Update Volunteer Profile
        const volunteerProfileData = {
            city: "TestCity",
            vehicleType: "car",
            availability: true
        };
        const profileRes = await makeRequest('PUT', '/auth/profile', volunteerProfileData, volunteerToken);
        console.log('Update Success:', profileRes.success);

        // 5. Get Broadcasted Donations as Volunteer
        console.log('Fetching Donations for Volunteer...');
        const availableDonations = await makeRequest('GET', '/donations/volunteer/available', null, volunteerToken);
        console.log('Found Donations:', availableDonations.data ? availableDonations.data.length : 'none');

        // 6. Accept the Donation
        console.log('Volunteer Accepting Donation...');
        const acceptRes = await makeRequest('POST', '/volunteer/accept', { donationId }, volunteerToken);
        console.log('Accept Donation Success:', acceptRes.success);
        
        // 7. Complete the Delivery
        console.log('Volunteer Completing Delivery...');
        const completeRes = await makeRequest('PUT', `/donations/${donationId}/status`, { status: 'closed' }, volunteerToken);
        console.log('Complete Delivery Success:', completeRes.success);

        // 8. Test Volunteer Dashboard
        console.log('Testing Volunteer Dashboard Analytics...');
        const volunteerDashboard = await makeRequest('GET', `/auth/dashboard`, null, volunteerToken);
        console.log('Volunteer Dashboard Success:', volunteerDashboard.success, volunteerDashboard.data.stats);

        // 9. Test Donor Dashboard
        console.log('Testing Donor Dashboard Analytics...');
        const donorDashboard = await makeRequest('GET', `/auth/dashboard`, null, donorToken);
        console.log('Donor Dashboard Success:', donorDashboard.success, donorDashboard.data.stats);

        // 10. Test Admin Dashboard (Creating Admin temporarily)
        const adminData = {
            name: "Admin Test",
            firstName: "Admin",
            lastName: "Test",
            email: `admin${Date.now()}@test.com`,
            password: "password123",
            role: "admin"
        };
        console.log('Registering Admin...');
        const adminReg = await makeRequest('POST', '/auth/register', adminData);
        console.log('Admin Registration Success:', adminReg.success);
        console.log('Testing Admin Dashboard Analytics...');
        const adminDashboard = await makeRequest('GET', `/auth/dashboard`, null, adminReg.data.token);
        console.log('Admin Dashboard Success:', adminDashboard.success, adminDashboard.data.stats);

        console.log('--- All API Tests Completed Successfully ---');
    } catch (error) {
        console.error('--- API Test Failed ---');
        console.error(JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

runTests();
