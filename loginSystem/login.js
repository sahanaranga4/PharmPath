const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK with appropriate credentials
const serviceAccount = require('./fireBasekey.json'); //link your own FireBase private key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pharmpath-6af52-default-rtdb.firebaseio.com"
});
const db = admin.firestore();

// For parsing JSON bodies
app.use(bodyParser.json());

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const snapshot = await db.collection('Users').where('Username', '==', username).where('Password', '==', password).get();
      if (snapshot.empty) {
          res.status(401).json({ message: 'Invalid credentials' });
      } else {
          snapshot.forEach(doc => {
              // Store user information in session
              req.session.user = doc.data();
              res.json({ message: 'Login successful!', userID: doc.data().UserID });
          });
      }
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Function to generate a random 3-digit integer userID
function generateUniqueUserID() {
  return Math.floor(100 + Math.random() * 900);
}

// Function to check if a userID already exists in the database
async function checkIfUserExists(userID) {
  const doc = await db.collection('Users').doc(userID.toString()).get();
  return doc.exists;
}

// User creation route
app.post('/createUser', async (req, res) => {
    const { username, password, firstname, lastname, email, address, city, state, zip, dob } = req.body;
    
    let userID = generateUniqueUserID();
    let userExists = await checkIfUserExists(userID);

    // Keep generating a new userID until it's unique
    while (userExists) {
        userID = generateUniqueUserID();
        userExists = await checkIfUserExists(userID);
    }

    try {
        await db.collection('Users').doc(userID.toString()).set({
            UserID: userID,
            Username: username,
            Password: password,
            Firstname: firstname,
            Lastname: lastname,
            Address: address,
            City: city,
            State: state,
            Email: email,
            Zip: zip,
            DOB: dob
        });
        res.json({ message: 'User created successfully', userID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const authenticateUser = (req, res, next) => {
    if (req.session && req.session.user) {
        // User is authenticated
        next();
    } else {
        // User is not authenticated
        res.status(401).json({ error: 'Unauthorized access' });
    }
};

// User page route with authentication middleware
app.get('/user/:userID', authenticateUser, async (req, res) => {
    const { userID } = req.params;
    const loggedInUserID = req.session.user.UserID;
    const loggedInUserIDString = loggedInUserID.toString();
    if (userID !== loggedInUserIDString) {
        res.status(401).json({ error: 'Unauthorized access, you are not logged in as userID you are accessing!'});
        return;
    }
    try {
        const doc = await db.collection('Users').doc(userID).get();
        if (!doc.exists) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.json({ user: doc.data() });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Still need to implement input error handling

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

