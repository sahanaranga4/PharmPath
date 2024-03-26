const http = require('http');
const url = require('url');
const querystring = require('querystring');
const firebase = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');


const serviceAccount = require('./serviceAccount.json'); //replace with your own key

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount)
});

const db = firebase.firestore();
const userRef = db.collection('Users');
const apptRef = db.collection('VaccinationAppts')
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url);
  const queryParams = querystring.parse(query);

  if (req.method === 'POST' && pathname === '/scheduleAppointment') { //verifying HTTP request and path
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const { username, password, email, date, time, vaccine } = JSON.parse(body);
      const loggedIn = await login(username, password);
      
      let result;
      if (loggedIn) {
        console.log(username);
        console.log(password);
        result = await scheduleAppointment(username, password, email, date, time, vaccine);
      } else if(!email && !loggedIn) {
        result = 'Invalid credentials';
      }
      else{
        result = await scheduleAppointment(username, password, email, date, time, vaccine);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    });
  } else if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Welcome to PharmPath!');
  } else if (req.method === 'GET' && pathname === '/UserInformation') {
    const { username, password } = queryParams;
    try {
      const result = await viewInformation(username, password);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(result);
    } catch (error) {
      console.error('Error getting user information:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

async function login(username, password) {
  if (!username || !password) {
    return false; // Return false if username or password is missing
  }

  // Query the 'Users' collection for a user with the provided username and password
  const usersRef = db.collection('Users');
  const snapshot = await usersRef.where('Username', '==', username)
                                  .where('Password', '==', password)
                                  .get();
  return !snapshot.empty;
}

async function viewInformation(username, password) {
  if (!username || !password) {
    return 'Missing username and/or password';
  }

  const usersRef = db.collection('Users');
  const snapshot = await usersRef.where('Username', '==', username).get();
  if (snapshot.empty) {
    return 'User not found';
  }
  const userData = snapshot.docs[0].data();
  delete userData.Password;
  return JSON.stringify(userData);
}

async function scheduleAppointment(username, password, email, date, time, vaccine) {
  if ((!username || !password || !date || !time) && !email) {
    return 'Missing username, password, time, date, or email'; //function returns if there is parameters missing
  }

  // Parse the date and time strings into a Date object
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);

  // Months are 0-indexed in date js object, so month is month - 1
  const apptDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
  const snapshot = await db.collection('VaccinationAppts')
                            .where('ApptDT', '==', apptDateTime)
                            .get();
  if (!snapshot.empty) {
    return 'Appointment slot not available. Please choose another date or time.';
  }
  //new line added to validate vaccine input
    let vaccine_snapshot = await db.collection('Vaccine')
                           .where('Vaccine', '==', vaccine)
                           .get();
          if(vaccine_snapshot.empty){
            return 'Vaccine is either invalid or not available. Please choose either COVID-19, Measles, or varicella.';
          }
  const apptID = uuidv4();
  const confCode = `dsanjkda${apptID}`;
  let userID = 0;
  if (!username || !password) {
    userID = Math.floor(Math.random() * (999 - 100 + 1)) + 100; //if there is no userID or password generate UserID
  } else {
    userID = await findUserID(username, password);
  }
  await db.collection('VaccinationAppts').add({
    ApptID: apptID,
    ApptDT: apptDateTime,
    ConfCode: confCode,
    Doctor: 'Smith',
    UserID: userID,
    Vaccine: 'COVID-19'
  });
  return 'Appointment scheduled successfully';
}


async function findUserID(username, password) {
  try {
    const snapshot = await userRef.where('Username', '==', username)
                                   .where('Password', '==', password)
                                   .get();
    if (snapshot.empty) {
      console.log('No matching documents.');
      return null;
    } else {
      return snapshot.docs[0].data().UserID;
    }
  } catch (error) {
    console.error('Error finding user ID:', error);
    return 100; //this is temporary until error is resolved
  }
}

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
