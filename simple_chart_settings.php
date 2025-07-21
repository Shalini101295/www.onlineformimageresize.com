<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    $user_id = $input['user_id'] ?? '';
    $project_name = $input['project_name'] ?? '';
    $action = $input['action'] ?? 'load';
    $settings = $input['settings'] ?? null;
    
    if (empty($user_id) || empty($project_name)) {
        throw new Exception('Missing user_id or project_name');
    }
    
    // Use the same logic as quick_file_loader.php for consistency
    $base_dir = 'user_projects';
    $found_project_dir = null;
    
    // Find ALL user directories and scan them all (same as quick_file_loader.php)
    $user_dirs = [];
    
    if (is_dir($base_dir)) {
        $dirs = scandir($base_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            $user_dirs[] = $dir;
        }
    }
    
    // Extract potential user identifiers from the provided user_id (same as quick_file_loader.php)
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
    
    // Scan each user directory for projects (same as quick_file_loader.php)
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
        if (!empty($user_patterns) && count($user_patterns) > 1 && !$is_match) {
            continue;
        }
        
        if (is_dir($user_path)) {
            $project_dirs = scandir($user_path);
            
            foreach ($project_dirs as $project_dir) {
                if ($project_dir === '.' || $project_dir === '..') continue;
                
                $project_path = $user_path . '/' . $project_dir;
                
                if (is_dir($project_path)) {
                    // Apply project filter using the same logic as quick_file_loader.php
                    $include_project = false;
                    
                    // Check project metadata for more accurate filtering
                    $metadata_file = $project_path . '/project_metadata.json';
                    $project_metadata = null;
                    if (file_exists($metadata_file)) {
                        $metadata_content = file_get_contents($metadata_file);
                        $project_metadata = json_decode($metadata_content, true);
                    }
                    
                    // Try project ID match first (most accurate)
                    if ($project_metadata && isset($project_metadata['id'])) {
                        if ($project_metadata['id'] === $project_name) {
                            $include_project = true;
                        }
                    }
                    
                    // If no ID match, try name matching
                    if (!$include_project) {
                        $project_dir_lower = strtolower($project_dir);
                        $project_name_lower = strtolower($project_name);
                        
                        // Check metadata name first
                        if ($project_metadata && isset($project_metadata['name'])) {
                            $metadata_name_lower = strtolower($project_metadata['name']);
                            if ($metadata_name_lower === $project_name_lower) {
                                $include_project = true;
                            }
                        }
                        
                        // If no metadata match, try directory name matching
                        if (!$include_project) {
                            $include_project = (
                                // Exact match
                                $project_dir_lower === $project_name_lower ||
                                // Directory contains filter AND filter is substantial (>3 chars)
                                (strlen($project_name) > 3 && strpos($project_dir_lower, $project_name_lower) !== false) ||
                                // Filter contains directory name AND directory name is substantial
                                (strlen($project_dir) > 3 && strpos($project_name_lower, $project_dir_lower) !== false)
                            );
                        }
                    }
                    
                    if ($include_project) {
                        $found_project_dir = $project_path;
                        break 2; // Break out of both loops
                    }
                }
            }
        }
    }
    
    if ($action === 'save') {
        if (!$settings) {
            throw new Exception('No settings provided for save');
        }
        
        if (!$found_project_dir) {
            throw new Exception("Project directory not found for user: $user_id, project: $project_name");
        }
        
        $settings_file = "$found_project_dir/chart_settings.json";
        $settings['saved_at'] = date('Y-m-d H:i:s');
        $settings['version'] = '1.0';
        
        $json_data = json_encode($settings, JSON_PRETTY_PRINT);
        if (file_put_contents($settings_file, $json_data) === false) {
            throw new Exception("Failed to save settings to: $settings_file");
        }
        
        // Create backup
        $backup_file = "$found_project_dir/chart_settings_" . date('Y-m-d_H-i-s') . ".json";
        file_put_contents($backup_file, $json_data);
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings saved successfully',
            'file_path' => $settings_file,
            'project_dir' => $found_project_dir
        ]);
        
    } else { // load
        if (!$found_project_dir) {
            echo json_encode([
                'success' => false,
                'message' => 'No project directory found',
                'user_id' => $user_id,
                'project_name' => $project_name
            ]);
            exit;
        }
        
        $settings_file = "$found_project_dir/chart_settings.json";
        if (!file_exists($settings_file)) {
            echo json_encode([
                'success' => false,
                'message' => 'No saved chart settings found',
                'project_dir' => $found_project_dir
            ]);
            exit;
        }
        
        $json_data = file_get_contents($settings_file);
        $settings = json_decode($json_data, true);
        
        if ($settings === null) {
            throw new Exception('Invalid JSON in settings file');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings loaded successfully',
            'settings' => $settings,
            'project_dir' => $found_project_dir
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'chart_settings_error'
    ]);
}
?>