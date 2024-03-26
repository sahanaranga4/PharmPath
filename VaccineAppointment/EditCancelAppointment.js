//Import Modules
const http = require('node:http');
const url = require('url');
const admin = require('firebase-admin');
const serviceAccount = require('./Key.json');




const hostname = 'localhost';
const port = 3018;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pharmpath-6af52-default-rtdb.firebaseio.com'
});
const db = admin.firestore();
const apptRef = db.collection('VaccinationAppts');
const userRef = db.collection('Users')
const starCountRef = apptRef.doc('DfEZ6gncDsq550g2H1fI')
starCountRef.update({
    'ApptDT': 'March 10, 2024 at 3:24:48 PM UTC-4'
});

const server = http.createServer((req, res) => {
    req.on('data', chunk => {
        body.push(chunk);
    });
    req.on('end', () => {
        const reqarray = arrayifyReq(req,res);
        const parsedArray = parseArray(reqarray,res);
        if (errorMessages.length > 0) {
            sendErrorResponse(res, 400, errorMessages.join('\n'));
            errorMessages = [];
        }
    });
});

let errorMessages = [];
let successMessages = [];

function arrayifyReq(req,res){
    let paramsarray = [];

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
            paramsarray[i][j] = paramsarray[i][j].toUpperCase();
        }
    }
    return paramsarray;
}

function parseArray(array, res){
    let hasMode = false;
    for (let i = 0; i < array.length; i++) {
        if(array[i][0] == 'MODE' && array[i][1] == 'EDIT'){
            if (hasMode == true){
                errorMessages.push('More than one MODE key, NOT ALLOWED');
                break;
            }
            hasMode = true;
            checkEditAppt(array, res);
        }else if(array[i][0] == 'MODE' && array[i][1] == 'CANCEL'){
            if (hasMode == true){
                errorMessages.push('More than one MODE key, NOT ALLOWED');
                break;
            }
            hasMode = true;
            checkCancelAppt(array, res);
        }
        if (hasMode == false){
            errorMessages.push("No MODE key found or invalid MODE key input, NOT ALLOWED. Valid Modes: EDIT, CANCEL");
        }
    }
}

function checkEditAppt(array, res){
    let hasNewDT, hasNewDoctor, hasNewVaccine, hasUserid, hasConfCode = false;
    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == 'CONFIRMATIONCODE'){
            if (hasConfCode == true){
                errorMessages.push('More than one CONFIRMATIONCODE key, NOT ALLOWED');
                break;
            }
            confCodeIndex = i;
            hasConfCode = true;
        }
        else if (array[i][0] == 'USERID'){
            if (hasUserid == true){
                errorMessages.push('More than one USERID key, NOT ALLOWED');
                break;
            }
            UseridIndex = i;
            hasUserid = true;
        }
        else if (array[i][0] == 'DATETIME'){
            if (hasNewDT == true){
                errorMessages.push('More than one DATETIME key, NOT ALLOWED');
                break;
            }
            DTIndex = i;
            hasNewDT = true;
        }
        else if (array[i][0] == 'DOCTOR'){
            if (hasNewDoctor == true){
                errorMessages.push('More than one DOCTOR key, NOT ALLOWED');
                break;
            }
            DoctorIndex = i;
            hasNewDoctor = true;
        }
        else if (array[i][0] == 'VACCINE'){
            if (hasNewVaccine == true){
                errorMessages.push('More than one VACCINE key, NOT ALLOWED');
                break;
            }
            VaccineIndex = i;
            hasNewVaccine = true;
        }

    }
    hasReq = ((hasConfCode || hasUserid) && (hasNewDT || hasNewDoctor || hasNewVaccine));
    
    if (hasReq == false){
        errorMessages.push('Requires either USERID or CONFIRMATIONCODE keys and at least one of the following edit keys: DOCTOR, VACCINE, USERID, DATETIME');
    }
    if (errorMessages.length > 0){
        errorMessages.push('400 Bad Request: Did not Access EditAppt');
        return -1;
    }else if (errorMessages.length == 0){
        const dates = EditAppt(array,confCodeIndex, UseridIndex, DTIndex, DoctorIndex, VaccineIndex, UseridIndex, res);
    }
}

function checkCancelAppt(array, res){
    let hasConfCode, hasUserid = false;
    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == 'CONFIRMATIONCODE'){
            if (hasConfCode == true){
                errorMessages.push('More than one CONFIRMATIONCODE key, NOT ALLOWED');
                break;
            }
            confCodeIndex = i;
            hasConfCode = true;
        }
        if (array[i][0] == 'USERID'){
            if (hasUserid == true){
                errorMessages.push('More than one USERID key, NOT ALLOWED');
                break;
            }
            UseridIndex = i;
            hasUserid = true;
        }
    }
    hasReq = hasConfCode || hasUserid;
    
    if (hasReq == false){
        errorMessages.push('One or More Missing Required keys: CONFIRMATIONCODE, USERID');
    }
    if (errorMessages.length > 0){
        errorMessages.push('400 Bad Request: Did not Access CancelAppt.');
        sendErrorResponse(res, 400, errorMessages.join('\n'));
        errorMessages = [];
    }else if (errorMessages.length == 0){
        const dates = CancelAppt(array, confCodeIndex, res);
    }
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


server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
