// Enhanced Excel Upload System for Project Management
let currentProject = null;
let currentUser = null;
let projectFiles = [];

// Initialize the enhanced upload system
function initializeEnhancedUpload() {
    // Load user and project data
    loadCurrentUserAndProject();
    
    // Setup file upload functionality
    setupProjectFileUpload();
    
    // Use the working quick fix file loader instead of broken loadProjectFiles
    if (typeof quickFixLoadFiles === 'function') {
        quickFixLoadFiles();
    } else {
        loadProjectFiles();
    }
    
    // Update UI based on project state
    updateProjectUI();
}

function loadCurrentUserAndProject() {
    // Load current user
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
    }
    
    // Load current project
    const projectData = localStorage.getItem('currentProject');
    if (projectData) {
        currentProject = JSON.parse(projectData);
    }
    
    if (!currentUser || !currentProject) {
        alert('Session expired. Please log in again.');
        window.location.href = 'index.html';
        return;
    }
}

function setupProjectFileUpload() {
    // Create enhanced file upload UI
    const uploadSection = $('#fileUploadSection');
    
    // Replace the existing upload area with enhanced version
    uploadSection.html(`
        <div class="project-file-manager">
            <div class="upload-header">
                <h3>Project Files</h3>
                <button id="uploadNewFileBtn" class="btn btn-primary">+ Upload Excel File</button>
            </div>
            
            <div class="files-list" id="projectFilesList">
                <div class="loading-files">Loading project files...</div>
            </div>
            
            <!-- Hidden file input -->
            <input type="file" id="hiddenExcelUpload" accept=".xlsx,.xls" style="display: none;">
            
            <!-- Upload progress -->
            <div id="uploadProgress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Uploading...</div>
            </div>
        </div>
    `);
    
    // Setup event handlers
    $('#uploadNewFileBtn').on('click', function() {
        $('#hiddenExcelUpload').click();
    });
    
    $('#hiddenExcelUpload').on('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            uploadExcelToProject(file);
        }
    });
}

function uploadExcelToProject(file) {
    if (!currentUser || !currentProject) {
        alert('Session error. Please refresh and try again.');
        return;
    }
    
    // Validate file
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['xls', 'xlsx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
        alert('Please select a valid Excel file (.xls or .xlsx)');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
    }
    
    // Check file name restrictions if project already has files
    validateFileNameForProject(file.name, function(isValid, message) {
        if (!isValid) {
            alert(message);
            return;
        }
        
        // Proceed with upload
        proceedWithUpload(file);
    });
}

function validateFileNameForProject(fileName, callback) {
    if (!projectFiles || projectFiles.length === 0) {
        // No files in project yet, any name is allowed
        callback(true, '');
        return;
    }
    
    // Get the base name without extension for comparison
    const uploadBaseName = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
    const existingFileNames = projectFiles.map(f => f.name.replace(/\.[^/.]+$/, '').toLowerCase());
    
    // Check if the exact filename already exists (allow replacement)
    const exactMatch = projectFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase());
    if (exactMatch) {
        // Same filename - allow replacement
        callback(true, '');
        return;
    }
    
    // Check if base name matches any existing file (different extension)
    const baseNameExists = existingFileNames.includes(uploadBaseName);
    if (baseNameExists) {
        // Different file name than existing files
        callback(false, 
            'This project already contains Excel files with different names. ' +
            'Please either:\n' +
            '• Create a new project for this file, or\n' +
            '• Use the same filename as existing files to replace them\n' +
            '• Existing files: ' + projectFiles.map(f => f.name).join(', ')
        );
        return;
    }
    
    // New unique filename - allowed
    callback(true, '');
}

function proceedWithUpload(file) {
    // Show upload progress
    $('#uploadProgress').show();
    $('#progressText').text('Uploading ' + file.name + '...');
    
    // Create form data
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('user_id', currentUser.id);
    formData.append('project_id', currentProject.id);
    
    // Upload file using XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            $('#progressFill').css('width', percentComplete + '%');
            $('#progressText').text(`Uploading ${file.name}... ${Math.round(percentComplete)}%`);
        }
    });
    
    xhr.addEventListener('load', function() {
        $('#uploadProgress').hide();
        
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    const successMessage = response.message || 'File uploaded successfully!';
                    showUploadSuccess(successMessage);
                    
                    // Reload project files immediately
                    setTimeout(() => {
                        loadProjectFiles();
                    }, 500); // Small delay to ensure file is saved
                    
                    // Clear the file input
                    $('#hiddenExcelUpload').val('');
                } else {
                    // Handle validation errors specially
                    if (response.error_type === 'filename_conflict') {
                        showFilenameConflictDialog(response);
                    } else {
                        showUploadError('Upload failed: ' + response.message);
                    }
                }
            } catch (e) {
                showUploadError('Upload failed: Invalid server response');
            }
        } else {
            showUploadError('Upload failed: Server error');
        }
    });
    
    xhr.addEventListener('error', function() {
        $('#uploadProgress').hide();
        showUploadError('Upload failed: Network error');
    });
    
    xhr.open('POST', 'project_file_manager.php');
    xhr.send(formData);
}

function showFilenameConflictDialog(response) {
    const existingFiles = response.existing_files.join(', ');
    const uploadedFile = response.uploaded_file;
    
    const conflictHtml = `
        <div class="filename-conflict-dialog" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; align-items: center; 
            justify-content: center; z-index: 10000;
        ">
            <div style="
                background: white; padding: 30px; border-radius: 10px; 
                max-width: 500px; margin: 20px; text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h3 style="color: #dc3545; margin-bottom: 20px;">⚠️ Filename Conflict</h3>
                
                <p style="margin-bottom: 15px;">This project already contains:</p>
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <strong>📄 ${existingFiles}</strong>
                </div>
                
                <p style="margin-bottom: 15px;">You're trying to upload:</p>
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>📄 ${uploadedFile}</strong>
                </div>
                
                <p style="margin-bottom: 20px; color: #666;">
                    <strong>Choose an option:</strong>
                </p>
                
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="closeFilenameConflictDialog()" style="
                        background: #6c757d; color: white; border: none; 
                        padding: 10px 20px; border-radius: 5px; cursor: pointer;
                    ">
                        📁 Create New Project
                    </button>
                    
                    <button onclick="showRenameOption('${uploadedFile}', '${existingFiles}')" style="
                        background: #17a2b8; color: white; border: none; 
                        padding: 10px 20px; border-radius: 5px; cursor: pointer;
                    ">
                        ✏️ Rename File
                    </button>
                    
                    <button onclick="closeFilenameConflictDialog()" style="
                        background: #dc3545; color: white; border: none; 
                        padding: 10px 20px; border-radius: 5px; cursor: pointer;
                    ">
                        ❌ Cancel Upload
                    </button>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px; text-align: left;">
                    <small style="color: #0c5460;">
                        <strong>💡 Tip:</strong> Each project should contain files with the same name. 
                        If you need to upload a file with a different name, create a new project.
                    </small>
                </div>
            </div>
        </div>
    `;
    
    $('body').append(conflictHtml);
}

function closeFilenameConflictDialog() {
    $('.filename-conflict-dialog').remove();
    // Clear the file input
    $('#hiddenExcelUpload').val('');
}

function showRenameOption(currentName, existingFiles) {
    const existingName = existingFiles.split(',')[0].trim();
    const extension = existingName.split('.').pop();
    
    $('.filename-conflict-dialog').html(`
        <div style="
            background: white; padding: 30px; border-radius: 10px; 
            max-width: 500px; margin: 20px; text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
            <h3 style="color: #17a2b8; margin-bottom: 20px;">✏️ Rename File</h3>
            
            <p style="margin-bottom: 15px;">Rename your file to match the existing file:</p>
            
            <div style="margin-bottom: 20px;">
                <input type="text" id="newFileName" value="${existingName}" style="
                    width: 100%; padding: 10px; border: 2px solid #ddd; 
                    border-radius: 5px; font-size: 16px; text-align: center;
                ">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="proceedWithRename()" style="
                    background: #28a745; color: white; border: none; 
                    padding: 10px 20px; border-radius: 5px; cursor: pointer;
                ">
                    ✅ Upload with New Name
                </button>
                
                <button onclick="closeFilenameConflictDialog()" style="
                    background: #6c757d; color: white; border: none; 
                    padding: 10px 20px; border-radius: 5px; cursor: pointer;
                ">
                    ❌ Cancel
                </button>
            </div>
            
            <div style="margin-top: 15px;">
                <small style="color: #666;">
                    This will replace the existing file with the same name.
                </small>
            </div>
        </div>
    `);
}

function proceedWithRename() {
    const newFileName = $('#newFileName').val().trim();
    if (!newFileName) {
        alert('Please enter a filename');
        return;
    }
    
    // Note: For now, we'll just close the dialog and suggest manual rename
    // A full implementation would need to rename the file before upload
    alert('Please rename your file to "' + newFileName + '" and upload again.');
    closeFilenameConflictDialog();
}

function loadProjectFiles() {
    if (!currentUser || !currentProject) return;
    
    // Use the working quick file loader with project filtering
    const userId = currentUser.id || currentUser.username;
    const projectName = currentProject.name;
    
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
                
                projectFiles = files;
                displayProjectFiles(files);
            } else {
                $('#projectFilesList').html('<div class="no-files">No files found in this project.</div>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading project files:', error);
            $('#projectFilesList').html('<div class="error-files">Error loading files.</div>');
        }
    });
}

function displayProjectFiles(files) {
    const filesList = $('#projectFilesList');
    
    if (files.length === 0) {
        filesList.html(`
            <div class="no-files">
                <div class="no-files-icon">📄</div>
                <p>No Excel files in this project yet.</p>
                <p>Upload your first Excel file to start analyzing data.</p>
            </div>
        `);
        return;
    }
    
    let html = '<div class="files-grid">';
    
    files.forEach(function(file) {
        const fileSize = formatFileSize(file.size);
        const fileDate = new Date(file.modified).toLocaleDateString();
        
        html += `
            <div class="file-card" data-filename="${file.name}">
                <div class="file-icon">📊</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-date">${fileDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-primary btn-small load-file" data-filename="${file.name}">
                        📈 Load & Analyze
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    filesList.html(html);
    
    // Setup file action handlers
    $('.load-file').on('click', function() {
        const filename = $(this).data('filename');
        loadExcelFileFromProject(filename);
    });
    
    // Delete functionality removed as requested
}

function loadExcelFileFromProject(filename) {
    if (!currentUser || !currentProject) return;
    
    // Show loading state
    showLoadingMessage('Loading ' + filename + '...');
    
    // Find the file in the current project files
    const file = projectFiles.find(f => f.name === filename);
    if (!file) {
        hideLoadingMessage();
        showUploadError('File not found: ' + filename);
        return;
    }
    
    // Use the working quickLoadExcelFile function
    if (typeof quickLoadExcelFile === 'function') {
        hideLoadingMessage();
        
        // Extract project path from full file path
        const projectPath = file.path.substring(0, file.path.lastIndexOf('/'));
        quickLoadExcelFile(projectPath, filename);
    } else {
        // Fallback to direct file loading
        loadExcelFromPath(file.path, filename);
    }
}

function loadExcelFromPath(filePath, filename) {
    // Fetch the Excel file directly from the server path
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            // Process the Excel file using XLSX library
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const excelData = XLSX.utils.sheet_to_json(sheet);
            
            if (excelData.length > 0) {
                // Update global variables
                window.excelData = excelData;
                window.allColumns = Object.keys(excelData[0]);
                
                // Update UI to show file is loaded
                updateFileLoadedUI(filename);
                
                // Populate column selectors for filtering and analysis
                if (typeof populateColumnSelectors === 'function') {
                    populateColumnSelectors(window.allColumns);
                }
                
                // Load any saved settings for this file
                if (typeof loadSettingsForFile === 'function') {
                    loadSettingsForFile(filename);
                }
                
                // Initialize filter columns selector
                if ($('#filterColumnSelect').length > 0) {
                    $('#filterColumnSelect').html('<select id="filterColumns" multiple></select>');
                    window.allColumns.forEach(col => {
                        $('#filterColumns').append(`<option value="${col}">${col}</option>`);
                    });
                }
                
                // Initialize display columns selector
                if ($('#columnSelect').length > 0) {
                    $('#columnSelect').empty();
                    window.allColumns.forEach(col => {
                        $('#columnSelect').append(`<option value="${col}">${col}</option>`);
                    });
                }
                
                // Show the necessary sections
                $('.filter-section').show();
                $('#columnsContainer').show();
                $('.chart-section').show();
                
                // Setup filter loader functionality
                $('#loadFilters').off('click').on('click', function() {
                    const selectedColumns = $('#filterColumns').val();
                    if (!selectedColumns || selectedColumns.length === 0) {
                        alert('Select at least one column to filter.');
                        return;
                    }
                    
                    // Create filter options for selected columns
                    $('#filterOptions').empty();
                    selectedColumns.forEach(col => {
                        const values = [...new Set(window.excelData.map(row => row[col]))];
                        const filterId = `filter-${col.replace(/\s+/g, '_')}`;
                        
                        let html = `<div><strong>${col}</strong><br>`;
                        values.forEach(val => {
                            html += `<label><input type="checkbox" name="${filterId}" value="${val}" checked> ${val}</label><br>`;
                        });
                        html += `</div><hr>`;
                        $('#filterOptions').append(html);
                    });
                    
                    // Set global variable for other functions
                    if (typeof window.filterableColumns !== 'undefined') {
                        window.filterableColumns = selectedColumns;
                    }
                    
                    console.log('Filter options loaded for columns:', selectedColumns);
                });
                
                hideLoadingMessage();
                showUploadSuccess('File loaded successfully! You can now set up filters and create charts.');
                
                console.log('Excel data loaded:', {
                    rows: excelData.length,
                    columns: window.allColumns.length,
                    columnNames: window.allColumns
                });
                
            } else {
                hideLoadingMessage();
                showUploadError('File appears to be empty or invalid');
            }
        })
        .catch(error => {
            hideLoadingMessage();
            console.error('Error processing Excel file:', error);
            showUploadError('Failed to process Excel file: ' + error.message);
        });
}

// Delete functionality removed as requested

function updateProjectUI() {
    if (!currentProject) return;
    
    // Update project title and description
    $('#projectTitle').text(currentProject.name || 'Excel Visualizer');
    $('#projectDescription').text(currentProject.description || 'Interactive multi-column chart comparisons');
    
    // Update user name
    if (currentUser) {
        $('#currentUserName').text(currentUser.name || 'User');
    }
    
    // Show the file upload section
    $('#fileUploadSection').show();
    
    // Show project status
    $('#projectStatus').show();
}

function updateFileLoadedUI(filename) {
    $('#currentFileName').text(filename);
    $('#lastSaved').text('Loaded: ' + new Date().toLocaleString());
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showUploadSuccess(message) {
    // Create or update success message
    let successDiv = $('#uploadSuccessMessage');
    if (successDiv.length === 0) {
        $('body').append('<div id="uploadSuccessMessage" class="upload-message success-message"></div>');
        successDiv = $('#uploadSuccessMessage');
    }
    
    successDiv.text(message).fadeIn();
    setTimeout(() => successDiv.fadeOut(), 3000);
}

function showUploadError(message) {
    // Create or update error message
    let errorDiv = $('#uploadErrorMessage');
    if (errorDiv.length === 0) {
        $('body').append('<div id="uploadErrorMessage" class="upload-message error-message"></div>');
        errorDiv = $('#uploadErrorMessage');
    }
    
    errorDiv.text(message).fadeIn();
    setTimeout(() => errorDiv.fadeOut(), 5000);
}

function showLoadingMessage(message) {
    let loadingDiv = $('#loadingMessage');
    if (loadingDiv.length === 0) {
        $('body').append('<div id="loadingMessage" class="upload-message loading-message"></div>');
        loadingDiv = $('#loadingMessage');
    }
    
    loadingDiv.text(message).fadeIn();
}

function hideLoadingMessage() {
    $('#loadingMessage').fadeOut();
}

// Initialize when document is ready
$(document).ready(function() {
    // Add CSS for the enhanced upload system
    addEnhancedUploadCSS();
    
    // Initialize the system
    initializeEnhancedUpload();
});

function addEnhancedUploadCSS() {
    const css = `
        <style>
        .project-file-manager {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .upload-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
        }
        
        .upload-header h3 {
            margin: 0;
            color: #333;
        }
        
        .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 15px;
        }
        
        .file-card {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            background: #f9f9f9;
            transition: all 0.3s ease;
        }
        
        .file-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0,123,255,0.15);
        }
        
        .file-icon {
            font-size: 24px;
            text-align: center;
            margin-bottom: 10px;
        }
        
        .file-name {
            font-weight: 500;
            color: #333;
            margin-bottom: 5px;
            word-break: break-word;
        }
        
        .file-meta {
            font-size: 12px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .file-meta span {
            margin-right: 15px;
        }
        
        .file-actions {
            display: flex;
            gap: 8px;
        }
        
        .btn-small {
            padding: 5px 10px;
            font-size: 12px;
        }
        
        .no-files, .error-files, .loading-files {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .no-files-icon {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        
        #uploadProgress {
            margin: 15px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: #007bff;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .progress-text {
            margin-top: 8px;
            font-size: 14px;
            color: #666;
        }
        
        .upload-message {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            display: none;
        }
        
        .success-message {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .loading-message {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        </style>
    `;
    
    $('head').append(css);
}