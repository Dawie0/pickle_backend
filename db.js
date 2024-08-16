const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
let db;

async function connectToDb() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    db = client.db('playersdb'); // Use your database name
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error; // Re-throw error to ensure calling code knows of the failure
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not connected');
  }
  return db;
}

module.exports = { connectToDb, getDb };