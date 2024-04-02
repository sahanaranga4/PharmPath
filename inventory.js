const http = require('http');
const url = require('url');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const serviceAccount = require('./newPrivateKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pharmpath-6af52-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const port = 4000;

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);
  if (req.method === 'GET') {
    // Handling GET requests
    if (reqUrl.pathname === '/medicine') {
        const query = reqUrl.query.query;
        const UserID = reqUrl.query.userId; // Extract UserID from query parameters
        searchMedicine(query, res);
    } else if (reqUrl.pathname === '/history') {
        const UserID = reqUrl.query.userId;
        viewHistory(UserID, res);
    } else {
        // Invalid URL
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid URL' }));
    }
}
//this stuff is all you 
  if (reqUrl.pathname === '/reserve' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString(); // Convert buffer to string
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // Call the reserveMedication function with the provided data
        reserveMedication(data.userID, data.medId, data.quantity, res);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
  }
});
// Function to search for medicine
async function searchMedicine(query, res) {
  try {
      const medicinesRef = db.collection('Inventory');
      const snapshot = await medicinesRef.where('Name', '==', query).get();

      if (!snapshot.empty) {
          const medicines = [];
          snapshot.forEach(doc => {
              medicines.push(doc.data());
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, medicines }));

      } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'No medicine found.' }));
      }
  } catch (error) {
      console.error("Error searching for medicine:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
  }
}
async function viewHistory(UserID, res) {
  try {
      const userRef = db.doc(`Users/${UserID}`);
      const userSnapshot = await userRef.get();
      const userData = userSnapshot.data(); 
      const searchHistory = userData.Searchhistory; 

      if (Array.isArray(searchHistory)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, history: searchHistory }));
      } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Search history is either empty or not an array.' }));
      }
  } catch (error) {
      console.error("Error retrieving search history:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
  }
}
//this is also all bhavya
async function reserveMedication(userId, medId, quantity, res) {
  try {
    
    if(!medId){
      throw new Error('no medID');
    }
    const medIdPadded = medId.toString().padStart(3, '0'); // Pad with leading zeros to ensure 3 digits

    // Construct Firestore document reference
    const inventoryRef = db.doc(`Inventory/${medIdPadded}`);

    // Retrieve the current available units
    const medicationSnapshot = await inventoryRef.get();
    if (!medicationSnapshot.exists) {
      throw new Error('Medication not found.');
    }

    const medicationData = medicationSnapshot.data();
    const currentAvailableUnits = medicationData.AvailableUnits;

    // Check if there are enough available units
    if (currentAvailableUnits < quantity) {
      throw new Error('Not enough available units for reservation.');
    }

    // Update available units in the inventory
    await inventoryRef.update({
      AvailableUnits: currentAvailableUnits - quantity
    });

    // Reference to the "reservations" collection
    const reservationsRef = db.collection('reservations');

    // Add reservation details
    await reservationsRef.add({
      userId: userId,
      medId: medIdPadded, // Ensure medId matches Firestore document ID format
      quantity: quantity,
      reservedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Set a timeout to cancel reservation after 3 hours
    setTimeout(async () => {
      await inventoryRef.update({
        AvailableUnits: admin.firestore.FieldValue.increment(quantity) // Increase available units upon cancellation
      });
      console.log("Reservation canceled.");
    }, 3 * 60 * 60 * 1000); // 3 hours in milliseconds

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Medication reserved.' }));
  } catch (error) {
    console.error("Error reserving medication:", error);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

server.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
