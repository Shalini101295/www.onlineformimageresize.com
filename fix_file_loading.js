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
    
    console.log('👤 User ID:', userId);
    
    // Try to load files using direct user ID lookup
    $.ajax({
        url: 'quick_file_loader.php',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            action: 'scan_user_files',
            user_id: userId
        }),
        success: function(response) {
            console.log('📁 File scan response:', response);
            if (response.success && response.projects) {
                displayQuickFixFiles(response.projects);
            } else {
                console.error('Failed to load files:', response.message);
                $('#projectFilesList').html('<div class="error-files">Failed to load files: ' + (response.message || 'Unknown error') + '</div>');
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
    
    if (projects.length === 0) {
        filesList.html(`
            <div class="no-files">
                <div class="no-files-icon">📄</div>
                <p>No Excel files found in any project.</p>
            </div>
        `);
        return;
    }
    
    let html = '<div class="quick-fix-files">';
    
    projects.forEach(project => {
        if (project.files && project.files.length > 0) {
            html += `
                <div class="project-section">
                    <h4>📁 Project: ${project.name}</h4>
                    <div class="files-grid">
            `;
            
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
                            <button class="btn btn-danger btn-sm" onclick="deleteFile('${file.name}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
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
            
            // Call the existing Excel processing function
            if (typeof window.excelData !== 'undefined') {
                window.excelData = buffer;
            }
            
            // Trigger the analyzer
            if (typeof processExcelFile === 'function') {
                processExcelFile(buffer, filename);
            } else if (typeof loadExcelData === 'function') {
                loadExcelData(workbook);
            } else {
                // Basic processing
                populateColumnSelectors(workbook);
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
    const knownFile = 'user_projects/shashank_sinha_0_4206/Project_1_proj_1752924401_4611/250720_New.xlsx';
    quickLoadExcelFile('user_projects/shashank_sinha_0_4206/Project_1_proj_1752924401_4611', '250720_New.xlsx');
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