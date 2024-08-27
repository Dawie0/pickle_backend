const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

const connectToDatabase = async () => {
  try {
    await client.connect();
    db = client.db('playersdb');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process if unable to connect to database
  }
};

// Middleware to ensure the database connection is available
const ensureDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).send({ error: 'Database connection is not initialized' });
  }
  next();
};

app.get('/', (req, res) => {
  res.send('API is running SMOOOOOTHLY');
});

app.post('/api/players', ensureDbConnection, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).send({ error: 'Player name is required' });
    }

    const result = await db.collection('players').insertOne({ name, wins: 0, losses: 0, totalPoints: 0 });

    res.status(201).send({
      _id: result.insertedId,
      name,
      wins: 0,
      losses: 0,
      totalPoints: 0,
    });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

app.put('/api/players/:id/update', ensureDbConnection, async (req, res) => {
  const { id } = req.params;
  const { result, points } = req.body;

  try {
    const playerId = new ObjectId(id);
    const player = await db.collection('players').findOne({ _id: playerId });

    if (!player) {
      return res.status(404).send('Player not found');
    }

    const updateData = {};
    if (result === 'win') {
      updateData.wins = player.wins + 1;
    } else if (result === 'loss') {
      updateData.losses = player.losses + 1;
    }

    updateData.totalPoints = player.totalPoints + points;

    await db.collection('players').updateOne({ _id: playerId }, { $set: updateData });

    const updatedPlayer = await db.collection('players').findOne({ _id: playerId });
    res.send(updatedPlayer);
  } catch (error) {
    console.error('Error updating player score:', error);
    res.status(500).send('Error updating player score');
  }
});

app.get('/api/players', ensureDbConnection, async (req, res) => {
  try {
    const players = await db.collection('players').find({}).toArray();

    if (players.length === 0) {
      return res.status(404).json({ message: 'No players found' });
    }

    res.status(200).json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tournament', ensureDbConnection, async (req, res) => {
  try {
    const tournament = await db.collection('tournament').find({}).toArray();

    if (tournament.length === 0) {
      return res.status(404).json({ message: 'No tournaments found' });
    }

    res.status(200).json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/generate-tournament', ensureDbConnection, async (req, res) => {
  try {
    await db.collection('tournament').deleteMany({});

    const players = await db.collection('players').find({}).toArray();
    const playerNames = players.map(player => player.name);

    let teams = [];
    for (let i = 0; i < playerNames.length; i++) {
      for (let j = i + 1; j < playerNames.length; j++) {
        teams.push([playerNames[i], playerNames[j]]);
      }
    }

    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    const matches = [];

    // for (let numMatches = 0; numMatches < playerNames.length - 1; numMatches++) {
    //   let usedPlayers = [];
    //   let matchGames = {};

    //   const team1Index = Math.floor(Math.random() * teams.length);
    //   usedPlayers.push(...teams[team1Index]);
    //   teams.splice(team1Index, 1);

    //   for (let teamLoop = 0; teamLoop <= 2; teamLoop++) {
    //     for (let teamsIndex = 0; teamsIndex < teams.length; teamsIndex++) {
    //       if (!teams[teamsIndex].some(name => usedPlayers.includes(name))) {
    //         usedPlayers.push(...teams[teamsIndex]);
    //         teams.splice(teamsIndex, 1);
    //         break;
    //       }
    //     }
    //   }

    //   matchGames.matchNumber = numMatches + 1;
    //   matchGames.game1 = {
    //     game_number: 'Game 1',
    //     team1: usedPlayers.slice(0, 2),
    //     team2: usedPlayers.slice(2, 4),
    //   };
    //   matchGames.game2 = {
    //     game_number: 'Game 2',
    //     team3: usedPlayers.slice(4, 6),
    //     team4: usedPlayers.slice(6, 8),
    //   };
    //   matches.push(matchGames);
    // }
    for (let numMatches = 0; numMatches < playerNames.length - 1; numMatches++) {
      let usedPlayers = new Set(); // Using Set to keep track of used players
      let matchGames = { matchNumber: numMatches + 1 };

      let matchTeams = [];

      while (matchTeams.length < 4 && teams.length > 0) {
        const teamIndex = teams.findIndex(
          team => !team.some(player => usedPlayers.has(player))
        );
        
        if (teamIndex !== -1) {
          matchTeams.push(teams[teamIndex]);
          usedPlayers.add(teams[teamIndex][0]);
          usedPlayers.add(teams[teamIndex][1]);
          teams.splice(teamIndex, 1);
        } else {
          break; // Exit if no valid team can be found
        }
      }

      // Ensure each game has 2 teams
      if (matchTeams.length === 4) {
        matchGames.game1 = {
          game_number: 'Game 1',
          team1: matchTeams[0],
          team2: matchTeams[1],
        };
        matchGames.game2 = {
          game_number: 'Game 2',
          team1: matchTeams[2],
          team2: matchTeams[3],
        };
        matches.push(matchGames);
      } else {
        console.log('Not enough teams to create a full match');
        break; // Exit if not enough teams to create a match
      }
    }

    await db.collection('tournament').insertMany(matches);
    res.status(201).send({ message: 'Tournament generated successfully', matches });
  } catch (error) {
    console.error('Error generating tournament:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

app.post('/api/tournament/remove-game', ensureDbConnection, async (req, res) => {
  try {
    const { matchNumber, gameNumber } = req.body;

    const match = await db.collection('tournament').findOne({ matchNumber });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (gameNumber === 'Game 1') {
      delete match.game1;
    } else if (gameNumber === 'Game 2') {
      delete match.game2;
    }

    if (!match.game1 && !match.game2) {
      await db.collection('tournament').deleteOne({ matchNumber });
    } else {
      const updateFields = {};
      if (!match.game1) updateFields.game1 = "";
      if (!match.game2) updateFields.game2 = "";

      if (Object.keys(updateFields).length > 0) {
        await db.collection('tournament').updateOne(
          { matchNumber },
          { $unset: updateFields }
        );
      }
      await db.collection('tournament').updateOne(
        { matchNumber },
        { $set: match }
      );
    }

    res.status(200).json({ message: 'Game removed successfully' });
  } catch (error) {
    console.error('Error removing game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tournament/clear', ensureDbConnection, async (req, res) =>{
  try {
    await db.collection('tournament').deleteMany({});
    res.status(200).json({ message: 'Tournament cleared successfully' });
    } catch (error) {
      console.error('Error clearing tournament:', error);
      res.status(500).json({ error: 'Internal server error' });
      }
})

app.post('/api/players/clear', ensureDbConnection, async (req, res) =>{
  try {
    await db.collection('players').deleteMany({});
    res.status(200).json({ message: 'Players cleared successfully' });
    } catch (error) {
      console.error('Error clearing players:', error);
      res.status(500).json({ error: 'Internal server error' });
      }
})

// Start the server after ensuring the database connection is established
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on PORT ${PORT}`);
  });
});