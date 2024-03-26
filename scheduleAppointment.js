const http = require('http');
const url = require('url');
const querystring = require('querystring');
const firebase = require('firebase-admin');

const serviceAccount = require('./serviceAccount.json'); //replace with your own key

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount)
});

const db = firebase.firestore();

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url);
  const queryParams = querystring.parse(query);

  if (req.method === 'POST' && pathname === '/scheduleAppointment') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const { username, password, email, date, time } = JSON.parse(body);
      const loggedIn = await login(username, password);
      let result;
      if (loggedIn) {
        result = await scheduleAppointment(username, password, email, date, time);
      } else {
        result = 'Invalid credentials';
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    });
  } else if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Welcome to the appointment scheduling service.');
  } else if (req.method === 'GET' && pathname === '/UserInformation') {
    const { username, password } = queryParams;
    viewInformation(username, password)
      .then(result => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(result);
      })
      .catch(error => {
        console.error('Error getting user information:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

function login(username, password) {
  if (!username || !password) {
    return Promise.resolve(false); // Return false if username or password is missing
  }

  // Query the 'Users' collection for a user with the provided username and password
  const usersRef = db.collection('Users');
  return usersRef.where('Username', '==', username)
                 .where('Password', '==', password)
                 .get()
                 .then(snapshot => {
                    if (snapshot.empty) {
                      return false; // No matching user found
                    } else {
                      return true; // Matching user found
                    }
                 })
                 .catch(error => {
                    console.error('Error searching for user:', error);
                    return false; // Return false in case of error
                 });
}

function viewInformation(username, password) {
  if (!username || !password) {
    return 'Missing username and/or password';
  }

  
  const usersRef = db.collection('Users');
  return usersRef.where('Username', '==', username).get()
    .then(snapshot => {
      if (snapshot.empty) {
        return 'User not found';
      }
      // Remove sensitive data like password before returning
      const userData = snapshot.docs[0].data();
      delete userData.Password;
      return JSON.stringify(userData);
    })
    .catch(error => {
      console.error('Error getting user information:', error);
      return 'Error getting user information';
    });
}

function scheduleAppointment(username, password, email, date, time) {
  return new Promise((resolve, reject) => {
    if (((!username || !password) || !email) || !date || !time) {
      resolve('Missing username or password, or email, or date, or time');
      return;
    }

    // Check if the date and time are available
    const apptDateTime = new Date(`${date}T${time}:00Z`);
    db.collection('VaccinationAppts')
      .where('ApptDT', '==', apptDateTime)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          resolve('Appointment slot not available. Please choose another date or time.');
          return;
        }

        // Generate a unique appointment ID and confirmation code
        const apptID = uuidv4();
        const confCode = `dsanjkda${apptID}`;

        // Add the appointment to the database
        db.collection('VaccinationAppts').add({
          ApptID: apptID,
          ApptDT: apptDateTime,
          ConfCode: confCode,
          Doctor: 'Smith',
          UserID: 125,
          Vaccine: 'COVID-19',
          Username: username,
          Email: email
        })
        .then(() => {
          resolve('Appointment scheduled successfully');
        })
        .catch(error => {
          console.error('Error scheduling appointment:', error);
          reject('Error scheduling appointment');
        });
      })
      .catch(error => {
        console.error('Error checking appointment availability:', error);
        reject('Error scheduling appointment');
      });
  });
}

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
