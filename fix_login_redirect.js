// Fix for login redirect to Excel Visualizer
// Add this to your quick fix script or create as separate file

// Option 1: Bypass project check for direct Excel Visualizer access
function bypassProjectCheck() {
    // Create a default project when accessing Excel Visualizer directly
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && !localStorage.getItem('currentProject')) {
        const defaultProject = {
            id: 'default_' + Date.now(),
            name: 'Quick Analysis',
            description: 'Quick data analysis session',
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentProject', JSON.stringify(defaultProject));
    }
}

// Option 2: Modified login success handler
function handleLoginSuccess(response) {
    if (response.success) {
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        
        // Create default project for immediate access
        const defaultProject = {
            id: 'default_' + Date.now(),
            name: 'Quick Analysis',
            description: 'Quick data analysis session',
            user_id: response.user.id,
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentProject', JSON.stringify(defaultProject));
        
        // Now redirect to Excel Visualizer
        alert('Login successful!');
        window.location.href = 'excel-visualizer.html';
    } else {
        alert('Login failed: ' + response.message);
    }
}

// Option 3: Add this to excel-visualizer.js to bypass check
function modifiedCheckProjectAccess() {
    // Check if user is logged in
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        alert('Please log in to access the visualizer');
        window.location.href = 'index.html';
        return;
    }

    // Auto-create project if missing
    const currentProject = localStorage.getItem('currentProject');
    if (!currentProject) {
        const user = JSON.parse(currentUser);
        const autoProject = {
            id: 'auto_' + Date.now(),
            name: 'Data Analysis Session',
            description: 'Automatic project for data visualization',
            user_id: user.id,
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentProject', JSON.stringify(autoProject));
        console.log('Auto-created project for user');
    }
}

// Call this on page load
$(document).ready(function() {
    bypassProjectCheck();
});