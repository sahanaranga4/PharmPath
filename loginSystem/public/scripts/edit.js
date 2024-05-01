document.addEventListener('DOMContentLoaded', async function () {
    const editForm = document.getElementById('editForm');
    const messageDiv = document.getElementById('message');

    try {
        const token = localStorage.getItem('token'); // Retrieve token from localStorage
        const userID = localStorage.getItem('userID'); // Retrieve userID from localStorage

        // Create headers with Authorization token
        const headers = new Headers();
        headers.append('Authorization', `${token}`);

        const response = await fetch(`/user/${userID}`, {
            headers: headers // Include headers in the fetch request
        });
        const data = await response.json();

        if (response.ok) {
            const usernameLabel = document.getElementById('usernameLabel');
            usernameLabel.textContent = `Username: ${data.user.Username}`;
        
            const firstnameLabel = document.getElementById('firstnameLabel');
            firstnameLabel.textContent = `First Name: ${data.user.Firstname}`;
        
            const lastnameLabel = document.getElementById('lastnameLabel');
            lastnameLabel.textContent = `Last Name: ${data.user.Lastname}`;
        
            const emailLabel = document.getElementById('emailLabel');
            emailLabel.textContent = `Email: ${data.user.Email}`;

            const addressLabel = document.getElementById('addressLabel');
            if (data.user.Address) {
                addressLabel.textContent = `Address: ${data.user.Address}`;
            } else {
                addressLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Address: Undefined</span>';
                document.getElementById('address').setAttribute('required', '');
            }

            const cityLabel = document.getElementById('cityLabel');
            if (data.user.City) {
                cityLabel.textContent = `City: ${data.user.City}`;
            } else {
                cityLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">City: Undefined</span>';
                document.getElementById('city').setAttribute('required', '');
            }

            const stateLabel = document.getElementById('stateLabel');
            if (data.user.State) {
                stateLabel.textContent = `State: ${data.user.State}`;
            } else {
                stateLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">State: Undefined</span>';
                document.getElementById('state').setAttribute('required', '');
            }

            const zipLabel = document.getElementById('zipLabel');
            if (data.user.Zip) {
                zipLabel.textContent = `ZIP: ${data.user.Zip}`;
            } else {
                zipLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">ZIP: Undefined</span>';
                document.getElementById('zip').setAttribute('required', '');
            }

            const dobLabel = document.getElementById('dobLabel');
            if (data.user.DOB) {
                dobLabel.textContent = `Date of Birth: ${data.user.DOB}`;
            } else {
                dobLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Date of Birth: Undefined</span>';
                document.getElementById('dob').setAttribute('required', '');
            }

            const immunocompromisedLabel = document.getElementById('immunocompromisedLabel');
            if (data.user.Immunocompromised !== undefined) {
                immunocompromisedLabel.textContent = `Immunocompromised: ${data.user.Immunocompromised}`;
            } else {
                immunocompromisedLabel.innerHTML = '<span style="color: red; font-weight: bold; text-decoration: underline;">Immunocompromised: Undefined</span>';
                document.getElementById('immunocompromised').setAttribute('required', '');
            }
        }else{
            // If user is not authorized (i.e., not logged in), display login message and button
            document.getElementById('editForm').style.display = 'none';
            document.getElementById('loginMessage').style.display = 'block';
            document.getElementById('loginBtn').addEventListener('click', () => {
                window.location.href = '/login'; // Redirect to login page
            });
        }

        // Check for any undefined fields and display "Please edit profile" message
    const undefinedFields = ['Address', 'City', 'State', 'Zip', 'DOB'];
    let undefinedCount = undefinedFields.reduce((count, field) => {
        if (!data.user[field]) count++;
        return count;
    }, 0);

    if (data.user.Immunocompromised === undefined) {
        undefinedCount++;
    }
    
    if (undefinedCount > 0) {
        const message = `Please provide the missing information of the ${undefinedCount} missing field(s)!`;
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
        
    } catch (error) {
        console.error('Error:', error);
    }

    // Get all edit buttons and attach click event listener
    const editButtons = document.querySelectorAll('.editBtn');
    editButtons.forEach(button => {
        button.addEventListener('click', function () {
            const field = this.dataset.field; // Get the field to be edited
            const inputField = document.getElementById(field); // Get the corresponding input field

            // Toggle visibility of the input field
            if (inputField.style.display === 'none') {
                inputField.style.display = 'inline-block';
                this.textContent = 'Cancel';
            } else {
                inputField.style.display = 'none';
                this.textContent = 'Edit';
            }
        });
    });

    // Event listener for "Change Password" button    
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const newPasswordLabel = document.getElementById('newPasswordLabel');
    const confirmPasswordLabel = document.getElementById('confirmPasswordLabel');
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    changePasswordBtn.addEventListener('click', function () {
        if (newPasswordLabel.style.display === 'none') {
            newPasswordLabel.style.display = 'inline-block';
            confirmPasswordLabel.style.display = 'inline-block';
            newPasswordField.style.display = 'inline-block';
            confirmPasswordField.style.display = 'inline-block';
            this.textContent = 'Cancel Change';
        } else {
            newPasswordLabel.style.display = 'none';
            confirmPasswordLabel.style.display = 'none';
            newPasswordField.style.display = 'none';
            confirmPasswordField.style.display = 'none';
            this.textContent = 'Change Password';
        }
    });

    // Prevent form submission on "Change Password" button click
    changePasswordBtn.addEventListener('click', function (event) {
        event.preventDefault();
    });

    editForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const formData = new FormData(editForm);
        const editData = Object.fromEntries(formData.entries());
        if (editData.newPassword !== editData.confirmPassword) {
            messageDiv.textContent = 'New password and confirm password do not match.';
            messageDiv.style.color = 'red';
            return;
        }
        delete editData.confirmPassword;
        try {
            const capitalizedEditData = {};
            for (const key in editData) {
                if (editData.hasOwnProperty(key) && editData[key]) {
                    let fieldName = key.charAt(0).toUpperCase() + key.slice(1);
                    if (fieldName === 'Dob') {
                        fieldName = 'DOB';
                    } else if (fieldName === 'NewPassword') {
                        fieldName = 'newPassword';
                    }
                    capitalizedEditData[fieldName] = editData[key];
                }
            }
            capitalizedEditData['currentPassword'] = editData.currentPassword;
            const userID = localStorage.getItem('userID');
            const token = localStorage.getItem('token');
            const headers = new Headers();
            headers.append('Authorization', `${token}`);
            headers.append('Content-Type', 'application/json');
            const body = JSON.stringify(capitalizedEditData);
            const response = await fetch(`/edit/${userID}`, {
                method: 'PUT',
                headers: headers,
                body: body
            });
            if (response.ok) {
                messageDiv.textContent = 'User data updated successfully';
                messageDiv.style.color = 'green';
                setTimeout(() => {
                    window.location.href = '/user';
                }, 2000);
            } else {
                const data = await response.json();
                messageDiv.textContent = data.error || 'An error occurred, please try again later.';
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = 'An error occurred, please try again later.';
            messageDiv.style.color = 'red';
        }
    });
});
