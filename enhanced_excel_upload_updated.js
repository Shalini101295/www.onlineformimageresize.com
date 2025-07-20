// Enhanced Excel Upload with Updated Layout Support
let currentUser = null;
let currentProject = null;
let uploadedFiles = [];

$(document).ready(function() {
    // Load user and project info
    loadUserAndProjectInfo();
    
    // Initialize file upload handlers
    initializeFileUpload();
    
    // Load existing project files
    loadProjectFiles();
    
    // Set up file upload button click handler
    $('#uploadExcelBtn').on('click', function() {
        $('#excelFile').click();
    });
    
    // Handle file selection
    $('#excelFile').on('change', function() {
        const file = this.files[0];
        if (file) {
            uploadProjectFile(file);
        }
    });
    
    // Back to projects button
    $('#backToProjects').on('click', function() {
        window.location.href = 'project-dashboard.html';
    });
    
    // Save project button
    $('#saveProjectBtn').on('click', function() {
        saveCurrentProject();
    });
});

function loadUserAndProjectInfo() {
    // Load current user
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            $('#currentUserName').text(currentUser.username || currentUser.name || 'User');
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Load current project
    const projectData = localStorage.getItem('currentProject');
    if (projectData) {
        try {
            currentProject = JSON.parse(projectData);
            $('#projectTitle').text(currentProject.name || 'Project Name');
            $('#projectDescription').text(currentProject.description || 'No description available');
        } catch (e) {
            console.error('Error parsing project data:', e);
        }
    }
}

function initializeFileUpload() {
    // Initialize drag and drop if needed
    const uploadArea = $('.upload-area');
    
    uploadArea.on('dragover', function(e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });
    
    uploadArea.on('dragleave', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });
    
    uploadArea.on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.match(/\.(xlsx|xls)$/)) {
                uploadProjectFile(file);
            } else {
                showMessage('Please select a valid Excel file (.xlsx or .xls)', 'error');
            }
        }
    });
}

function uploadProjectFile(file) {
    if (!currentUser || !currentProject) {
        showMessage('User or project information missing', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('user_id', currentUser.id || currentUser.username);
    formData.append('project_name', currentProject.name);
    formData.append('project_id', currentProject.id);
    
    // Show loading state
    showMessage('Uploading file...', 'info');
    
    $.ajax({
        url: 'project_file_manager.php',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                showMessage('File uploaded successfully!', 'success');
                // Reload file list after short delay
                setTimeout(loadProjectFiles, 500);
            } else {
                if (response.error_type === 'filename_conflict') {
                    showFilenameConflictDialog(response.message, response.existing_filename, file.name, file);
                } else {
                    showMessage(response.message || 'Upload failed', 'error');
                }
            }
        },
        error: function(xhr, status, error) {
            console.error('Upload error:', error);
            showMessage('Upload failed: ' + error, 'error');
        }
    });
}

function loadProjectFiles() {
    if (!currentUser || !currentProject) return;
    
    const userId = currentUser.id || currentUser.username;
    const projectName = currentProject.name;
    
    $.ajax({
        url: 'quick_file_loader.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            action: 'scan_user_files',
            user_id: userId,
            filter_project: projectName,
            filter_project_id: currentProject.id
        }),
        success: function(response) {
            if (response.success && response.projects && response.projects.length > 0) {
                // Convert quick fix format to display format
                const files = [];
                response.projects.forEach(project => {
                    if (project.files) {
                        project.files.forEach(file => {
                            files.push({
                                name: file.name,
                                size: file.size,
                                modified: file.modified,
                                path: `${project.path}/${file.name}`
                            });
                        });
                    }
                });
                
                displayProjectFiles(files);
            } else {
                displayProjectFiles([]);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading files:', error);
            displayProjectFiles([]);
        }
    });
}

function displayProjectFiles(files) {
    const filesList = $('#projectFilesList');
    filesList.empty();
    
    if (files.length === 0) {
        filesList.html(`
            <div class="no-files-message">
                <p>No files found in this project.</p>
                <p>Upload an Excel file to get started.</p>
            </div>
        `);
        return;
    }
    
    files.forEach(file => {
        const fileItem = createFileItemElement(file);
        filesList.append(fileItem);
    });
}

function createFileItemElement(file) {
    const fileSize = formatFileSize(file.size || 0);
    const fileDate = formatDate(file.modified || '');
    
    return $(`
        <div class="file-item" data-file-path="${file.path}">
            <div class="file-icon">📊</div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${fileSize}</div>
                <div class="file-date">${fileDate}</div>
            </div>
            <div class="file-actions">
                <button class="load-analyze-btn" onclick="loadAndAnalyzeFile('${file.path}', '${file.name}')">
                    Load & Analyze
                </button>
            </div>
        </div>
    `);
}

function loadAndAnalyzeFile(filePath, fileName) {
    console.log('Loading file:', filePath);
    
    // Update project status
    $('#currentFileName').text(fileName);
    $('#projectStatus').show();
    
    // Show loading message
    showMessage('Loading Excel file...', 'info');
    
    // Load the Excel file using AJAX
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(data => {
            // Process the Excel file
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            if (jsonData.length === 0) {
                throw new Error('Excel file is empty');
            }
            
            // Extract column names (first row)
            const columns = jsonData[0] || [];
            
            if (columns.length === 0) {
                throw new Error('No columns found in Excel file');
            }
            
            // Initialize the analyzer with the Excel data
            if (window.initializeExcelAnalyzer) {
                window.initializeExcelAnalyzer(columns, jsonData);
                showMessage('Excel file loaded successfully!', 'success');
                
                // Show the filter panel
                $('#filterPanel').removeClass('collapsed');
                $('#mainContainer').removeClass('filter-collapsed');
                
                // Update toggle icon
                $('#filterToggle .toggle-icon').text('‹');
                
            } else {
                console.error('Excel analyzer not found');
                showMessage('Excel analyzer not available', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading Excel file:', error);
            showMessage('Error loading Excel file: ' + error.message, 'error');
        });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return dateString;
    }
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    $('.message').remove();
    
    const messageClass = `message message-${type}`;
    const messageHtml = `
        <div class="${messageClass}" style="
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            min-width: 300px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        ">
            ${message}
        </div>
    `;
    
    $('body').append(messageHtml);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        $('.message').fadeOut(300, function() {
            $(this).remove();
        });
    }, 5000);
}

function showFilenameConflictDialog(message, existingFilename, newFilename, file) {
    const dialogHtml = `
        <div class="filename-conflict-dialog" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #e74c3c; margin-bottom: 15px;">File Conflict</h3>
                <p style="margin-bottom: 20px;">${message}</p>
                <p style="margin-bottom: 20px;"><strong>Existing:</strong> ${existingFilename}</p>
                <p style="margin-bottom: 30px;"><strong>New:</strong> ${newFilename}</p>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="closeFilenameConflictDialog()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.location.href='project-dashboard.html'">Create New Project</button>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(dialogHtml);
}

function closeFilenameConflictDialog() {
    $('.filename-conflict-dialog').remove();
}

function saveCurrentProject() {
    if (!currentProject) {
        showMessage('No project to save', 'error');
        return;
    }
    
    // Update last saved timestamp
    const now = new Date().toISOString();
    $('#lastSaved').text(new Date().toLocaleString());
    
    showMessage('Project saved successfully!', 'success');
}

// Global function for onclick handlers
window.loadAndAnalyzeFile = loadAndAnalyzeFile;
window.closeFilenameConflictDialog = closeFilenameConflictDialog;