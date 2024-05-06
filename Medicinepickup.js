const admin = require("firebase-admin");
const http = require('http');

const serviceAccount = require("/Users/navya/Downloads/pharmpath-6af52-firebase-adminsdk-k3ogp-ca0a5ce74a.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pharmpath-6af52-default-rtdb.firebaseio.com",
  messagingSenderId: "pharmpath-6af52"
});

const supportedContentTypes = ['application/json', 'text/plain'];

const server = http.createServer((req, res) => {
  
    const contentType = req.headers['content-type'];
  
    if (!contentType || !supportedContentTypes.includes(contentType)) {
        // Respond with an error if content type is unsupported
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Unsupported Content-Type. Supported types: ${supportedContentTypes.join(', ')}`);
        return;
    }

    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        let parsedBody;
        try {

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
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Error parsing request body');
            return;
        }

        handleRequest(parsedBody, res);
    });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
            token: "user123" //any FCM of user
        };
        await admin.messaging().send(messagePayload);
        console.log("Notification sent successfully!");
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

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


async function lookupReservations(patientIdentifier) {
    const db = admin.database();
    const ref = db.ref("Medicine Pickup");
    const snapshot = await ref.orderByChild('userID').equalTo(patientIdentifier).once('value');
    const appointments = snapshot.val();
    return appointments ? Object.values(appointments) : [];
}

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

function generateConfirmationCode() {
    return Math.random().toString(36).substr(2, 9);
}
