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
        const health = immunocompromised(username, password, email, date, time, vaccine, immuneWeak, res);
    });
});
async function immunocompromised(username, password, email, date, time, vaccine, immuneWeak,res){
    //here the initiating actor sends the username/password
    //this data is sent to the subroutine “login” (UC-1) (participating actor) for validation. 
    //Once the data validation for login is complete, the user is presented with a vaccine appointment screen, which has add/edit appointment buttons. Once  the “add appointment” has been selected, it displays the available appointments for the next 15 days.
    //Database should check the user health history. 
    //Must schedule for appointment first
        scheduleAppointment(username, password, email, date, time);
        var immuneWeak = false;
        var nextappt = false;
        let healthConditions = await db.collection('Vaccine')
                           .where('Immunocompromised', '==', immuneWeak)
                           .get();  
        if (healthConditions = true) {
            immuneWeak = true;
            console.log("Please consult a pharmacist because of your delicate health history. Then, select vaccines with care");
        }else{
            multipleVaccines(username, password, email, date, time);
        }
        
        while(nextappt = true){
            scheduleAppointment(username,password);
            //Check interaction of the vaccine with the patients health history using the database.
        //if no interactions:
            let vaccine_snapshot = await db.collection('VaccineInteractions')
                .where('Vaccine', '==', vaccine)
                .get();
            if(!vaccine_snapshot.empty){
                
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
