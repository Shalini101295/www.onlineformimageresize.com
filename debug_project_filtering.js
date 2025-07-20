// Debug Project Filtering Issues
console.log('🔍 Debugging Project Filtering...');

function debugProjectFiltering() {
    console.log('=== PROJECT FILTERING DEBUG ===');
    
    // Check current project data
    const currentProjectData = localStorage.getItem('currentProject');
    const currentUserData = localStorage.getItem('currentUser');
    
    console.log('📁 Current Project Data:', currentProjectData);
    console.log('👤 Current User Data:', currentUserData);
    
    if (currentProjectData) {
        try {
            const currentProject = JSON.parse(currentProjectData);
            console.log('📋 Parsed Current Project:', currentProject);
            console.log('📋 Project Name:', currentProject.name);
            console.log('📋 Project ID:', currentProject.id);
        } catch (e) {
            console.error('❌ Error parsing current project:', e);
        }
    }
    
    if (currentUserData) {
        try {
            const currentUser = JSON.parse(currentUserData);
            console.log('👤 Parsed Current User:', currentUser);
            console.log('👤 User ID:', currentUser.id);
            console.log('👤 Username:', currentUser.username);
        } catch (e) {
            console.error('❌ Error parsing current user:', e);
        }
    }
    
    // Test the quick file loader
    if (currentProjectData && currentUserData) {
        const currentProject = JSON.parse(currentProjectData);
        const currentUser = JSON.parse(currentUserData);
        const userId = currentUser.id || currentUser.username;
        const projectName = currentProject.name;
        
        console.log('🔄 Testing file loader with:');
        console.log('  User ID:', userId);
        console.log('  Project Filter:', projectName);
        
        $.ajax({
            url: 'quick_file_loader.php',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                action: 'scan_user_files',
                user_id: userId,
                filter_project: projectName
            }),
            success: function(response) {
                console.log('📦 Raw Response:', response);
                console.log('📁 Found Projects:', response.projects);
                
                if (response.projects) {
                    response.projects.forEach((project, index) => {
                        console.log(`📁 Project ${index + 1}:`);
                        console.log('  Name:', project.name);
                        console.log('  Path:', project.path);
                        console.log('  User Dir:', project.user_dir);
                        console.log('  Files:', project.files ? project.files.length : 0);
                        
                        // Check if project name matches current project
                        const nameMatch1 = project.name && projectName && project.name.includes(projectName);
                        const nameMatch2 = project.name && projectName && projectName.includes(project.name);
                        console.log('  Name Match 1 (project includes current):', nameMatch1);
                        console.log('  Name Match 2 (current includes project):', nameMatch2);
                        console.log('  Should Show:', nameMatch1 || nameMatch2);
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ AJAX Error:', error);
                console.error('❌ Status:', status);
                console.error('❌ Response:', xhr.responseText);
            }
        });
    }
}

// Run debug automatically
$(document).ready(function() {
    setTimeout(debugProjectFiltering, 1000);
});

// Also make it available globally
window.debugProjectFiltering = debugProjectFiltering;

console.log('💡 Debug script loaded. Run debugProjectFiltering() to see filtering details.');
console.log('💡 Or check the console output in 1 second for automatic debug.');