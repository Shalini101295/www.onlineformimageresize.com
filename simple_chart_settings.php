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
    
    // Simple approach: scan all user directories for matching pattern
    $base_dir = 'user_projects';
    $found_project_dir = null;
    
    if (is_dir($base_dir)) {
        $user_dirs = scandir($base_dir);
        foreach ($user_dirs as $user_dir) {
            if ($user_dir === '.' || $user_dir === '..') continue;
            $user_path = "$base_dir/$user_dir";
            if (!is_dir($user_path)) continue;
            
            // Check if this user directory matches our user
            if (strpos($user_dir, $user_id) !== false || strpos($user_id, $user_dir) !== false) {
                // Look for project directories in this user folder
                $project_dirs = scandir($user_path);
                foreach ($project_dirs as $project_dir) {
                    if ($project_dir === '.' || $project_dir === '..') continue;
                    $project_path = "$user_path/$project_dir";
                    if (!is_dir($project_path)) continue;
                    
                    // Check if this project directory matches our project
                    $project_name_clean = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($project_name));
                    $project_dir_clean = preg_replace('/[^a-zA-Z0-9]/', '', strtolower($project_dir));
                    
                    if (strpos($project_dir_clean, $project_name_clean) !== false || 
                        strpos($project_name_clean, $project_dir_clean) !== false ||
                        stripos($project_dir, $project_name) !== false) {
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