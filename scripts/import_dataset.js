const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATASET_DIR = path.join(__dirname, 'dataset');

async function importUsers() {
    const data = fs.readFileSync(path.join(DATASET_DIR, 'users.csv'), 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',');
    const docs = lines.slice(1).map(line => {
        const v = line.split(',');
        const doc = {
            _id: v[0],
            email: v[1],
            password: v[2],
            role: v[3],
            firstName: v[4],
            lastName: v[5],
            name: `${v[4]} ${v[5]}`,
            organization: { name: v[6] },
            city: v[7],
            address: { city: v[7], state: 'TestState' },
            phone: v[8],
            donorInfo: { totalDonations: (v[3] === 'donor' ? 1 : 0), mealsProvided: (v[3] === 'donor' ? 40 : 0) },
            volunteerInfo: { completedPickups: (v[3] === 'volunteer' ? 1 : 0), rating: 5, isAvailable: true },
            ngoInfo: { beneficiaries: (v[3] === 'ngo' ? 500 : 0), isVerified: true },
            status: 'active'
        };
        return doc;
    });
    const coll = mongoose.connection.collection('users');
    await coll.deleteMany({});
    await coll.insertMany(docs);
    console.log('Imported Users');
}

async function importDonations() {
    const data = fs.readFileSync(path.join(DATASET_DIR, 'donations.csv'), 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const docs = lines.slice(1).map(line => {
        const v = line.split(',');
        return {
            _id: v[0],
            donor_id: v[1],
            donorName: v[2],
            address: v[3],
            city: v[4],
            state: v[5],
            zip: v[6],
            status: v[7],
            priority: v[8],
            notes: v[9],
            items: [{ itemName: v[10], category: v[11], quantity: v[12], unit: v[13] }],
            pickup_datetime: new Date(),
            impact: { estimatedServings: 40, weightKg: 10 }
        };
    });
    const coll = mongoose.connection.collection('donations');
    await coll.deleteMany({});
    await coll.insertMany(docs);
    console.log('Imported Donations');
}

async function runImport() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/foodbridge');
        await importUsers();
        await importDonations();
        
        // Simple ones
        const simpleFiles = [
            { coll: 'volunteers', file: 'volunteers.csv' },
            { coll: 'deliveries', file: 'deliveries.csv' },
            { coll: 'mealservers', file: 'meal_servers.csv' },
            { coll: 'inventorylogs', file: 'inventory_logs.csv' }
        ];

        for (const f of simpleFiles) {
            const data = fs.readFileSync(path.join(DATASET_DIR, f.file), 'utf8');
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',');
            const docs = lines.slice(1).map(line => {
                const values = line.split(',');
                const doc = {};
                headers.forEach((h, i) => doc[h.trim()] = values[i]);
                return doc;
            });
            const coll = mongoose.connection.collection(f.coll);
            await coll.deleteMany({});
            await coll.insertMany(docs);
            console.log(`Imported ${f.coll}`);
        }

        console.log('--- All data imported mapping correctly ---');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
runImport();
