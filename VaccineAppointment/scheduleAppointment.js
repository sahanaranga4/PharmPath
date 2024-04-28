const http = require('http');
const url = require('url');
const querystring = require('querystring');
const firebase = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const serviceAccount = require('./serviceAccount.json'); //replace with your own key
const errorMessages = [];

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
        result = await scheduleAppointment(username, password, email, date, time, vaccine);
      } else if(!email && !loggedIn) {
        result = 'Invalid credentials';
      }
      else{
        //schedule appointment function to take in user input data
        result = await scheduleAppointment(username, password, email, date, time, vaccine);
      }
      if(result === 'Appointment scheduled successfully'){
        if (result === 'Appointment scheduled successfully') {
          const appointmentDetails = {
            result,
            username,
            date,
            time,
            vaccine
          };
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(appointmentDetails));
        }
      }
      else{
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result }));
      }
      
    });
  } else if (req.method === 'GET' && pathname === '/') {
    // Serve the HTML file
    fs.readFile('index.html', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('what is happening');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
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
  if ((password == null) || (username == null)) {
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
  const [year, month, day] = date.split('-').map(Number);
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
  // Assuming year, month, day, hours, minutes, and seconds are valid integer values
  const secondsOne = 0;// Use parseInt to convert a string to an integer
  const nanoseconds = 0; // Firestore Timestamp requires nanoseconds
  const timestamp = new firebase.firestore.Timestamp(secondsOne, nanoseconds); // Use secondsOne here
  const apptDateTime = new Date(year, month - 1, day, hours, minutes, secondsOne);
  


  const snapshot = await db.collection('VaccinationAppts')
                            .where('ApptDT', '==', apptDateTime)
                            .get();
  if (!snapshot.empty) {
    return("Appointment slot not available. Please choose another date or time.");
  }
  let vaccine_snapshot = await db.collection('Vaccine')
                           .where('Vaccine', '==', vaccine)
                           .get();
          if(vaccine_snapshot.empty){
            return("Vaccine is either invalid or not available. Please choose another vaccine.");
          }
  
  // Round the appointment time to the nearest 30 minutes
  const roundedDateTime = await roundToNearestMinutes(apptDateTime);

  // Check if the appointment time is within the allowed hours (8:00 - 16:59)
  const isWithinHours = await checkAppointmentHours(roundedDateTime);
  if (!isWithinHours) {
    return 'Appointments can only be scheduled between 8:00 and 16:59';
  }
  console.log(vaccine_snapshot);
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

async function roundToNearestMinutes(date) {
  return new Promise((resolve, reject) => {
      try {
          const roundedDate = new Date(date);

          // Get the current minutes
          const minutes = roundedDate.getMinutes();

          // Calculate the remainder when dividing minutes by 30
          const remainder = minutes % 30;

          // Round down to the nearest multiple of 30
          const roundedMinutes = Math.floor(minutes / 30) * 30;

          // Calculate the difference between the rounded and original minutes
          const diffToFloor = minutes - roundedMinutes;
          const diffToCeil = roundedMinutes + 30 - minutes;

          // Determine whether to round up or down based on which is closer
          const roundedMinutesFinal = (diffToFloor < diffToCeil) ? roundedMinutes : (roundedMinutes + 30);

          // Set the minutes to the rounded value
          roundedDate.setMinutes(roundedMinutesFinal);

          // Set seconds and milliseconds to zero
          roundedDate.setSeconds(0);
          roundedDate.setMilliseconds(0);

          // If roundedMinutesFinal equals 60, increment hour and set minutes to zero
          if (roundedMinutesFinal === 60) {
              roundedDate.setHours(roundedDate.getHours() + 1);
              roundedDate.setMinutes(0);
          }

          resolve(roundedDate);
      } catch (error) {
          reject(error);
      }
  });
}

async function checkAppointmentHours(date) {
  date = new Date(date);
  const appointmentHour = date.getHours();
  console.log(date);
  if (appointmentHour < 8 || appointmentHour >= 17) {
      errorMessages.push(`Appointments cannot be sceheduled at ${date}`);
      return false;
  }else{
      return true;
  }
}

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = scheduleAppointment;

