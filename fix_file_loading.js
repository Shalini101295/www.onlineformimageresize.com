// Quick Fix for File Loading - Bypass Project ID Issues
// Add this to enhanced_excel_upload.js or run it separately

// Alternative file loading that bypasses project index
function quickFixLoadFiles() {
    console.log('🔧 Quick Fix: Loading files directly...');
    
    // Get current user from localStorage
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        console.error('No user data found');
        return;
    }
    
    const user = JSON.parse(userData);
    const userId = user.id || user.username;
    
    // Get current project for filtering
    const projectData = localStorage.getItem('currentProject');
    let currentProjectName = null;
    let currentProjectId = null;
    if (projectData) {
        try {
            const currentProject = JSON.parse(projectData);
            currentProjectName = currentProject.name;
            currentProjectId = currentProject.id;
        } catch (e) {
            console.error('Error parsing project data:', e);
        }
    }
    
    console.log('👤 User ID:', userId);
    console.log('📁 Current Project:', currentProjectName);
    
    // Try to load files using direct user ID lookup
    $.ajax({
        url: 'quick_file_loader.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            action: 'scan_user_files',
            user_id: userId,
            filter_project: currentProjectName,
            filter_project_id: currentProjectId
        }),
        success: function(response) {
            console.log('📁 File scan response:', response);
            if (response.success && response.projects) {
                displayQuickFixFiles(response.projects);
            } else {
                console.error('Failed to load files:', response.message);
                $('#projectFilesList').html('<div class="no-files">No files found in this project.</div>');
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading files:', error);
            $('#projectFilesList').html('<div class="error-files">Error loading files: ' + error + '</div>');
        }
    });
}

function displayQuickFixFiles(projects) {
    const filesList = $('#projectFilesList');
    
    // Filter projects to only show current project if we have project context
    let filteredProjects = projects;
    const currentProjectData = localStorage.getItem('currentProject');
    
    if (currentProjectData) {
        try {
            const currentProject = JSON.parse(currentProjectData);
            // Try to match by project name or part of the name
            filteredProjects = projects.filter(project => {
                return project.name.includes(currentProject.name) || 
                       currentProject.name.includes(project.name) ||
                       project.name.toLowerCase().includes('test_project'); // Fallback for test projects
            });
            
            // If no match found, show the most recent project
            if (filteredProjects.length === 0 && projects.length > 0) {
                filteredProjects = [projects[0]]; // Show first/most recent project
            }
        } catch (e) {
            console.error('Error parsing current project:', e);
            filteredProjects = projects.slice(0, 1); // Show only first project
        }
    } else {
        // If no current project context, show only the first project
        filteredProjects = projects.slice(0, 1);
    }
    
    if (filteredProjects.length === 0) {
        filesList.html(`
            <div class="no-files">
                <div class="no-files-icon">📄</div>
                <p>No files found in this project.</p>
            </div>
        `);
        return;
    }
    
    let html = '<div class="files-grid">';
    
    filteredProjects.forEach(project => {
        if (project.files && project.files.length > 0) {
            // Show project name only if multiple projects
            if (filteredProjects.length > 1) {
                html += `<h4>📁 Project: ${project.name}</h4>`;
            }
            
            project.files.forEach(file => {
                html += `
                    <div class="file-item" data-filename="${file.name}" data-project-path="${project.path}">
                        <div class="file-icon">📊</div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${formatFileSize(file.size)}</div>
                            <div class="file-date">${file.modified}</div>
                        </div>
                        <div class="file-actions">
                            <button class="btn btn-primary btn-sm load-file-btn" onclick="quickLoadExcelFile('${project.path}', '${file.name}')">
                                📈 Load & Analyze
                            </button>
                        </div>
                    </div>
                `;
            });
        }
    });
    
    html += '</div>';
    filesList.html(html);
}

function quickLoadExcelFile(projectPath, filename) {
    console.log('📊 Quick loading Excel file:', filename, 'from', projectPath);
    
    // Construct the file URL directly
    const fileUrl = `${projectPath}/${filename}`;
    
    console.log('🔗 File URL:', fileUrl);
    
    // Try to load the file
    fetch(fileUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            console.log('✅ File loaded successfully, size:', buffer.byteLength);
            
            // Parse Excel file
            const workbook = XLSX.read(buffer, {type: 'array'});
            console.log('📋 Workbook sheets:', workbook.SheetNames);
            
            // Process the Excel data properly
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log('📊 Processed Excel data:', jsonData.length, 'rows');
            
            // Set global variables that the analyzer expects
            window.excelData = jsonData;
            window.workbook = workbook;
            window.selectedSheet = firstSheetName;
            
            // Get column names
            const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
            window.allColumns = columns;
            
            console.log('📋 Available columns:', columns);
            
            // Trigger the analyzer with correct data format
            if (typeof processExcelFile === 'function') {
                processExcelFile(buffer, filename);
            } else if (typeof loadExcelData === 'function') {
                loadExcelData(workbook);
            } else if (typeof populateColumnSelectors === 'function') {
                // Pass columns array, not workbook object
                populateColumnSelectors(columns);
                
                // Initialize other analyzer functions if they exist
                if (typeof setupFilterLoader === 'function') {
                    setupFilterLoader();
                }
                if (typeof setupChartGenerator === 'function') {
                    setupChartGenerator();
                }
                
                // Show the relevant sections
                $('.filter-section').show();
                $('#columnsContainer').show();
                $('.charts-section').show();
                
                alert(`✅ Excel file loaded successfully!\n\nFound ${jsonData.length} rows with columns:\n${columns.join(', ')}\n\nYou can now create charts!`);
            } else {
                alert('✅ Excel file loaded successfully! You can now create charts.');
            }
        })
        .catch(error => {
            console.error('❌ Failed to load Excel file:', error);
            alert('Failed to load Excel file: ' + error.message);
        });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Auto-run if this is included in a page with the required elements
$(document).ready(function() {
    if ($('#projectFilesList').length > 0) {
        console.log('🚀 Running quick fix file loader...');
        
        // First check if we have manually saved project data
        const quickFixProjects = localStorage.getItem('quickFixProjects');
        if (quickFixProjects) {
            console.log('📁 Found manually saved projects, using those...');
            try {
                const projects = JSON.parse(quickFixProjects);
                displayQuickFixFiles(projects);
                return;
            } catch (e) {
                console.error('Error parsing saved projects:', e);
            }
        }
        
        // Otherwise try automatic detection
        setTimeout(quickFixLoadFiles, 1000); // Give page time to load
    }
});

// Add manual override function
function forceDirectFileLoad() {
    console.log('🔧 Force loading known file...');
    
    // Try to get the correct path from saved scan results
    const savedProjects = localStorage.getItem('quickFixProjects');
    if (savedProjects) {
        try {
            const projects = JSON.parse(savedProjects);
            if (projects.length > 0 && projects[0].files && projects[0].files.length > 0) {
                const project = projects[0];
                const file = projects[0].files[0];
                console.log('📁 Using scanned project path:', project.path);
                console.log('📄 Loading file:', file.name);
                quickLoadExcelFile(project.path, file.name);
                return;
            }
        } catch (e) {
            console.error('Error parsing saved projects:', e);
        }
    }
    
    // Fallback to updated hardcoded path
    const knownProjectPath = 'user_projects/shashank_sinha_0_4206/Test_Project_proj_1752926209_3120';
    const knownFileName = '250720_New.xlsx';
    
    console.log('📁 Using fallback path:', knownProjectPath);
    quickLoadExcelFile(knownProjectPath, knownFileName);
}

// Add debug button to the page
function addDebugButton() {
    const filesList = $('#projectFilesList');
    if (filesList.length > 0) {
        filesList.html(`
            <div style="text-align: center; padding: 20px;">
                <h3>🔧 Debug File Loading</h3>
                <p>If files aren't appearing automatically, try these options:</p>
                <button onclick="quickFixLoadFiles()" style="background: #28a745; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;">
                    🔄 Retry Auto Scan
                </button>
                <button onclick="forceDirectFileLoad()" style="background: #dc3545; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;">
                    📊 Load Known File
                </button>
                <button onclick="window.open('test_quick_fix.html', '_blank')" style="background: #007bff; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 4px; cursor: pointer;">
                    🔍 Open Debug Tool
                </button>
            </div>
        `);
    }
}

// Show debug button after a delay if no files are found
setTimeout(() => {
    if ($('#projectFilesList').text().includes('No Excel files found')) {
        addDebugButton();
    }
}, 3000);

console.log('🔧 Quick fix file loader script loaded. Call quickFixLoadFiles() to scan for files.');