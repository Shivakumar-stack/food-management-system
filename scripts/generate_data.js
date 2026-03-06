const fs = require('fs');

const BATCH_SIZE = 300;

function generateObjectId() {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateUsers() {
    let csv = "_id,name,email,password,role,firstName,lastName\n";
    for (let i = 1; i <= BATCH_SIZE; i++) {
        csv += `${generateObjectId()},Donor ${i},donor${i}@example.com,password123,donor,Donor,${i}\n`;
        csv += `${generateObjectId()},Volunteer ${i},volunteer${i}@example.com,password123,volunteer,Volunteer,${i}\n`;
        csv += `${generateObjectId()},NGO ${i},ngo${i}@example.com,password123,ngo,NGO,${i}\n`;
    }
    fs.writeFileSync('users.csv', csv);
    console.log('users.csv generated');
}

function generateDonations() {
    let csv = "_id,donor_id,donorName,address,city,state,zip,status,priority,notes\n";
    for (let i = 1; i <= BATCH_SIZE; i++) {
        csv += `${generateObjectId()},${generateObjectId()},Donor ${i},123 Main St,TestCity,TestState,12345,closed,medium,Batch generated donation\n`;
    }
    fs.writeFileSync('donations.csv', csv);
    console.log('donations.csv generated');
}

function generateDeliveries() {
    let csv = "delivery_id,donation_id,volunteer_id,ngo_id,delivery_status,pickup_time,delivery_time,deliveryNotes\n";
    for (let i = 1; i <= BATCH_SIZE; i++) {
        csv += `DEL-${i},${generateObjectId()},${generateObjectId()},${generateObjectId()},delivered,2024-03-01T10:00:00Z,2024-03-01T12:00:00Z,Safe delivery\n`;
    }
    fs.writeFileSync('deliveries.csv', csv);
    console.log('deliveries.csv generated');
}

function generateMealServers() {
    let csv = "_id,ngo_id,organization_name,contact_person,phone,city,address,capacity,mealsServedDaily,active\n";
    for (let i = 1; i <= Math.min(BATCH_SIZE, 50); i++) {
        csv += `${generateObjectId()},${generateObjectId()},Meal Server ${i},Contact ${i},9876543210,TestCity,456 Side St,500,100,true\n`;
    }
    fs.writeFileSync('meal_servers.csv', csv);
    console.log('meal_servers.csv generated');
}

function generateInventoryLogs() {
    let csv = "mealServer,donation_id,itemName,category,quantity,unit,operationType,loggedBy,city,notes\n";
    for (let i = 1; i <= BATCH_SIZE; i++) {
        csv += `${generateObjectId()},${generateObjectId()},Rice,Raw Ingredients,50,kg,received,${generateObjectId()},TestCity,Stock incoming\n`;
    }
    fs.writeFileSync('inventory_logs.csv', csv);
    console.log('inventory_logs.csv generated');
}

generateUsers();
generateDonations();
generateDeliveries();
generateMealServers();
generateInventoryLogs();
console.log('Data generation complete.');