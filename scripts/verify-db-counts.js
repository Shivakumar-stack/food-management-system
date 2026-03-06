const mongoose = require('mongoose');

async function verifyCounts() {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodbridge');
    
    const collections = ['users', 'donations', 'volunteers', 'deliveries', 'mealservers', 'inventorylogs'];
    
    for (const col of collections) {
        const count = await mongoose.connection.db.collection(col).countDocuments();
        console.log(`${col}: ${count} records`);
    }

    await mongoose.disconnect();
}

verifyCounts().catch(console.error);
