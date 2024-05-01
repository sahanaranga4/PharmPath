document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const togglePasswordButton = document.getElementById('togglePassword');

    // Event listener for login form submission
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission behavior

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                // Extract userID and token from response JSON
                const data = await response.json();
                const userID = data.userID;
                const token = response.headers.get('Authorization');

                // Store token in localStorage for future requests
                localStorage.setItem('userID', userID);
                localStorage.setItem('token', token);

                // Redirect to user page with userID
                window.location.href = `/user`;
            } else {
                // Login failed, display error message
                const data = await response.json();
                messageDiv.textContent = data.message;
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error:', error);
            messageDiv.textContent = 'An error occurred, please try again later.';
            messageDiv.style.color = 'red';
        }
    });

    // Event listener for toggling password visibility
    togglePasswordButton.addEventListener('click', function () {
        const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordButton.textContent = 'Hide Password';
        } else {
            passwordInput.type = 'password';
            togglePasswordButton.textContent = 'Show Password';
        }
    });
});

function handleCredentialResponse(response) {
    const credential = response.credential;

    // Make a POST request to your server with the credential
    fetch('/signUpGoogle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Failed to sign up with Google');
        }
    })
    .then(data => {
        console.log('Sign-up response:', data);
        
        // Check if password is present in the user data
        if (!data.user.Password) {
            // Redirect user to set password page
            localStorage.setItem('userID', data.user.UserID);
            setTimeout(() => {
                window.location.href = '/setPassword';
            }, 2000);
        } else {
            // Password is already set, proceed with login
            const username = data.user.Username; // You may need to adjust this based on your user data structure
            const password = data.user.Password; // As the password is not returned, you can use a placeholder or omit it if not needed
            
            // Trigger login process
            login(username, password);
        }
    })
    .catch(error => {
        console.error('Error signing up with Google:', error);
        // Handle error
    });
}

async function login(username, password) {
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            // Extract userID and token from response JSON
            const data = await response.json();
            const userID = data.userID;
            const token = response.headers.get('Authorization');

            // Store token in localStorage for future requests
            localStorage.setItem('userID', userID);
            localStorage.setItem('token', token);

            // Redirect to user page with userID
            window.location.href = `/user`;
        } else {
            // Login failed, display error message
            const data = await response.json();
            messageDiv.textContent = data.message;
            messageDiv.style.color = 'red';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'An error occurred, please try again later.';
        messageDiv.style.color = 'red';
    }
} 
  window.onload = function () {
    google.accounts.id.initialize({
      client_id: "1043983089205-3m8ih4osuqn3mt7tdq0dp46gkkc2g014.apps.googleusercontent.com",
      callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
      document.getElementById("buttonDiv"),
      { theme: "outline", size: "large" }  // customization attributes
    );
    google.accounts.id.prompt(); // also display the One Tap dialog
  }
  