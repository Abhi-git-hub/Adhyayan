const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adhyayan';

console.log('Checking MongoDB Atlas connection...');
console.log('Using URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials in logs

// Configure MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  dbName: 'adhyayan',
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Check database info
    const db = mongoose.connection;
    console.log('Database name:', db.name);
    console.log('Host:', db.host);
    console.log('Port:', db.port);
    
    // List collections
    return db.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('\nCollections in the database:');
    if (collections.length === 0) {
      console.log('- No collections found. The database is empty.');
    } else {
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    console.log('\nConnection test completed successfully!');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Error details:', err);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if the MongoDB Atlas URI is correct');
    console.error('2. Ensure your IP address is whitelisted in MongoDB Atlas');
    console.error('3. Verify the username and password are correct');
    console.error('4. Check if the network allows connections to MongoDB Atlas (port 27017)');
  })
  .finally(() => {
    // Close the connection
    mongoose.connection.close();
  }); 