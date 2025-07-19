<?php
// Debug 403 Errors - Server Permission Test
header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔍 403 Error Debug</h1>";
echo "<p>Testing server permissions and file access...</p>";

// Test 1: Basic PHP execution
echo "<h2>✅ Test 1: PHP Working</h2>";
echo "<p>✅ PHP is executing properly (you can see this page)</p>";

// Test 2: Current directory info
echo "<h2>📁 Test 2: Directory Information</h2>";
$current_dir = getcwd();
echo "<p><strong>Current Directory:</strong> $current_dir</p>";
echo "<p><strong>Directory Readable:</strong> " . (is_readable($current_dir) ? "✅ Yes" : "❌ No") . "</p>";
echo "<p><strong>Directory Writable:</strong> " . (is_writable($current_dir) ? "✅ Yes" : "❌ No") . "</p>";

// Test 3: Check if favicon exists
echo "<h2>🖼️ Test 3: Favicon Check</h2>";
$favicon_path = $current_dir . '/favicon.ico';
if (file_exists($favicon_path)) {
    echo "<p>✅ favicon.ico exists at: $favicon_path</p>";
    echo "<p><strong>File Size:</strong> " . filesize($favicon_path) . " bytes</p>";
    echo "<p><strong>File Readable:</strong> " . (is_readable($favicon_path) ? "✅ Yes" : "❌ No") . "</p>";
    echo "<p><strong>File Permissions:</strong> " . substr(sprintf('%o', fileperms($favicon_path)), -4) . "</p>";
} else {
    echo "<p>❌ favicon.ico not found at: $favicon_path</p>";
    echo "<p>💡 Try creating favicon.ico in the root directory</p>";
}

// Test 4: Check user_projects directory
echo "<h2>📂 Test 4: User Projects Directory</h2>";
$projects_dir = $current_dir . '/user_projects';
if (file_exists($projects_dir)) {
    echo "<p>✅ user_projects directory exists</p>";
    echo "<p><strong>Directory Readable:</strong> " . (is_readable($projects_dir) ? "✅ Yes" : "❌ No") . "</p>";
    echo "<p><strong>Directory Permissions:</strong> " . substr(sprintf('%o', fileperms($projects_dir)), -4) . "</p>";
    
    // List some contents
    $contents = scandir($projects_dir);
    echo "<p><strong>Contents:</strong> " . implode(', ', array_slice($contents, 2, 5)) . "</p>";
} else {
    echo "<p>❌ user_projects directory not found</p>";
}

// Test 5: Check for Excel files
echo "<h2>📊 Test 5: Excel Files Check</h2>";
if (file_exists($projects_dir)) {
    $excel_files = [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($projects_dir));
    foreach ($iterator as $file) {
        if ($file->isFile() && in_array($file->getExtension(), ['xlsx', 'xls'])) {
            $excel_files[] = $file->getPathname();
            if (count($excel_files) >= 3) break; // Limit to first 3 files
        }
    }
    
    if (!empty($excel_files)) {
        echo "<p>✅ Found Excel files:</p><ul>";
        foreach ($excel_files as $file) {
            $relative_path = str_replace($current_dir . '/', '', $file);
            echo "<li><strong>$relative_path</strong> - " . (is_readable($file) ? "✅ Readable" : "❌ Not Readable") . "</li>";
        }
        echo "</ul>";
    } else {
        echo "<p>❌ No Excel files found in user_projects</p>";
    }
}

// Test 6: Server information
echo "<h2>🖥️ Test 6: Server Information</h2>";
echo "<p><strong>PHP Version:</strong> " . phpversion() . "</p>";
echo "<p><strong>Server Software:</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>";
echo "<p><strong>Document Root:</strong> " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Unknown') . "</p>";
echo "<p><strong>HTTP Host:</strong> " . ($_SERVER['HTTP_HOST'] ?? 'Unknown') . "</p>";

// Test 7: File creation test
echo "<h2>✏️ Test 7: File Creation Test</h2>";
$test_file = $current_dir . '/test_write.txt';
if (file_put_contents($test_file, 'test content')) {
    echo "<p>✅ Can create files</p>";
    unlink($test_file); // Clean up
} else {
    echo "<p>❌ Cannot create files - permission issue</p>";
}

// Test 8: Direct file access test
echo "<h2>🔗 Test 8: Direct Access Test</h2>";
echo "<p>Try accessing these URLs directly:</p>";
echo "<ul>";
echo "<li><a href='favicon.ico' target='_blank'>favicon.ico</a> - Should show icon or download</li>";
echo "<li><a href='test_403_debug.php' target='_blank'>This debug file</a> - Should work</li>";
if (!empty($excel_files)) {
    $test_excel = str_replace($current_dir . '/', '', $excel_files[0]);
    echo "<li><a href='$test_excel' target='_blank'>$test_excel</a> - Should download Excel file</li>";
}
echo "</ul>";

// Test 9: .htaccess check
echo "<h2>📋 Test 9: .htaccess Status</h2>";
$htaccess_files = [
    '.htaccess',
    '.htaccess_backup', 
    '.htaccess.txt',
    'htaccess.txt'
];

foreach ($htaccess_files as $htaccess_file) {
    if (file_exists($current_dir . '/' . $htaccess_file)) {
        echo "<p>⚠️ Found: $htaccess_file</p>";
    }
}

if (!file_exists($current_dir . '/.htaccess')) {
    echo "<p>✅ No .htaccess file found (good for testing)</p>";
} else {
    echo "<p>⚠️ .htaccess file still exists - this might be causing 403 errors</p>";
}

// Test 10: Hosting provider specific
echo "<h2>🏢 Test 10: Hosting Provider Check</h2>";
$server_name = $_SERVER['SERVER_NAME'] ?? '';
if (strpos($server_name, 'onlineformimageresize.com') !== false) {
    echo "<p>🔍 Detected hosting: onlineformimageresize.com</p>";
    echo "<p>💡 This appears to be a shared hosting environment</p>";
    echo "<p>⚠️ Shared hosting may have additional security restrictions</p>";
    echo "<p>💡 Check your hosting control panel for:</p>";
    echo "<ul>";
    echo "<li>File permissions settings</li>";
    echo "<li>Hotlink protection</li>";
    echo "<li>Security modules (ModSecurity)</li>";
    echo "<li>Directory browsing settings</li>";
    echo "</ul>";
}

echo "<h2>🎯 Next Steps</h2>";
echo "<p>If files exist but still get 403 errors:</p>";
echo "<ol>";
echo "<li>Check hosting control panel for security settings</li>";
echo "<li>Try changing file permissions to 644</li>";
echo "<li>Try changing directory permissions to 755</li>";
echo "<li>Contact hosting support about 403 errors</li>";
echo "<li>Check for ModSecurity or similar security modules blocking requests</li>";
echo "</ol>";

?>