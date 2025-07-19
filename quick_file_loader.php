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
    } elseif ($action === 'scan_all_files') {
        scanAllFiles();
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
    
    // Find ALL user directories and scan them all
    $user_dirs = [];
    
    if (is_dir($base_dir)) {
        $dirs = scandir($base_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            
            // Add ALL directories - we'll scan everything to find files
            $user_dirs[] = $dir;
        }
    }
    
    // Extract potential user identifiers from the provided user_id
    $user_patterns = [];
    
    // Extract numbers from user_id (e.g., 1752911380, 4206)
    preg_match_all('/\d+/', $user_id, $numbers);
    if (!empty($numbers[0])) {
        foreach ($numbers[0] as $number) {
            $user_patterns[] = $number;
        }
    }
    
    // Extract name parts (e.g., from shashank_sinha_0_4206)
    $name_parts = explode('_', $user_id);
    foreach ($name_parts as $part) {
        if (!empty($part) && !is_numeric($part)) {
            $user_patterns[] = $part;
        }
    }
    
    // Also add the full user_id
    $user_patterns[] = $user_id;
    
    // Scan each user directory for projects
    foreach ($user_dirs as $user_dir) {
        $user_path = $base_dir . '/' . $user_dir;
        
        // Check if this user directory matches any of our patterns
        $is_match = false;
        foreach ($user_patterns as $pattern) {
            if (strpos(strtolower($user_dir), strtolower($pattern)) !== false) {
                $is_match = true;
                break;
            }
        }
        
        // If no pattern match and we have specific patterns, skip this directory
        // But if no patterns found, scan all directories
        if (!empty($user_patterns) && count($user_patterns) > 1 && !$is_match) {
            continue;
        }
        
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
                            'user_dir' => $user_dir,
                            'match_score' => $is_match ? 10 : 1  // Higher score for matched directories
                        ];
                    }
                }
            }
        }
    }
    
    // Sort projects by match score (better matches first)
    usort($projects, function($a, $b) {
        return ($b['match_score'] ?? 0) - ($a['match_score'] ?? 0);
    });
    
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

function scanAllFiles() {
    $base_dir = 'user_projects';
    $projects = [];
    
    if (!is_dir($base_dir)) {
        throw new Exception('User projects directory not found');
    }
    
    // Scan ALL directories and subdirectories for Excel files
    $user_dirs = scandir($base_dir);
    
    foreach ($user_dirs as $user_dir) {
        if ($user_dir === '.' || $user_dir === '..') continue;
        
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
                            'user_dir' => $user_dir,
                            'full_path' => $project_path
                        ];
                    }
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'projects' => $projects,
        'total_projects' => count($projects),
        'scanned_action' => 'scan_all_files'
    ]);
}
?>