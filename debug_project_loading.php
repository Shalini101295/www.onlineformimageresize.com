<?php
// Debug Project Loading Issues
header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔍 Debug Project Loading</h1>";

// Check projects index file
echo "<h2>📋 Projects Index File</h2>";
$projects_index_file = 'projects_index.txt';

if (file_exists($projects_index_file)) {
    echo "<p>✅ projects_index.txt exists</p>";
    $content = file_get_contents($projects_index_file);
    echo "<p><strong>Content:</strong></p>";
    echo "<pre style='background: #f0f0f0; padding: 10px; border-radius: 5px;'>";
    echo htmlspecialchars($content);
    echo "</pre>";
    
    // Parse projects
    echo "<h3>📊 Parsed Projects:</h3>";
    $lines = explode("\n", trim($content));
    foreach ($lines as $i => $line) {
        if (!empty($line)) {
            $project = json_decode($line, true);
            if ($project) {
                echo "<div style='border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;'>";
                echo "<strong>Project " . ($i + 1) . ":</strong><br>";
                echo "ID: " . ($project['id'] ?? 'N/A') . "<br>";
                echo "User ID: " . ($project['user_id'] ?? 'N/A') . "<br>";
                echo "Name: " . ($project['name'] ?? 'N/A') . "<br>";
                echo "Directory: " . ($project['project_dir'] ?? 'N/A') . "<br>";
                
                // Check if directory exists
                $dir = $project['project_dir'] ?? '';
                if (!empty($dir)) {
                    if (is_dir($dir)) {
                        echo "Directory Status: ✅ Exists<br>";
                        
                        // List files in directory
                        $files = scandir($dir);
                        $excel_files = [];
                        foreach ($files as $file) {
                            if ($file !== '.' && $file !== '..' && $file !== 'project_metadata.json') {
                                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                                if (in_array($extension, ['xlsx', 'xls'])) {
                                    $excel_files[] = $file;
                                }
                            }
                        }
                        
                        if (!empty($excel_files)) {
                            echo "Excel Files: " . implode(', ', $excel_files) . "<br>";
                        } else {
                            echo "Excel Files: ❌ None found<br>";
                        }
                    } else {
                        echo "Directory Status: ❌ Does not exist<br>";
                    }
                }
                echo "</div>";
            } else {
                echo "<p>❌ Invalid JSON on line " . ($i + 1) . ": " . htmlspecialchars($line) . "</p>";
            }
        }
    }
} else {
    echo "<p>❌ projects_index.txt not found</p>";
}

// Check user_projects directory structure
echo "<h2>📂 User Projects Directory Structure</h2>";
$base_dir = 'user_projects';

if (is_dir($base_dir)) {
    echo "<p>✅ user_projects directory exists</p>";
    
    $users = scandir($base_dir);
    foreach ($users as $user) {
        if ($user === '.' || $user === '..') continue;
        
        $user_path = $base_dir . '/' . $user;
        if (is_dir($user_path)) {
            echo "<h3>👤 User: $user</h3>";
            
            $projects = scandir($user_path);
            foreach ($projects as $project) {
                if ($project === '.' || $project === '..') continue;
                
                $project_path = $user_path . '/' . $project;
                if (is_dir($project_path)) {
                    echo "<div style='margin-left: 20px; border-left: 3px solid #007bff; padding-left: 10px; margin: 10px 0;'>";
                    echo "<strong>📁 Project: $project</strong><br>";
                    
                    $files = scandir($project_path);
                    $excel_files = [];
                    foreach ($files as $file) {
                        if ($file !== '.' && $file !== '..' && $file !== 'project_metadata.json') {
                            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                            if (in_array($extension, ['xlsx', 'xls'])) {
                                $excel_files[] = $file;
                            }
                        }
                    }
                    
                    if (!empty($excel_files)) {
                        echo "Excel Files: " . implode(', ', $excel_files) . "<br>";
                    } else {
                        echo "Excel Files: None<br>";
                    }
                    
                    echo "Full Path: $project_path<br>";
                    echo "</div>";
                }
            }
        }
    }
} else {
    echo "<p>❌ user_projects directory not found</p>";
}

// Test project lookup
echo "<h2>🔍 Test Project Lookup</h2>";

// Try to find the project we saw in the debug
$test_user_id = 'shashank_sinha_0_4206';
$test_project_path = 'user_projects/shashank_sinha_0_4206/Project_1_proj_1752924401_4611';

echo "<p><strong>Testing lookup for user:</strong> $test_user_id</p>";
echo "<p><strong>Expected project path:</strong> $test_project_path</p>";

if (is_dir($test_project_path)) {
    echo "<p>✅ Project directory exists</p>";
    
    // What project ID would match this?
    echo "<p><strong>Need to find project ID that maps to this directory...</strong></p>";
    
    // Check if there's a project_metadata.json file
    $metadata_file = $test_project_path . '/project_metadata.json';
    if (file_exists($metadata_file)) {
        $metadata = json_decode(file_get_contents($metadata_file), true);
        echo "<p>📄 Project metadata found:</p>";
        echo "<pre style='background: #f0f0f0; padding: 10px; border-radius: 5px;'>";
        echo htmlspecialchars(json_encode($metadata, JSON_PRETTY_PRINT));
        echo "</pre>";
    } else {
        echo "<p>⚠️ No project_metadata.json found</p>";
    }
} else {
    echo "<p>❌ Project directory does not exist</p>";
}

echo "<h2>💡 Next Steps</h2>";
echo "<p>1. Check if project IDs in localStorage match projects_index.txt</p>";
echo "<p>2. Ensure project is properly registered in the index</p>";
echo "<p>3. Check if findProjectDirectory function is working correctly</p>";

?>

<script>
// Show current localStorage data
console.log('🔍 Current localStorage data:');
console.log('Current User:', localStorage.getItem('currentUser'));
console.log('Current Project:', localStorage.getItem('currentProject'));

// Display on page
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('currentUser');
    const currentProject = localStorage.getItem('currentProject');
    
    const debugDiv = document.createElement('div');
    debugDiv.innerHTML = `
        <h2>💾 localStorage Debug</h2>
        <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <strong>Current User:</strong><br>
            <pre>${currentUser || 'Not found'}</pre>
        </div>
        <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <strong>Current Project:</strong><br>
            <pre>${currentProject || 'Not found'}</pre>
        </div>
    `;
    document.body.appendChild(debugDiv);
});
</script>