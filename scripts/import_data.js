require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const fs = require('fs');

const User = require('./backend/models/User');
const Donation = require('./backend/models/Donation');
const Delivery = require('./backend/models/Delivery');
const MealServer = require('./backend/models/MealServer');
const InventoryLog = require('./backend/models/InventoryLog');
const Volunteer = require('./backend/models/Volunteer');

async function importData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foodbridge');
        console.log('MongoDB Connected');

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Donation.deleteMany({});
        await Delivery.deleteMany({});
        await MealServer.deleteMany({});
        await InventoryLog.deleteMany({});
        await Volunteer.deleteMany({});
        console.log('Old data cleared.');

        // Note: Simple CSV parsing (assumes no commas in values)
        function parseCSV(filename) {
            const raw = fs.readFileSync(filename, 'utf-8').trim().split('\n');
            const headers = raw[0].split(',');
            return raw.slice(1).map(line => {
                const values = line.split(',');
                let obj = {};
                headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
                return obj;
            });
        }

        const users = parseCSV('users.csv');
        console.log(`Parsed ${users.length} users`);
        await User.insertMany(users.map(u => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
            firstName: u.firstName,
            lastName: u.lastName
        })));
        console.log('Users imported');

        const donations = parseCSV('donations.csv');
        console.log(`Parsed ${donations.length} donations`);
        await Donation.insertMany(donations.map(d => ({
            _id: d._id,
            donor_id: d.donor_id,
            donorName: d.donorName,
            address: d.address,
            city: d.city,
            state: d.state,
            zip: d.zip,
            pickup_datetime: new Date(),
            status: d.status,
            priority: d.priority,
            notes: d.notes,
            items: [{ itemName: 'Test Item', category: 'Cooked Food', quantity: 10, unit: 'kg' }]
        })));
        console.log('Donations imported');

        const deliveries = parseCSV('deliveries.csv');
        console.log(`Parsed ${deliveries.length} deliveries`);
        await Delivery.insertMany(deliveries.map(d => ({
            delivery_id: d.delivery_id,
            donation_id: d.donation_id,
            volunteer_id: d.volunteer_id,
            ngo_id: d.ngo_id,
            delivery_status: d.delivery_status,
            pickup_time: new Date(d.pickup_time),
            delivery_time: new Date(d.delivery_time),
            deliveryNotes: d.deliveryNotes
        })));
        console.log('Deliveries imported');

        const mealServers = parseCSV('meal_servers.csv');
        console.log(`Parsed ${mealServers.length} meal servers`);
        await MealServer.insertMany(mealServers.map(m => ({
            _id: m._id,
            ngo_id: m.ngo_id,
            organization_name: m.organization_name,
            contact_person: m.contact_person,
            phone: m.phone,
            city: m.city,
            address: m.address,
            capacity: Number(m.capacity),
            mealsServedDaily: Number(m.mealsServedDaily),
            active: m.active === 'true'
        })));
        console.log('Meal Servers imported');

        const inventoryLogs = parseCSV('inventory_logs.csv');
        console.log(`Parsed ${inventoryLogs.length} inventory logs`);
        await InventoryLog.insertMany(inventoryLogs.map(l => ({
            mealServer: l.mealServer,
            donation_id: l.donation_id,
            itemName: l.itemName,
            category: l.category,
            quantity: Number(l.quantity),
            unit: l.unit,
            operationType: l.operationType,
            loggedBy: l.loggedBy,
            city: l.city,
            notes: l.notes
        })));
        console.log('Inventory Logs imported');

        console.log('All data imported successfully!');
        process.exit();
    } catch (error) {
        console.error('Import Failed:', error);
        process.exit(1);
    }
}

importData();