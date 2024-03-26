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

  if (req.method === 'POST' && pathname === '/scheduleAppointment') {
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
        //schedule appointment function to take in user input data
        result = await scheduleAppointment(username, password, email, date, time, vaccine);
      }
      if(result === 'Appointment scheduled successfully'){
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      }
      else{
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      }
      
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
    return 'Missing username, password, time, date, or email';
  }

  // Parse the date and time strings into a Date object
  const [year, month, day] = date.split('-').map(Number);
  //validate date before proceeding
  
  if(year.length < 4 || month.length > 2 || day.length > 2){
    return("Please format the date in YYYY-MM-DD format.");
  }
  
  if(month > 12){
      return("Invalid month");
  }
  else if(month == 2 && (year%4 !== 0) && (day == 29)){
    return("Not a valid date");
  }
  const [hours, minutes, seconds] = time.split(':').map(Number);

  // subtract month from value because of JS month formatting
  const apptDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
  //console.log(apptDateTime);
  const snapshot = await db.collection('VaccinationAppts')
                            .where('ApptDT', '==', apptDateTime)
                            .get();
  if (!snapshot.empty) {
    return("Appointment slot not available. Please choose another date or time.");
  }
//new addition to github
  let vaccine_snapshot = await db.collection('Vaccine')
                           .where('Vaccine', '==', vaccine)
                           .get();
          if(vaccine_snapshot.empty){
            return("Vaccine is either invalid or not available. Please choose another vaccine.");
          }
  const apptID = uuidv4();
  const confCode = `dsanjkda${apptID}`;
  let userID = 0;
  if (!username || !password) {
    userID = Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  } else {
    userID = await findUserID(username, password);
  }
  await db.collection('VaccinationAppts').add({
    ApptID: apptID,
    ApptDT: apptDateTime,
    ConfCode: confCode,
    Doctor: 'Smith',
    UserID: userID,
    Vaccine: vaccine
  });
  return("Appointment scheduled successfully");
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
    return null;
  }
}

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
