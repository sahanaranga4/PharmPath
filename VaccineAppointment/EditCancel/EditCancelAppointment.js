const http = require('http');
const url = require('url');
const admin = require('firebase-admin');
const serviceAccount = require('./Key.json');

const hostname = 'localhost';   
const port = 3025;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pharmpath-6af52-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const apptRef = db.collection('VaccinationAppts');
const userRef = db.collection('Users');

const server = http.createServer((req, res) => {
    req.on('data', chunk => {
        body.push(chunk);
    });
    req.on('end', async () => {
        const reqarray = arrayifyReq(req,res);
        const parsedArray = parseArray(reqarray,res);
    });
});

let errorMessages = [];
let successMessages = [];

function arrayifyReq(req,res){
    let paramsarray = [];
    count = 0;
    var params = new URLSearchParams(req.url);
    for (param of params.entries()) {
        if (count == 0) {
            let first = param[0].substring(2, param[0].length);
            paramsarray[count] = [first, param[1]];
        }   
        else {
            paramsarray[count] = param;
        }
        count++;    
    }

    for(i = 0; i < paramsarray.length; i++){  //Setting all the text to capitals for standardization.
        for(j = 0; j < paramsarray[i].length;j++){
            if(paramsarray[i][0].toUpperCase() !== 'CONFIRMATIONCODE'){
                paramsarray[i][0] = paramsarray[i][0].toUpperCase();
            } else{
                paramsarray[i][0] = 'CONFIRMATIONCODE';
            }
        }
    }
    console.log('Paramsarray:', paramsarray)
    return paramsarray;
}

function parseArray(array, res) {
    let hasMode = false;
    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == 'MODE' && array[i][1] == 'EDIT') {
            if (hasMode) {
                errorMessages.push('More than one MODE key, NOT ALLOWED.');
                break;
            }else if(!hasMode){
                hasMode = true;
                checkEditAppt(array, res);
            }
        } else if (array[i][0] == 'MODE' && array[i][1] == 'CANCEL') {
            if (hasMode) {
                errorMessages.push('More than one MODE key, NOT ALLOWED.');
                break;
            }
            hasMode = true;
            checkCancelAppt(array, res);
        }
    }
    
    if (!hasMode) {
        errorMessages.push("No MODE key found or invalid MODE key input, NOT ALLOWED. Valid Modes: EDIT, CANCEL");
        sendErrorResponse(res, 400, errorMessages.join('\n'));
        errorMessages = [];
    }else if (errorMessages.length > 0){
        errorMessages.push("Error 400: Invalid MODE. Will not execute code.");
        sendErrorResponse(res, 400, errorMessages.join('\n'));
        errorMessages = [];
    }
}

async function checkEditAppt(array, res){
    let hasNewDT = false;
    let hasNewDoctor = false;
    let hasNewVaccine = false;
    let hasConfCode = false;
    let hasUserid = false;
    let confCodeIndex = -1;
    let UseridIndex = -1;
    let DTIndex = -1;
    let DoctorIndex = -1;
    let VaccineIndex = -1;
    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == 'CONFIRMATIONCODE'){
            if (hasConfCode == true){
                errorMessages.push('More than one CONFIRMATIONCODE key, NOT ALLOWED.');
                break;
            }else{
            confCodeIndex = i;
            hasConfCode = true;
            }
        }
        else if (array[i][0] == 'USERID'){
            if (hasUserid == true){
                errorMessages.push('More than one USERID key, NOT ALLOWED.');
                break;
            }else{
            UseridIndex = i;
            hasUserid = true;
            }
        }
        else if (array[i][0] == 'DATETIME'){
            if (hasNewDT == true){
                errorMessages.push('More than one DATETIME key, NOT ALLOWED.');
                break;
            }else{
            DTIndex = i;
            hasNewDT = true;
            }
        }
        else if (array[i][0] == 'DOCTOR'){
            if (hasNewDoctor == true){
                errorMessages.push('More than one DOCTOR key, NOT ALLOWED.');
                break;
            }else{
            DoctorIndex = i;
            hasNewDoctor = true;
            }
        }
        else if (array[i][0] == 'VACCINE'){
            if (hasNewVaccine == true){
                errorMessages.push('More than one VACCINE key, NOT ALLOWED.');
                break;
            }else{
            VaccineIndex = i;
            hasNewVaccine = true;
            }
        }

    }
    hasReq = ((hasConfCode) && (hasNewDT || hasNewDoctor || hasNewVaccine));
    
    if (hasReq == false){
        errorMessages.push('Requires either USERID or CONFIRMATIONCODE keys and at least one of the following edit keys: DOCTOR, VACCINE, USERID, DATETIME');
    }
    if (errorMessages.length > 0){
        errorMessages.push('400 Bad Request: Does not have valid inputs. Did not Access EditAppt.');
        return -1;
    }else if (errorMessages.length == 0){
        const dates = await EditAppt(array,confCodeIndex, UseridIndex, DTIndex, DoctorIndex, VaccineIndex, res);
    }
}

async function EditAppt(array, confCodeIndex, UseridIndex, DTIndex, DoctorIndex, VaccineIndex, res) {
    try {
        // Initialize variables to hold query references
        let userQuery, codeQuery;

        // Get confirmation code value
        const confCodeValue = array[confCodeIndex][1];

        // Query based on Confirmation Code
        codeQuery = apptRef.where('ConfCode', '==', confCodeValue).get();

        // Perform query based on Confirmation Code
        const codeSnapshot = await codeQuery;
    
        // Check if there are documents matching the query
        if (!codeSnapshot.empty) {
            // Iterate over the documents
            codeSnapshot.forEach(async doc => {
                try {
                    const data = doc.data();

                    // Initialize variable to track whether date already exists
                    let dateExists = false;

                    // Update values if provided in the array
                    if (DTIndex !== -1) {
                        const DTValue = array[DTIndex][1];
                        let formattedDTValue = StringToDate(DTValue, res);
                        const checkApptDate = await checkAppointmentDate(DTValue);
                        if (formattedDTValue !== -1) {
                            const checkhour = await checkAppointmentHours(DTValue);
                            if(checkApptDate ==-1){
                                errorMessages.push(`Error 400: DATETIME provided is in the past. Please provide a future date.`);
                                sendErrorResponse(res, 400, errorMessages.join('\n'));
                                errorMessages = [];
                                return;
                            }else if(checkhour == false){
                                errorMessages.push(`Error 400: DATETIME Not within Specified Business Hours. We are open 8AM to 5PM every day.`);
                                sendErrorResponse(res, 400, errorMessages.join('\n'));
                                errorMessages = [];
                                return;
                            }else{
                                formattedDTValue = await roundToNearestMinutes(DTValue);
                                // Check if the rounded date already exists in the database
                                const existingApptsQuery = apptRef.where('ApptDT', '==', formattedDTValue).get();
                                const existingApptsSnapshot = await existingApptsQuery;
                                
                                if (!existingApptsSnapshot.empty) {
                                    // Date already exists in the database, return error
                                    errorMessages.push(`Error 409: Appointment already exists for the specified date and time: ${formattedDTValue}`);
                                    sendErrorResponse(res, 409, errorMessages.join('\n'));
                                    errorMessages = [];
                                    dateExists = true; // Set flag to true
                                } else {
                                    // Date does not exist in the database, proceed with update
                                    data.ApptDT = formattedDTValue;
                                }
                            }
                        } else {
                            // Invalid date format, return error
                            errorMessages.push(`Error 400: Invalid DATETIME input: ${DTValue}. Please enter in the format: YYYY-MM-DDTHH:MM:SS`);
                            sendErrorResponse(res, 400, errorMessages.join('\n'));
                            errorMessages = [];
                            return;
                        }
                    }

                    // If date already exists, skip further processing
                    if (dateExists) {
                        return;
                    }

                    if (DoctorIndex !== -1) {
                        const DoctorValue = array[DoctorIndex][1];
                        data.Doctor = DoctorValue;
                    }

                    if (VaccineIndex !== -1) {
                        const VaccineValue = array[VaccineIndex][1];
                        data.Vaccine = VaccineValue;
                    }

                    // Update the document in Firestore
                    await doc.ref.update(data);

                    // Send success response with updated appointment data
                    successMessages.push('Appointment updated successfully.\n\n');
                    successMessages.push('Updated Appointment Details:\n\n');
                    console.log('ok');
                    successMessages.push(JSON.stringify(data)); // Convert updated appointment data to JSON string
                    sendOKResponse(res, 200, successMessages.join('\n'));
                    successMessages = [];
                } catch (error) {
                    console.error('Error updating appointment:', error);
                    // Send error response
                    errorMessages.push('Error updating appointment.');
                    sendErrorResponse(res, 500, errorMessages.join('\n'));
                    errorMessages = [];
                }
            });
        } else {
            // Send error response if appointment not found
            errorMessages.push(`Appointment with confirmation code ${confCodeValue} not found.`);
            sendErrorResponse(res, 500, errorMessages.join('\n'));
            errorMessages = [];
        }
    } catch (error) {
        console.error('Error executing query:', error);
        // Send error response
        sendErrorResponse(res, 500, 'Error executing query.');
    }
}

async function checkCancelAppt(array, res) {
    let hasConfCode = false; // Initialize hasConfCode to false
    let hasUserid = false;
    let confCodeIndex = -1; // Initialize confCodeIndex and UseridIndex to -1
    let UseridIndex = -1;

    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == 'CONFIRMATIONCODE') {
            if (hasConfCode == true) {
                errorMessages.push('More than one CONFIRMATIONCODE key, NOT ALLOWED');
                break;
            } else {
                confCodeIndex = i;
                hasConfCode = true;
            }
        }
        if (array[i][0] == 'USERID') {
            if (hasUserid == true) {
                errorMessages.push('More than one USERID key, NOT ALLOWED');
                break;
            } else {
                UseridIndex = i;
                hasUserid = true;
            }
        }
    }
    const hasReq = hasConfCode; // Assign hasConfCode to hasReq
    if (hasReq == false) {
        errorMessages.push('One or More Missing Required keys: CONFIRMATIONCODE');
    }
    if (errorMessages.length > 0) {
        errorMessages.push('400 Bad Request: Did not Access CancelAppt.');
        sendErrorResponse(res, 400, errorMessages.join('\n'));
        errorMessages = [];
    } else if (errorMessages.length == 0) {
        const dates = await CancelAppt(array, confCodeIndex, UseridIndex, res);
    }
}

async function CancelAppt(array, confCodeIndex, UseridIndex, res) {
    try {
        // Access Firestore database
        const db = admin.firestore();

        // Initialize variables to hold query references
        let userQuery, codeQuery;

        // Declare confCodeValue outside of the if block
        let confCodeValue;

        // Query based on UserID
        if (UseridIndex !== -1) {
            const UseridValue = array[UseridIndex][1];
            userQuery = apptRef.where('UserID', '==', UseridValue).get();
        }

        // Query based on Confirmation Code
        if (confCodeIndex !== -1) {
            confCodeValue = array[confCodeIndex][1];
            codeQuery = apptRef.where('ConfCode', '==', confCodeValue).get();
        }
        
        // Perform query based on Confirmation Code
        const codeSnapshot = await codeQuery;

        // Check if there are documents matching the query
        if (!codeSnapshot.empty) {
            // Iterate over the documents and delete each one
            codeSnapshot.forEach(doc => {
                const deletedData = doc.data(); // Retrieve data before deletion
                let fieldsString = ''; // Initialize string for key-value pairs
                // Construct key-value pairs string
                Object.entries(deletedData).forEach(([key, value]) => {
                    fieldsString += `${key}: ${value}, \n `;
                });
                fieldsString = fieldsString.slice(0, -2); // Remove trailing comma and space
                doc.ref.delete()
                    .then(() => {
                        successMessages.push(`Successfully Deleted Appointment: \n\n Document ID: ${doc.id} \n\n Fields: ${fieldsString}`); 
                        sendOKResponse(res, 200, successMessages.join('\n'));
                        successMessages = [];
                    })
                    .catch(error => {
                        errorMessages.push('Error deleting document.');
                        sendErrorResponse(res, 400, errorMessages.join('\n'));
                        errorMessages = [];
                    });
            });
        } else {
            errorMessages.push(`Invalid Option: Could not find appointment with Confirmation Code: ${confCodeValue} `);
            sendErrorResponse(res, 400, errorMessages.join('\n'));
            errorMessages = [];
        }
    } catch (error) {
        console.error('Error executing query:', error);
    }
}

function StringToDate(string, res){
    const currentDate = new Date(string);
    if(isNaN(currentDate)){
        return -1;
    }
    const formattedDate = admin.firestore.Timestamp.fromDate(currentDate);  
    return formattedDate;
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
    if (appointmentHour < 8 || appointmentHour >= 17) {
        errorMessages.push(`Appointments cannot be sceheduled at ${date}`);
        return false;
    }else{
        return true;
    }
}

async function checkAppointmentDate(date){
    const currentDate = new Date();
    const apptDate = new Date(date);
    //If the current datetime is later on the calendar than the appt date, return an error code, else return OK code.
    if(currentDate >= apptDate){
        return -1;
    }else{
        return 0;
    }
}


function sendErrorResponse(res, statusCode, errorMessage) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' , 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Methods' : 'GET, POST, PUT'});
    res.write(errorMessage);
    res.end();
}

function sendOKResponse(res, statusCode, successMessages) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' , 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Methods' : 'GET, POST, PUT'});
    res.write(successMessages);
    res.end();
}


server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
