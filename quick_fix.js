// Quick fix for authentication issues
$(document).ready(function() {
    console.log('Quick fix loaded');
    
    // Override the register form handler
    $('#registerForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        console.log('Register form submitted');
        
        const name = $('#registerName').val();
        const email = $('#registerEmail').val();
        const password = $('#registerPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        const acceptTerms = $('#acceptTerms').is(':checked');

        console.log('Form data:', { name, email, password, confirmPassword, acceptTerms });

        // Basic validation
        if (!name || !email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (!acceptTerms) {
            alert('Please accept the terms of service');
            return;
        }

        console.log('Sending registration request...');

        // API call
        $.ajax({
            url: 'auth_basic.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                action: 'register',
                name: name,
                email: email,
                password: password
            }),
            success: function(response) {
                console.log('Registration success:', response);
                if (response.success) {
                    alert('Account created successfully!');
                    // Switch to login tab
                    $('.tab-btn[data-tab="login"]').click();
                } else {
                    alert('Registration failed: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Registration error:', error);
                console.error('Status:', xhr.status);
                console.error('Response:', xhr.responseText);
                alert('Registration failed: ' + error);
            }
        });
    });

    // Override login form handler
    $('#loginForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();

        console.log('Login data:', { email, password });

        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        console.log('Sending login request...');

        // API call
        $.ajax({
            url: 'auth_basic.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            }),
            success: function(response) {
                console.log('Login success:', response);
                if (response.success) {
                    alert('Login successful!');
                    // Here you would typically redirect to the main app
                    window.location.href = 'excel-visualizer.html';
                } else {
                    alert('Login failed: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Login error:', error);
                console.error('Status:', xhr.status);
                console.error('Response:', xhr.responseText);
                alert('Login failed: ' + error);
            }
        });
    });
});