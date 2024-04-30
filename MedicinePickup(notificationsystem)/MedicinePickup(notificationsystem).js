const admin = require("firebase-admin");
const http = require('http');

// Load Firebase service account credentials
const serviceAccount = require("/Users/navya/Downloads/pharmpath-6af52-firebase-adminsdk-k3ogp-ca0a5ce74a.json")
// Initialize Firebase Admin SDK with credentials and database URL
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pharmpath-6af52-default-rtdb.firebaseio.com",
  // Add Firebase Cloud Messaging configuration
  // Make sure to replace 'YOUR_PROJECT_ID' with your Firebase project ID
  messagingSenderId: "pharmpath-6af52"
});

// Define supported content types for HTTP requests
const supportedContentTypes = ['application/json', 'text/plain'];

// Create an HTTP server
const server = http.createServer((req, res) => {
    // Extract content type from request headers
    const contentType = req.headers['content-type'];
    
    // Check if content type is supported
    if (!contentType || !supportedContentTypes.includes(contentType)) {
        // Respond with an error if content type is unsupported
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Unsupported Content-Type. Supported types: ${supportedContentTypes.join(', ')}`);
        return;
    }

    // Initialize request body
    let body = '';
    
    // Read request body data
    req.on('data', chunk => {
        body += chunk.toString();
    });

    // Process request body when data reading is complete
    req.on('end', () => {
        let parsedBody;
        try {
            // Parse request body based on content type
            switch (contentType) {
                case 'application/json':
                    parsedBody = JSON.parse(body);
                    break;
                case 'text/plain':
                    parsedBody = body;
                    break;
                default:
                    throw new Error('Unsupported Content-Type');
            }
        } catch (error) {
            // Respond with an error if request body parsing fails
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Error parsing request body');
            return;
        }

        // Handle the request based on its type
        handleRequest(parsedBody, res);
    });
});

// Set the port for the server to listen on
const PORT = process.env.PORT || 4000;

// Start the server and log its status
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Function to handle incoming requests
async function handleRequest(data, res) {
    switch (data.type) {
        // Case: Reserve Date
        case 'reserveDate':
            try {
                const confirmation = await reserveDate(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ confirmationCode: confirmation }));
            } catch (error) {
                // Respond with an error if reservation fails
                console.error('Error reserving date:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error reserving date');
            }
            break;
        // Case: Lookup Reservations
        case 'lookupReservations':
            try {
                const patientReservations = await lookupReservations(data.patientIdentifier);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(patientReservations));
            } catch (error) {
                // Respond with an error if reservation lookup fails
                console.error('Error looking up reservations:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error looking up reservations');
            }
            break;
        // Case: Cancel Reservation
        case 'cancelReservation':
            try {
                const cancellationStatus = await cancelReservation(data.confirmationCode);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ cancellationStatus: cancellationStatus }));
            } catch (error) {
                // Respond with an error if reservation cancellation fails
                console.error('Error canceling reservation:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error canceling reservation');
            }
            break;
        // Default case: Invalid request type
        default:
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request type');
    }
}
async function sendNotification(userID, message) {
    try {
        const messagePayload = {
            notification: {
                title: "Appointment Reservation",
                body: message
            },
            token: "user123"// Assuming userId is the FCM token of the user
        };
        await admin.messaging().send(messagePayload);
        console.log("Notification sent successfully!");
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

// Function to reserve a date for medicine pickup
async function reserveDate(data) {
    const db = admin.database();
    const ref = db.ref("Medicine Pickup");
    const appointmentRef = ref.push();
    await appointmentRef.set({
        AppointmentID: appointmentRef.key,
        ConfirmationCode: generateConfirmationCode(),
        MedicineName: data.medicineName,
        PickupTime: data.pickupTime,
        userID: data.userID
    });
    // Send reservation notification
    sendNotification(data.userID, "Your appointment has been reserved successfully!");
    return appointmentRef.key;
}

// Function to send a notification using Firebase Cloud Messaging


// Function to look up reservations for a patient
async function lookupReservations(patientIdentifier) {
    const db = admin.database();
    const ref = db.ref("Medicine Pickup");
    const snapshot = await ref.orderByChild('userID').equalTo(patientIdentifier).once('value');
    const appointments = snapshot.val();
    return appointments ? Object.values(appointments) : [];
}

// Function to cancel a reservation
async function cancelReservation(confirmationCode) {
    const db = admin.database();
    const ref = db.ref("Medicine Pickup");
    const snapshot = await ref.orderByChild('AppointmentID').equalTo(confirmationCode).once('value');
    if (snapshot.exists()) {
        // Retrieve appointment details
        const appointment = Object.values(snapshot.val())[0];
        // Remove appointment
        await snapshot.forEach(childSnapshot => {
            childSnapshot.ref.remove();
        });
        // Send cancellation notification
        sendNotification(appointment.userID, "Your appointment has been canceled.");
        return true;
    } else {
        return false;
    }
}

// Function to generate a confirmation code
function generateConfirmationCode() {
    return Math.random().toString(36).substr(2, 9);
}