const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
