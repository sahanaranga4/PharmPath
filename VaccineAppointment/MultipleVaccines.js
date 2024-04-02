var prompt = require("prompt-sync");
var firebase = require("firebase-admin");
const http = require('http');
const url = require('url');
const querystring = require('querystring');
const hostname = 'localhost';
const port = 3500;

const serviceAccount = require("./Access.json");
const scheduleAppointment = require("./scheduleAppointment.js");

/*firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://pharmpath-6af52-default-rtdb.firebaseio.com'
});
*/
const db = firebase.firestore();
const apptRef = db.collection('VaccinationAppts');
const userRef = db.collection('Users');


const server = http.createServer((req, res) => {
    const { pathname, query } = url.parse(req.url);
    console.log("Pathname: ",pathname);
    console.log("Query: ",query);
    console.log("Request method: ", req.method);
    console.log("Request URL: ", req.url);
    const queryParams = querystring.parse(query);
    if (req.method === 'POST' && pathname === '/MultipleVaccines/') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const { username, password, email, date, time, vaccine } = JSON.parse(body);
            console.log("Username: ", username);
            console.log("Password: ", password);
            console.log("Email: ", email);
            multipleVaccines(username, password, email, date, time, vaccine,res);
        });
    }
});
/*
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
    
        const snapshot = await db.collection('Users')
                              .where('ApptDT', '==', apptDateTime)
                              .get();
    
    
    if (!snapshot.empty) {
      return("Appointment slot not available. Please choose another date or time.");
    }
  //new addition to github
    console.log("Vaccine:" + vaccine);
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
  }*/
async function multipleVaccines(username, password, email, date, time, vaccine,res){
	//here the initiating actor sends the username/password
	//this data is sent to the subroutine “login” (UC-1) (participating actor) for validation. 
	//Once the data validation for login is complete, the user is presented with a vaccine appointment screen, which has add/edit appointment buttons. Once  the “add appointment” has been selected, it displays the available appointments for the next 15 days.
    //Must schedule for appointment first
	scheduleAppointment(username, password, email, date, time, vaccine);
            //Check interaction of the vaccine with the patients health history using the database.
        //if no interactions:
        var nextappt = false;
        let vaccineCount = 1;
        //var safe = false;
        while(nextappt = true){
            console.log("Would you like to schedule another vaccine?");
            let vaccine_snapshot = await db.collection('VaccineInteractions')
                .where('Vaccine1', '==', 'Varicella')
                .where('Vaccine2', '==', 'Measles')
                //.where('Safe' ,'==', safe)
                .get();
            console.log("Vaccine Snapshot: ", vaccine_snapshot.empty);
            if(!vaccine_snapshot.empty){
                sendErrorResponse(res, 400, "This vaccine is not suitable for you. Please select another vaccine");
                
            
        //Check for interactions between vaccinations
            }else{
                vaccineCount++;
                sendOKResponse(res, 200, "Vaccine successfully scheduled");
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
