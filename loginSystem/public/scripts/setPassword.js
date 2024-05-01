document.addEventListener('DOMContentLoaded', function () {
    const setPasswordForm = document.getElementById('setPasswordForm');
    const messageDiv = document.getElementById('message');
    const showPasswordBtn = document.getElementById('showPasswordBtn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    showPasswordBtn.addEventListener('click', function () {
        const passwordType = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = passwordType;
        confirmPasswordInput.type = passwordType;
        showPasswordBtn.textContent = passwordType === 'password' ? 'Show Password' : 'Hide Password';
    });

    setPasswordForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission behavior

        const password = setPasswordForm.password.value;
        const confirmPassword = setPasswordForm.confirmPassword.value;

        if (password !== confirmPassword) {
            messageDiv.textContent = 'Passwords do not match.';
            messageDiv.style.color = 'red';
            return;
        }

        try {
            const userID = localStorage.getItem('userID');
            const response = await fetch('/setPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userID, password })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Password set successfully:', data);

                // Redirect to /login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                throw new Error('Failed to set password');
            }
        } catch (error) {
            console.error('Error setting password:', error);
            messageDiv.textContent = 'An error occurred while setting the password.';
            messageDiv.style.color = 'red';
        }
    });
});
