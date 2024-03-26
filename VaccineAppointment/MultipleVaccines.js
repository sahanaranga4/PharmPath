var prompt = require("prompt");
var firebase = require("firebase-admin");
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const hostname = 'localhost';
const port = 3018;
const serviceAccount = require("./Key.json");


firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://pharmpath-6af52-default-rtdb.firebaseio.com'
});

const db = firebase.firestore();
const apptRef = db.collection('VaccinationAppts');
const userRef = db.collection('Users');


const server = http.createServer((req, res) => {
    req.on('data', chunk => {
        body.push(chunk);
    });
    req.on('end', () => {
        const multipleVaccines = multipleVaccines(username, password, email, date, time, vaccine_1, res);
    });
});
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
  
          // Add the appointment to the database
          db.collection('VaccinationAppts').add({ 
            //adjust what is being added based on VaccinationAppts data table
            ApptDT: apptDateTime,
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
async function multipleVaccines(username, password, email, date, time, vaccine_1,res){
	//here the initiating actor sends the username/password
	//this data is sent to the subroutine “login” (UC-1) (participating actor) for validation. 
	//Once the data validation for login is complete, the user is presented with a vaccine appointment screen, which has add/edit appointment buttons. Once  the “add appointment” has been selected, it displays the available appointments for the next 15 days.
    //Must schedule for appointment first
	scheduleAppointment(username, password, email, date, time);
            //Check interaction of the vaccine with the patients health history using the database.
        //if no interactions:
        var nextappt = false;
        var vaccine_2;
        
        while(nextappt = true){
            prompt("Would you like to schedule another vaccine?", vaccine_2);
            let vaccine_snapshot = await db.collection('VaccineInteractions')
                .where('Vaccine1', '==', vaccine_1)
                .where('Vaccine2', '==', vaccine_2)
                .get();
            if(vaccine_snapshot = false){
                
                errorMessage = "This vaccine is not suitable for you. Please select another vaccine";
                sendErrorResponse(res, 400, errorMessage);
            
        //Check for interactions between vaccinations
            }else{
                vaccineCount++;
                successMessage = "Vaccine successfully scheduled";
                sendOKResponse(res, statusCode, successMessages)
            }
            
        }
        return getConfirmationCode();
    }
    



 //Once the user is done, display the confirmation code. 


function sendErrorResponse(res, statusCode, errorMessage) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
    res.write(errorMessage);
    res.end();
}

function sendOKResponse(res, statusCode, successMessages) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
    res.write(successMessages);
    res.end();
}
//Once the user is done, display the confirmation code. 
function getConfirmationCode(){
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let count = 0;
    while (count < 6) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      count += 1;
    }
    return result;
}
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
