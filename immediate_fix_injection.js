// IMMEDIATE FIX - Run this in browser console or add to page
console.log('🚀 Applying immediate fixes...');

// Fix 1: Remove all delete buttons immediately
function removeDeleteButtons() {
    console.log('🗑️ Removing delete buttons...');
    
    // Remove delete buttons by multiple selectors
    const deleteSelectors = [
        'button:contains("Delete")',
        'button:contains("🗑️")',
        '.btn-danger',
        '[data-action="delete"]',
        '.delete-file'
    ];
    
    deleteSelectors.forEach(selector => {
        try {
            if (selector.includes('contains')) {
                // Handle text-based selectors
                $('button').filter(function() {
                    return $(this).text().includes('Delete') || $(this).text().includes('🗑️');
                }).remove();
            } else {
                $(selector).remove();
            }
        } catch (e) {
            console.log('Selector not found:', selector);
        }
    });
    
    // Also remove delete icons
    $('.fa-trash, .fa-delete').parent().remove();
    
    console.log('✅ Delete buttons removed');
}

// Fix 2: Filter projects to show only current project
function filterToCurrentProject() {
    console.log('📁 Filtering to current project only...');
    
    try {
        const currentProject = JSON.parse(localStorage.getItem('currentProject') || '{}');
        const currentProjectName = currentProject.name || '';
        
        console.log('Current project name:', currentProjectName);
        
        if (!currentProjectName) {
            console.log('⚠️ No current project found');
            return;
        }
        
        // Find all project sections
        const projectSections = $('.project-section, [data-project], h4:contains("Project:")');
        let currentProjectFiles = [];
        
        projectSections.each(function() {
            const sectionText = $(this).text();
            console.log('Checking section:', sectionText);
            
            // If this section matches current project, keep its files
            if (sectionText.includes(currentProjectName) || 
                currentProjectName.includes(sectionText.replace('📁 Project: ', '').trim())) {
                
                console.log('✅ Keeping project section:', sectionText);
                currentProjectFiles.push($(this).next('.files-grid, .file-item').addBack());
            } else {
                console.log('❌ Hiding project section:', sectionText);
                $(this).next('.files-grid').hide();
                $(this).hide();
            }
        });
        
        // Also check individual file items for project matching
        $('.file-item').each(function() {
            const projectPath = $(this).data('project-path') || '';
            if (projectPath && !projectPath.includes(currentProjectName)) {
                $(this).hide();
            }
        });
        
        console.log('✅ Project filtering applied');
        
    } catch (e) {
        console.error('Error filtering projects:', e);
    }
}

// Fix 3: Enhanced file reload after upload
function enhanceUploadHandler() {
    console.log('📤 Enhancing upload handler...');
    
    // Override the original upload success handler
    window.originalUploadSuccess = window.showUploadSuccess || function() {};
    
    window.showUploadSuccess = function(message) {
        console.log('📤 Upload success, reloading files...');
        
        // Call original handler
        if (window.originalUploadSuccess) {
            window.originalUploadSuccess(message);
        }
        
        // Force reload files after short delay
        setTimeout(() => {
            console.log('🔄 Force reloading project files...');
            
            // Try multiple reload methods
            if (typeof quickFixLoadFiles === 'function') {
                quickFixLoadFiles();
            } else if (typeof loadProjectFiles === 'function') {
                loadProjectFiles();
            } else {
                // Fallback: reload the page section
                location.reload();
            }
            
            // Apply fixes again after reload
            setTimeout(() => {
                removeDeleteButtons();
                filterToCurrentProject();
            }, 1000);
            
        }, 500);
    };
    
    console.log('✅ Upload handler enhanced');
}

// Fix 4: Create a manual refresh button
function addManualRefreshButton() {
    console.log('🔄 Adding manual refresh button...');
    
    const refreshButton = $(`
        <button id="manualRefreshBtn" style="
            background: #28a745; color: white; border: none; 
            padding: 10px 15px; border-radius: 4px; cursor: pointer;
            margin: 10px; font-size: 14px;
        ">
            🔄 Refresh Files
        </button>
    `);
    
    refreshButton.on('click', function() {
        console.log('🔄 Manual refresh triggered...');
        
        // Try to reload files
        if (typeof quickFixLoadFiles === 'function') {
            quickFixLoadFiles();
        } else {
            location.reload();
        }
        
        // Apply fixes after reload
        setTimeout(() => {
            removeDeleteButtons();
            filterToCurrentProject();
        }, 1000);
    });
    
    // Add button to page
    $('#projectFilesList').before(refreshButton);
    
    console.log('✅ Manual refresh button added');
}

// Fix 5: Apply all fixes immediately and set up observers
function applyAllFixes() {
    console.log('🔧 Applying all immediate fixes...');
    
    // Apply fixes immediately
    removeDeleteButtons();
    filterToCurrentProject();
    enhanceUploadHandler();
    addManualRefreshButton();
    
    // Set up mutation observer to re-apply fixes when content changes
    const observer = new MutationObserver(function(mutations) {
        let shouldApplyFixes = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if new content was added
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && (
                        node.querySelector && (
                            node.querySelector('.file-item') ||
                            node.querySelector('button') ||
                            node.classList.contains('file-item')
                        ))) {
                        shouldApplyFixes = true;
                        break;
                    }
                }
            }
        });
        
        if (shouldApplyFixes) {
            console.log('🔄 Content changed, re-applying fixes...');
            setTimeout(() => {
                removeDeleteButtons();
                filterToCurrentProject();
            }, 100);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ All fixes applied and observer set up');
}

// Auto-run fixes
$(document).ready(function() {
    console.log('📋 DOM ready, applying fixes...');
    applyAllFixes();
});

// Also run immediately if jQuery is available
if (typeof $ !== 'undefined') {
    applyAllFixes();
}

// Make functions globally available
window.immediateFixFunctions = {
    removeDeleteButtons,
    filterToCurrentProject,
    enhanceUploadHandler,
    addManualRefreshButton,
    applyAllFixes
};

console.log('🎯 Immediate fix script loaded! All fixes should be applied now.');
console.log('💡 If issues persist, run: window.immediateFixFunctions.applyAllFixes()');