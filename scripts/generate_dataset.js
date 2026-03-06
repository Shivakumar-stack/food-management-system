const fs = require('fs');
const path = require('path');

const DATASET_DIR = path.join(__dirname, 'dataset');
const RECORDS_COUNT = 310;

if (!fs.existsSync(DATASET_DIR)) {
    fs.mkdirSync(DATASET_DIR);
}

function generateObjectId() {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

const donorIds = [];
const volunteerIds = [];
const ngoIds = [];
const donationIds = [];
const mealServerIds = [];

// 1. Users
function generateUsers() {
    let csv = "_id,email,password,role,firstName,lastName,organizationName,city,phone\n";
    for (let i = 1; i <= RECORDS_COUNT; i++) {
        const dId = generateObjectId();
        donorIds.push(dId);
        csv += `${dId},donor${i}@foodbridge.com,password123,donor,Donor,${i},Donor Org ${i},TestCity,555-010${i}\n`;

        const vId = generateObjectId();
        volunteerIds.push(vId);
        csv += `${vId},volunteer${i}@foodbridge.com,password123,volunteer,Volunteer,${i},,TestCity,555-020${i}\n`;

        const nId = generateObjectId();
        ngoIds.push(nId);
        csv += `${nId},ngo${i}@foodbridge.com,password123,ngo,NGO,${i},Food Help ${i} Org,TestCity,555-030${i}\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'users.csv'), csv);
    console.log('users.csv generated');
}

// 2. Volunteers
function generateVolunteers() {
    let csv = "_id,user,firstName,lastName,phone,city\n";
    for (let i = 0; i < RECORDS_COUNT; i++) {
        csv += `${generateObjectId()},${volunteerIds[i]},Volunteer,${i+1},555-020${i},TestCity\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'volunteers.csv'), csv);
    console.log('volunteers.csv generated');
}

// 3. Donations
function generateDonations() {
    let csv = "_id,donor_id,donorName,address,city,state,zip,status,priority,notes,itemName,category,quantity,unit\n";
    for (let i = 0; i < RECORDS_COUNT; i++) {
        const donId = generateObjectId();
        donationIds.push(donId);
        csv += `${donId},${donorIds[i]},Donor ${i+1},${i+100} Charity Ln,TestCity,TestState,11223,closed,high,Batch generated,Meal Pack ${i+1},Cooked Food,25,servings\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'donations.csv'), csv);
    console.log('donations.csv generated');
}

// 4. Meal Servers
function generateMealServers() {
    let csv = "_id,ngo_id,organization_name,contact_person,phone,city,address,capacity,mealsServedDaily\n";
    for (let i = 0; i < RECORDS_COUNT; i++) {
        const msId = generateObjectId();
        mealServerIds.push(msId);
        csv += `${msId},${ngoIds[i]},Food Help ${i+1} Org,Contact ${i+1},555-030${i},TestCity,${i+200} NGO Blvd,1000,200\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'meal_servers.csv'), csv);
    console.log('meal_servers.csv generated');
}

// 5. Deliveries
function generateDeliveries() {
    let csv = "delivery_id,donation_id,volunteer_id,ngo_id,delivery_status,pickup_time,delivery_time,deliveryNotes\n";
    for (let i = 0; i < RECORDS_COUNT; i++) {
        csv += `DEL-${i+1000},${donationIds[i]},${volunteerIds[i]},${ngoIds[i]},delivered,2024-03-01T09:00:00Z,2024-03-01T11:00:00Z,Success\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'deliveries.csv'), csv);
    console.log('deliveries.csv generated');
}

// 6. Inventory Logs
function generateInventoryLogs() {
    let csv = "mealServer,donation_id,itemName,category,quantity,unit,operationType,loggedBy,city\n";
    for (let i = 0; i < RECORDS_COUNT; i++) {
        csv += `${mealServerIds[i]},${donationIds[i]},Meal Pack ${i+1},Cooked Food,25,servings,received,${ngoIds[i]},TestCity\n`;
    }
    fs.writeFileSync(path.join(DATASET_DIR, 'inventory_logs.csv'), csv);
    console.log('inventory_logs.csv generated');
}

generateUsers();
generateVolunteers();
generateDonations();
generateMealServers();
generateDeliveries();
generateInventoryLogs();
console.log('--- Refined Dataset complete ---');
