// PASTE THIS INTO BROWSER CONSOLE TO FIX IMMEDIATELY:

// Remove delete buttons
$('button:contains("Delete"), .btn-danger, button:contains("🗑️")').remove();

// Hide non-current project files
(function() {
    try {
        const currentProject = JSON.parse(localStorage.getItem('currentProject') || '{}');
        const currentProjectName = currentProject.name || '';
        if (currentProjectName) {
            $('h4:contains("Project:")').each(function() {
                if (!$(this).text().includes(currentProjectName)) {
                    $(this).next().hide();
                    $(this).hide();
                }
            });
        }
    } catch(e) { console.log('Project filtering error:', e); }
})();

// Add refresh button
if (!$('#quickRefreshBtn').length) {
    $('<button id="quickRefreshBtn" style="background:#28a745;color:white;border:none;padding:8px 12px;border-radius:4px;margin:10px;cursor:pointer;">🔄 Refresh Files</button>')
    .insertBefore('#projectFilesList')
    .click(function() {
        if (typeof quickFixLoadFiles === 'function') {
            quickFixLoadFiles();
        } else {
            location.reload();
        }
        setTimeout(() => {
            $('button:contains("Delete"), .btn-danger').remove();
        }, 1000);
    });
}

// Override upload success to auto-refresh
window.originalShowUploadSuccess = window.showUploadSuccess;
window.showUploadSuccess = function(msg) {
    if (window.originalShowUploadSuccess) window.originalShowUploadSuccess(msg);
    setTimeout(() => {
        if (typeof quickFixLoadFiles === 'function') quickFixLoadFiles();
        setTimeout(() => $('button:contains("Delete"), .btn-danger').remove(), 500);
    }, 500);
};

console.log('✅ Quick fixes applied! Delete buttons removed, project filtering applied, auto-refresh enabled.');