const mongoose = require('mongoose');

async function testDB() {
    await mongoose.connect('mongodb://127.0.0.1:27017/foodbridge');
    console.log("Connected to MongoDB");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    await mongoose.disconnect();
}

testDB().catch(console.error);
