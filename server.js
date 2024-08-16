const express = require('express');
const cors = require('cors');
const { connectToDb, getDb } = require('./db');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/players', async (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).send({ error: 'Player name is required' });
    }

    // Insert the new player into the database
    const result = await db.collection('players').insertOne({ name, wins: 0, losses: 0, totalPoints: 0 });

    // Respond with the newly added player
    res.status(201).send({
      _id: result.insertedId,
      name,
      wins: 0,
      losses: 0,
      totalPoints: 0,
    });
  } catch (error) {
    // Log the error and send a generic error message
    console.error('Error adding player:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

app.put('/api/players/:id/update', async (req, res) => {
  const { id } = req.params;
  const { result, points } = req.body;

  try {
    const db = getDb();
    const playerId = new ObjectId(id);
    const player = await db.collection('players').findOne({ _id: playerId });

    if (!player) {
      return res.status(404).send('Player not found');
    }

    // Update the player
    const updateData = {};
    if (result === 'win') {
      updateData.wins = player.wins + 1;
    } else if (result === 'loss') {
      updateData.losses = player.losses + 1;
    }

    updateData.totalPoints = player.totalPoints + points;

    await db.collection('players').updateOne({ _id: playerId }, { $set: updateData });

    // Send the updated player data as the response
    const updatedPlayer = await db.collection('players').findOne({ _id: playerId });
    res.send(updatedPlayer);
  } catch (error) {
    console.error('Error updating player score:', error);
    res.status(500).send('Error updating player score');
  }
});

app.get('/api/players', async (req, res) => {
  const db = getDb();
  const players = await db.collection('players').find({}).toArray();
  res.status(200).json(players);
});

app.post('/api/teams', async (req, res) => {
  // Logic for assigning players to teams
});

connectToDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});