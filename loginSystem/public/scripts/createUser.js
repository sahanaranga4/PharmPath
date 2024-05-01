document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('registerForm');
    const registerMessageDiv = document.getElementById('registerMessage');

    // Event listener for registration form submission
    registerForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission behavior

        const formData = new FormData(registerForm);
        const registerData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/createUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            const data = await response.json();

            if (response.ok) {
                // Registration successful, display message
                registerMessageDiv.textContent = data.message;
                registerMessageDiv.style.color = 'green';
            } else {
                // Registration failed, display error message
                registerMessageDiv.textContent = data.error;
                registerMessageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error:', error);
            registerMessageDiv.textContent = 'An error occurred, please try again later.';
            registerMessageDiv.style.color = 'red';
        }
    });
});
