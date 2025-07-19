// Authentication and Project Management JavaScript

// Application State
let currentUser = null;
let projects = [];
let selectedFile = null;

// Initialize Application
$(document).ready(function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

function initializeApp() {
    // Load projects from localStorage
    loadProjects();
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showLandingPage();
    } else {
        showLoginPage();
    }
}

function setupEventListeners() {
    // Auth Tab Switching
    $('.tab-btn').on('click', function() {
        const tab = $(this).data('tab');
        switchAuthTab(tab);
    });

    // Login Form
    $('#loginForm').on('submit', handleLogin);
    
    // Register Form
    $('#registerForm').on('submit', handleRegister);

    // Logout
    $('#logoutBtn').on('click', handleLogout);

    // Create Project Modal
    $('#createProjectBtn, .create-project-btn').on('click', showCreateProjectModal);
    $('#closeModal, #cancelProject').on('click', hideCreateProjectModal);
    
    // Create Project Form
    $('#createProjectForm').on('submit', handleCreateProject);

    // File Upload
    $('#projectFile').on('change', handleFileSelect);
    
    // Drag and Drop
    setupDragAndDrop();

    // Project Card Clicks
    $(document).on('click', '.project-card', function(e) {
        if (!$(e.target).hasClass('btn-danger') && !$(e.target).hasClass('btn-secondary')) {
            const projectId = $(this).data('project-id');
            openProject(projectId);
        }
    });

    // Delete Project
    $(document).on('click', '.btn-danger', function(e) {
        e.stopPropagation();
        const projectId = $(this).closest('.project-card').data('project-id');
        deleteProject(projectId);
    });

    // Edit Project
    $(document).on('click', '.btn-secondary', function(e) {
        e.stopPropagation();
        const projectId = $(this).closest('.project-card').data('project-id');
        editProject(projectId);
    });

    // Modal outside click
    $('.modal').on('click', function(e) {
        if (e.target === this) {
            hideCreateProjectModal();
        }
    });
}

// Authentication Functions
function switchAuthTab(tab) {
    $('.tab-btn').removeClass('active');
    $(`.tab-btn[data-tab="${tab}"]`).addClass('active');
    
    $('.auth-form').removeClass('active');
    $(`#${tab}Form`).addClass('active');
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = $('#loginEmail').val();
    const password = $('#loginPassword').val();
    const rememberMe = $('#rememberMe').is(':checked');

    // Validation
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // Show loading state
    const $submitBtn = $('#loginForm button[type="submit"]');
    const originalText = $submitBtn.text();
    $submitBtn.text('Signing In...').prop('disabled', true);

    // API call to server
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
            if (response.success) {
                currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                if (rememberMe) {
                    localStorage.setItem('rememberUser', 'true');
                }
                
                showMessage('Login successful!', 'success');
                setTimeout(() => {
                    showLandingPage();
                }, 1000);
            } else {
                showMessage(response.message || 'Login failed', 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Login error:', error);
            showMessage('Connection error. Please try again.', 'error');
        },
        complete: function() {
            $submitBtn.text(originalText).prop('disabled', false);
        }
    });
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = $('#registerName').val();
    const email = $('#registerEmail').val();
    const password = $('#registerPassword').val();
    const confirmPassword = $('#confirmPassword').val();
    const acceptTerms = $('#acceptTerms').is(':checked');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }

    if (!acceptTerms) {
        showMessage('Please accept the terms of service', 'error');
        return;
    }

    // Show loading state
    const $submitBtn = $('#registerForm button[type="submit"]');
    const originalText = $submitBtn.text();
    $submitBtn.text('Creating Account...').prop('disabled', true);

    // API call to server
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
            if (response.success) {
                currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                showMessage('Account created successfully!', 'success');
                setTimeout(() => {
                    showLandingPage();
                }, 1000);
            } else {
                showMessage(response.message || 'Registration failed', 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Registration error:', error);
            showMessage('Connection error. Please try again.', 'error');
        },
        complete: function() {
            $submitBtn.text(originalText).prop('disabled', false);
        }
    });
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberUser');
    
    // Clear forms
    $('#loginForm')[0].reset();
    $('#registerForm')[0].reset();
    
    showMessage('Logged out successfully', 'success');
    setTimeout(() => {
        showLoginPage();
    }, 1000);
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    const rememberUser = localStorage.getItem('rememberUser');
    
    if (savedUser && rememberUser) {
        currentUser = JSON.parse(savedUser);
        showLandingPage();
    }
}

// Page Navigation
function showLoginPage() {
    $('#loginPage').addClass('active');
    $('#landingPage').removeClass('active');
}

function showLandingPage() {
    $('#loginPage').removeClass('active');
    $('#landingPage').addClass('active');
    
    if (currentUser) {
        $('#userName').text(`Welcome, ${currentUser.name}`);
        loadProjects();
        renderProjects();
    }
}

// Project Management
function loadProjects() {
    if (!currentUser) return;
    
    const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects = allProjects.filter(p => p.userId === currentUser.id);
}

function saveProjects() {
    const allProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    const otherUserProjects = allProjects.filter(p => p.userId !== currentUser.id);
    const updatedProjects = [...otherUserProjects, ...projects];
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
}

function renderProjects() {
    const $grid = $('#projectsGrid');
    
    if (projects.length === 0) {
        $grid.html(`
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <h4>No projects yet</h4>
                <p>Create your first project to start visualizing data</p>
                <button class="create-project-btn">Create Project</button>
            </div>
        `);
        return;
    }

    const projectsHtml = projects.map(project => `
        <div class="project-card fade-in" data-project-id="${project.id}">
            <div class="project-header">
                <h3 class="project-title">${project.name}</h3>
                <div class="project-menu">
                    <button class="project-menu-btn">⋮</button>
                </div>
            </div>
            <p class="project-description">${project.description || 'No description'}</p>
            <div class="project-meta">
                <span>Created: ${formatDate(project.createdAt)}</span>
                <span>File: ${project.fileName}</span>
            </div>
            <div class="project-actions">
                <button class="btn-secondary">Edit</button>
                <button class="btn-primary">Open</button>
                <button class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');

    $grid.html(projectsHtml);
}

function showCreateProjectModal() {
    $('#createProjectModal').addClass('active');
    $('#projectName').focus();
}

function hideCreateProjectModal() {
    $('#createProjectModal').removeClass('active');
    $('#createProjectForm')[0].reset();
    $('#fileInfo').hide();
    selectedFile = null;
}

function handleCreateProject(e) {
    e.preventDefault();
    
    const name = $('#projectName').val();
    const description = $('#projectDescription').val();
    
    if (!name) {
        showMessage('Please enter a project name', 'error');
        return;
    }

    if (!selectedFile) {
        showMessage('Please select an Excel file', 'error');
        return;
    }

    // Create project
    const project = {
        id: Date.now().toString(),
        userId: currentUser.id,
        name: name,
        description: description,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileData: null, // Will be set when file is read
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Read file and store as base64
    const reader = new FileReader();
    reader.onload = function(e) {
        project.fileData = e.target.result;
        
        projects.push(project);
        saveProjects();
        renderProjects();
        hideCreateProjectModal();
        
        showMessage('Project created successfully!', 'success');
    };
    
    reader.readAsDataURL(selectedFile);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        showFileInfo(file);
    }
}

function showFileInfo(file) {
    const size = formatFileSize(file.size);
    $('#fileInfo .file-name').text(file.name);
    $('#fileInfo .file-size').text(size);
    $('#fileInfo').show();
}

function setupDragAndDrop() {
    const $uploadArea = $('#fileUploadArea');
    
    $uploadArea.on('dragover', function(e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });
    
    $uploadArea.on('dragleave', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });
    
    $uploadArea.on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                selectedFile = file;
                $('#projectFile')[0].files = files;
                showFileInfo(file);
            } else {
                showMessage('Please select a valid Excel file (.xlsx or .xls)', 'error');
            }
        }
    });
}

function openProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        showMessage('Project not found', 'error');
        return;
    }

    // Store the project data for the visualizer
    localStorage.setItem('currentProject', JSON.stringify(project));
    
    // Navigate to the visualizer
    window.location.href = 'excel-visualizer.html';
}

function deleteProject(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== projectId);
        saveProjects();
        renderProjects();
        showMessage('Project deleted successfully', 'success');
    }
}

function editProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        showMessage('Project not found', 'error');
        return;
    }

    // Populate form with existing data
    $('#projectName').val(project.name);
    $('#projectDescription').val(project.description);
    
    // Show modal
    showCreateProjectModal();
    
    // Change form submission to update instead of create
    $('#createProjectForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        
        const name = $('#projectName').val();
        const description = $('#projectDescription').val();
        
        if (!name) {
            showMessage('Please enter a project name', 'error');
            return;
        }

        // Update project
        project.name = name;
        project.description = description;
        project.updatedAt = new Date().toISOString();
        
        // If new file selected, update file data
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                project.fileData = e.target.result;
                project.fileName = selectedFile.name;
                project.fileSize = selectedFile.size;
                
                saveProjects();
                renderProjects();
                hideCreateProjectModal();
                
                // Restore original form handler
                $('#createProjectForm').off('submit').on('submit', handleCreateProject);
                
                showMessage('Project updated successfully!', 'success');
            };
            reader.readAsDataURL(selectedFile);
        } else {
            saveProjects();
            renderProjects();
            hideCreateProjectModal();
            
            // Restore original form handler
            $('#createProjectForm').off('submit').on('submit', handleCreateProject);
            
            showMessage('Project updated successfully!', 'success');
        }
    });
}

// Utility Functions
function showMessage(text, type) {
    const $message = type === 'error' ? $('#errorMessage') : $('#successMessage');
    $message.find('.message-text').text(text);
    $message.show();
    
    setTimeout(() => {
        $message.hide();
    }, 4000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export functions for use in other modules
window.ProjectManager = {
    getCurrentProject: () => {
        const projectData = localStorage.getItem('currentProject');
        return projectData ? JSON.parse(projectData) : null;
    },
    
    updateProject: (projectData) => {
        localStorage.setItem('currentProject', JSON.stringify(projectData));
    },
    
    getCurrentUser: () => currentUser,
    
    backToLanding: () => {
        window.location.href = 'index.html';
    }
};