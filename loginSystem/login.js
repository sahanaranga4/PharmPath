const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');


const app = express();
const PORT = process.env.PORT || 3000;

const firebaseConfig = {
        //config settings
  };

const clientApp = initializeApp(firebaseConfig);

// Initialize Firebase Admin SDK with appropriate credentials
const serviceAccount = require(''); //link your own FireBase private key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: ""//database URL enter here
});
const db = admin.firestore();

// For parsing JSON bodies
app.use(bodyParser.json());

// Middleware for authentication using JWT
JWT_SECRET = 'l3#hT%uP7K@CvN2s$YqG';
const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Unauthorized access' });
    }
};


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html','login.html'));
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const snapshot = await db.collection('Users').where('Username', '==', username).limit(1).get();
        if (snapshot.empty) {
            return res.status(401).json({ message: 'User does not exist!' });
        }
        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        let passwordMatch = false;
        if (password.startsWith('$2b$10$')) {
            // Password is already hashed with bcrypt
            passwordMatch = user.Password === password; // Direct comparison
        } else {
            // Password needs bcrypt comparison
            passwordMatch = await bcrypt.compare(password, user.Password);
        }

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password!' });
        }
        
        const userID = user.UserID; // Get the userID from the user data
        const token = jwt.sign({ userID }, JWT_SECRET, { expiresIn: '1h' });
        res.header('Authorization', `Bearer ${token}`).json({ message: 'Login successful!', userID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.get('/createUser', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'createUser.html'));
});

// User creation route
app.post('/createUser', async (req, res) => {
    const { username, password, firstname, lastname, email, address, city, state, zip, dob, immunocompromised } = req.body;
    
    // Check if username already exists
    const usernameExists = await checkIfUsernameExists(username);
    if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const emailExists = await checkIfEmailExists(email);
    if (emailExists) {
        return res.status(400).json({ error: 'An account is already using this email!' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique userID
    let userID = generateUniqueUserID();
    let userExists = await checkIfUserExists(userID);

    // Keep generating a new userID until it's unique
    while (userExists) {
        userID = generateUniqueUserID();
        userExists = await checkIfUserExists(userID);
    }

    // Parse immunocompromised value to a Boolean
    const isImmunocompromised = immunocompromised === 'true';

    try {
        // Create the new user document
        await db.collection('Users').doc(userID.toString()).set({
            UserID: userID,
            Username: username,
            Password: hashedPassword,
            Firstname: firstname,
            Lastname: lastname,
            Address: address,
            City: city,
            State: state,
            Email: email,
            Zip: zip,
            DOB: dob,
            Immunocompromised: isImmunocompromised,
            Searchhistory: []
        });
        res.json({ message: 'User created successfully', userID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Function to check if a username already exists in the database
async function checkIfUsernameExists(username) {
    const querySnapshot = await db.collection('Users').where('Username', '==', username).get();
    return !querySnapshot.empty;
}

async function checkIfEmailExists(email) {
    const querySnapshot = await db.collection('Users').where('Email', '==', email).get();
    return !querySnapshot.empty;
}

// Function to generate a random 3-digit integer userID
function generateUniqueUserID() {
    return uuidv4().substr(0, 8); // Get the first 8 characters of the UUID
}

// Function to check if a userID already exists in the database
async function checkIfUserExists(userID) {
    const doc = await db.collection('Users').doc(userID.toString()).get();
    return doc.exists;
}

app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'user.html'));
});

// User page route with JWT authentication middleware
app.get('/user/:userID', authenticateJWT, async (req, res) => {
    const { userID } = req.params;
    const loggedInUserID = req.user.userID;
    if (userID !== loggedInUserID) {
        return res.status(401).json({ error: 'Unauthorized access, you are not logged in as userID you are accessing!'});
    }
    try {
        const doc = await db.collection('Users').doc(userID).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user: doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'edit.html'));
});

// Edit user route with JWT authentication middleware
app.put('/edit/:userID', authenticateJWT, async (req, res) => {
    const { userID } = req.params;
    const loggedInUserID = req.user.userID;

    if (userID !== loggedInUserID) {
        return res.status(401).json({ error: 'Unauthorized access, you are not logged in as the userID you are attempting to edit!' });
    }

    const { currentPassword, newPassword, ...newData } = req.body; // Assuming the request body contains the updated user data, current password, and new password

    // Check if the password matches the user's password in the database
    const user = await db.collection('Users').doc(userID).get();
    const userData = user.data();
    const storedPassword = userData.Password;

    // Compare the provided current password with the stored password using bcrypt
    const passwordMatch = await bcrypt.compare(currentPassword, storedPassword);

    if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    try {
        // If a new password is provided, update the password
        if (newPassword) {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            await db.collection('Users').doc(userID).update({ Password: hashedNewPassword });
        }

        if (newData.hasOwnProperty('Immunocompromised')) {
            newData.Immunocompromised = newData.Immunocompromised === 'true';
        }

        // Remove CurrentPassword and NewPassword from newData
        delete newData.CurrentPassword;
        delete newData.NewPassword;

        // Update user data (excluding password) if there are other fields to update
        if (Object.keys(newData).length > 0) {
            await db.collection('Users').doc(userID).update(newData);
        }



        res.json({ message: 'User data updated successfully' });
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ error: 'An error occurred while updating user data' });
    }
});


CLIENT_ID = ""; //GOOGLE CLIENT ID
const client = new OAuth2Client(CLIENT_ID);

// Route for signing up with Google
app.post('/signUpGoogle', async (req, res) => {
    const { credential } = req.body; // Assuming you pass the credential from the client
  
    try {
      // Verify the credential
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: '', // Your CLIENT_ID from Google Cloud Console
      });
      const payload = ticket.getPayload();
      const userid = payload['sub'];
  
      // Check if the user already exists
      const userSnapshot = await db.collection('Users').doc(userid).get();
  
      if (userSnapshot.exists) {
        // User already exists, send back user details
        res.status(200).json({ user: userSnapshot.data() });
      } else {
        // User does not exist, create a new user
        const newUser = {
          UserID: userid, // Use Google UID as UserID
          Username: payload.name,
          Firstname: payload.given_name,
          Lastname: payload.family_name,
          Email: payload.email,
          Searchhistory: []
        };
  
        // Save the new user in Firestore
        await db.collection('Users').doc(userid).set(newUser);
  
        res.status(201).json({ message: 'User created successfully', user: newUser });
      }
    } catch (error) {
      console.error('Error signing up with Google:', error);
      res.status(500).json({ error: 'An error occurred while signing up with Google' });
    }
  });

app.get('/setPassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'setPassword.html'));
});

// Route for setting password
app.post('/setPassword', async (req, res) => {
    const { userID, password } = req.body;

    try {
        // Retrieve user document from the database
        const userDoc = await db.collection('Users').doc(userID).get();

        // Check if the user exists
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user document with the hashed password
        await db.collection('Users').doc(userID).update({
            Password: hashedPassword
        });

        res.json({ message: 'Password set successfully' });
    } catch (error) {
        console.error('Error setting password:', error);
        res.status(500).json({ error: 'An error occurred while setting the password' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

