
const express = require('express');
const app = express();
app.use(express.json()); // Ensure body-parser setup for JSON is included
const PORT = process.env.PORT || 3000;

const serviceAccount = require('/Users/sabrinajamil/Desktop/swe-demo1/pharmpath-6af52-firebase-adminsdk-w4oqv-7867b52c12.json'); //link your own FireBase private key
var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pharmpath-6af52-default-rtdb.firebaseio.com"
});

// Assuming admin is correctly initialized elsewhere with the service account
const db = admin.firestore();

let userState = {
    loggedIn: true,
    hasMedicalHistory: true,
    isAccountActive: true,
    medicalHistory: [],
};

async function addTransactionToFirestore(userID, medicineName, medicineId, quantity, cost, date, time) {
    // Reference to the user's document in Firestore
    const userRef = db.collection('Medicine Pickup').doc(userID);

    // Creating the transaction object
    const transaction = {
        medicineName,
        medicineId,
        quantity,
        cost,
        date,
        time,
        details: `${date} - ${medicineName} (ID: ${medicineId}, Quantity: ${quantity}) - $${cost}`
    };

    // Updating the user's document with the new transaction
    // Assuming there's a sub-collection for transactions
    try {
        await userRef.collection('transactions').add(transaction);
        console.log('Transaction added to Firestore successfully.');
        return { success: true, message: 'Transaction added successfully.' };
    } catch (error) {
        console.error('Error adding transaction to Firestore:', error);
        return { success: false, message: error.message };
    }
}


function makePurchase(state, medicineName, medicineId, quantity, cost) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    return addTransaction(state, medicineName, medicineId, quantity, cost, date, time);
}

// Adjusted POST /purchaseMedicine endpoint
app.post('/Medicine Pickup', async (req, res) => {
    // Ensure the user's state meets the requirements to make a purchase
    if (!userState.loggedIn || !userState.hasMedicalHistory || !userState.isAccountActive) {
        return res.status(403).json({ error: "User is not permitted to make a purchase." });
    }

    const { medicineName, quantity, cost } = req.body; 
    const medicineId = `tx${userState.medicalHistory.length + 1}`; // Simple ID generation logic

    // Use the current state to make a purchase
    userState = makePurchase(userState, medicineName, medicineId, quantity, cost);

    res.json({ message: 'Purchase recorded successfully', purchaseID: medicineId });
});

app.get('/userPurchases/', async (req, res) => {
    const userID = req.params.userID;

    try {
        const userDoc = db.collection('Medicine Pickup').doc(userID);
        const purchasesSnapshot = await userDoc.collection('purchases').get();

        if (purchasesSnapshot.empty) {
            return res.status(404).json({ message: 'No purchases found for the given user ID.' });
        }

        let purchases = [];
        purchasesSnapshot.forEach(doc => {
            let purchase = doc.data();
            purchase.id = doc.id; // Optionally include the document ID
            purchases.push(purchase);
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
