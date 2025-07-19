// Updated authentication script with proper credential checking
$(document).ready(function() {
    console.log('Proper authentication system loaded');
    
    // Override register form handler
    $('#registerForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        
        const name = $('#registerName').val().trim();
        const email = $('#registerEmail').val().trim();
        const password = $('#registerPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        const acceptTerms = $('#acceptTerms').is(':checked');
        
        // Client-side validation
        if (!name || !email || !password || !confirmPassword) {
            showError('Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
        
        if (!acceptTerms) {
            showError('Please accept the terms of service');
            return;
        }
        
        // Show loading state
        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.text();
        $btn.text('Creating Account...').prop('disabled', true);
        
        // API call for registration
        $.ajax({
            url: 'auth_proper.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                action: 'register',
                name: name,
                email: email,
                password: password
            }),
            success: function(response) {
                console.log('Registration response:', response);
                if (response.success) {
                    showSuccess('Account created successfully! You can now log in.');
                    // Clear the form
                    $('#registerForm')[0].reset();
                    // Switch to login tab
                    $('.tab-btn[data-tab="login"]').click();
                    // Pre-fill login email
                    $('#loginEmail').val(email);
                } else {
                    showError(response.message || 'Registration failed');
                }
            },
            error: function(xhr, status, error) {
                console.error('Registration error:', xhr.responseText);
                showError('Registration failed: ' + (xhr.responseJSON?.message || error));
            },
            complete: function() {
                $btn.text(originalText).prop('disabled', false);
            }
        });
    });
    
    // Override login form handler
    $('#loginForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        
        const email = $('#loginEmail').val().trim();
        const password = $('#loginPassword').val();
        
        // Client-side validation
        if (!email || !password) {
            showError('Please enter both email and password');
            return;
        }
        
        // Show loading state
        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.text();
        $btn.text('Signing In...').prop('disabled', true);
        
        // API call for login
        $.ajax({
            url: 'auth_proper.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                action: 'login',
                email: email,
                password: password
            }),
            success: function(response) {
                console.log('Login response:', response);
                if (response.success) {
                    // Store user data
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    
                    // Create default project for immediate access
                    const defaultProject = {
                        id: 'default_' + Date.now(),
                        name: 'Data Analysis Session',
                        description: 'Quick data visualization',
                        user_id: response.user.id,
                        created_at: new Date().toISOString()
                    };
                    localStorage.setItem('currentProject', JSON.stringify(defaultProject));
                    
                    showSuccess('Login successful! Redirecting...');
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'excel-visualizer.html';
                    }, 1000);
                } else {
                    showError(response.message || 'Login failed');
                }
            },
            error: function(xhr, status, error) {
                console.error('Login error:', xhr.responseText);
                let errorMessage = 'Login failed';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 429) {
                    errorMessage = 'Too many login attempts. Please try again later.';
                } else {
                    errorMessage += ': ' + error;
                }
                
                showError(errorMessage);
            },
            complete: function() {
                $btn.text(originalText).prop('disabled', false);
            }
        });
    });
    
    // Helper functions for showing messages
    function showError(message) {
        hideMessages();
        $('#errorMessage .message-text').text(message);
        $('#errorMessage').fadeIn();
        setTimeout(hideMessages, 5000);
    }
    
    function showSuccess(message) {
        hideMessages();
        $('#successMessage .message-text').text(message);
        $('#successMessage').fadeIn();
        setTimeout(hideMessages, 3000);
    }
    
    function hideMessages() {
        $('#errorMessage, #successMessage').fadeOut();
    }
    
    // Test server connectivity on page load
    $.ajax({
        url: 'auth_proper.php',
        method: 'GET',
        success: function(response) {
            console.log('Server connectivity test:', response);
        },
        error: function(xhr) {
            if (xhr.status === 200 || xhr.status === 405) {
                console.log('Server is accessible');
            } else {
                console.warn('Server connectivity issue:', xhr.status);
            }
        }
    });
});

// Additional helper function to clear stored data on logout
function clearAuthData() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentProject');
    console.log('Authentication data cleared');
}