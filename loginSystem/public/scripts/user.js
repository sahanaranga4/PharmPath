document.addEventListener('DOMContentLoaded', async function () {
    // Extract userID
    const userID = localStorage.getItem('userID');

    try {
        const token = localStorage.getItem('token'); // Retrieve token from localStorage

        // Create headers with Authorization token
        const headers = new Headers();
        headers.append('Authorization', `${token}`);

        const response = await fetch(`/user/${userID}`, {
            headers: headers // Include headers in the fetch request
        });
        const data = await response.json();

        if (response.ok) {
            // If user data is successfully fetched, display user data
            displayUserData(data.user);
            
            // Show logout button
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('editBtn').style.display = 'block';
            document.getElementById('editBtn').addEventListener('click', () => {
                window.location.href = `/edit`; // Redirect to edit page
            });
        } else {
            // If user is not authorized (i.e., not logged in), display login message and button
            document.getElementById('userInfo').style.display = 'none';
            document.getElementById('loginMessage').style.display = 'block';
            document.getElementById('loginBtn').addEventListener('click', () => {
                window.location.href = '/login'; // Redirect to login page
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Logout button event listener
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', function() {
    // Remove token and user ID from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userID');
    // Redirect to login page
    window.location.href = '/login';
});

// Function to display user data
function displayUserData(userData) {
    // Display user's data in HTML elements
    document.getElementById('username').textContent = `Username: ${userData.Username}`;
    document.getElementById('email').textContent = `Email: ${userData.Email}`;
    document.getElementById('firstName').textContent = `First Name: ${userData.Firstname}`;
    document.getElementById('lastName').textContent = `Last Name: ${userData.Lastname}`;
    
    // Address
    if (userData.Address) {
        document.getElementById('address').textContent = `Address: ${userData.Address}`;
    } else {
        document.getElementById('address').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Address: Undefined</span>';
    }
    
    // City
    if (userData.City) {
        document.getElementById('city').textContent = `City: ${userData.City}`;
    } else {
        document.getElementById('city').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">City: Undefined</span>';
    }
    
    // State
    if (userData.State) {
        document.getElementById('state').textContent = `State: ${userData.State}`;
    } else {
        document.getElementById('state').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">State: Undefined</span>';
    }
    
    // ZIP
    if (userData.Zip) {
        document.getElementById('zip').textContent = `ZIP: ${userData.Zip}`;
    } else {
        document.getElementById('zip').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">ZIP: Undefined</span>';
    }
    
    // Date of Birth
    if (userData.DOB) {
        document.getElementById('dob').textContent = `Date of Birth: ${userData.DOB}`;
    } else {
        document.getElementById('dob').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Date of Birth: Undefined</span>';
    }

    if (userData.Immunocompromised !== undefined) {
        document.getElementById('immunocompromised').textContent = `Immunocompromised: ${userData.Immunocompromised}`;
    } else {
        document.getElementById('immunocompromised').innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Immunocompromised: Undefined</span>';
    }

    // Check for any undefined fields and display "Please edit profile" message
    const undefinedFields = ['Address', 'City', 'State', 'Zip', 'DOB',];
    let undefinedCount = undefinedFields.reduce((count, field) => {
        if (!userData[field]) count++;
        return count;
    }, 0);
    
    if (userData.Immunocompromised === undefined) {
        undefinedCount++;
    }
    
    if (undefinedCount > 0) {
        const message = `Please edit profile to provide missing information (${undefinedCount} field(s) undefined)!`;
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.color = 'red';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.textDecoration = 'underline';
        
        // Create container for the message
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('missing-info-message');
        messageContainer.appendChild(messageElement);
        
        // Prepend message container to the 'container' element
        const container = document.querySelector('.container');
        container.insertBefore(messageContainer, container.firstChild);
    }

    // Show user info container
    document.getElementById('userInfo').style.display = 'block';
}

