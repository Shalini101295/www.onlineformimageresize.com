<?php
// Quick File Loader - Bypass Project Index Issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('No input data received');
    }
    
    $action = $input['action'] ?? '';
    $user_id = $input['user_id'] ?? '';
    
    if ($action === 'scan_user_files') {
        scanUserFiles($user_id);
    } else {
        throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function scanUserFiles($user_id) {
    if (empty($user_id)) {
        throw new Exception('User ID is required');
    }
    
    $base_dir = 'user_projects';
    $projects = [];
    
    // Find user directory
    $user_dirs = [];
    
    if (is_dir($base_dir)) {
        $dirs = scandir($base_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            
            // Check if directory name contains the user ID
            if (strpos($dir, $user_id) !== false || $dir === $user_id) {
                $user_dirs[] = $dir;
            }
        }
    }
    
    // If no exact match, try to find directories that might belong to the user
    if (empty($user_dirs)) {
        // Try variations of the user ID
        $user_variations = [
            $user_id,
            str_replace(' ', '_', $user_id),
            str_replace('.', '_', $user_id),
            strtolower($user_id),
            strtolower(str_replace(' ', '_', $user_id))
        ];
        
        if (is_dir($base_dir)) {
            $dirs = scandir($base_dir);
            foreach ($dirs as $dir) {
                if ($dir === '.' || $dir === '..') continue;
                
                foreach ($user_variations as $variation) {
                    if (strpos(strtolower($dir), strtolower($variation)) !== false) {
                        $user_dirs[] = $dir;
                        break;
                    }
                }
            }
        }
    }
    
    // Scan each user directory for projects
    foreach ($user_dirs as $user_dir) {
        $user_path = $base_dir . '/' . $user_dir;
        
        if (is_dir($user_path)) {
            $project_dirs = scandir($user_path);
            
            foreach ($project_dirs as $project_dir) {
                if ($project_dir === '.' || $project_dir === '..') continue;
                
                $project_path = $user_path . '/' . $project_dir;
                
                if (is_dir($project_path)) {
                    $project_files = scanExcelFiles($project_path);
                    
                    if (!empty($project_files)) {
                        $projects[] = [
                            'name' => $project_dir,
                            'path' => $project_path,
                            'files' => $project_files,
                            'user_dir' => $user_dir
                        ];
                    }
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'user_dirs_found' => $user_dirs,
        'total_projects' => count($projects),
        'scanned_user_id' => $user_id
    ]);
}

function scanExcelFiles($directory) {
    $files = [];
    $excel_extensions = ['xlsx', 'xls'];
    
    if (is_dir($directory)) {
        $dir_files = scandir($directory);
        
        foreach ($dir_files as $file) {
            if ($file === '.' || $file === '..' || $file === 'project_metadata.json') {
                continue;
            }
            
            $file_path = $directory . '/' . $file;
            
            if (is_file($file_path)) {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                
                if (in_array($extension, $excel_extensions)) {
                    $files[] = [
                        'name' => $file,
                        'size' => filesize($file_path),
                        'modified' => date('Y-m-d H:i:s', filemtime($file_path)),
                        'extension' => $extension,
                        'path' => $file_path
                    ];
                }
            }
        }
    }
    
    return $files;
}
?>