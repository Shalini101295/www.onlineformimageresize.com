<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Debug information
    $debug_info = [
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'Not set',
        'raw_input' => file_get_contents('php://input'),
        'post_data' => $_POST,
        'get_data' => $_GET
    ];
    
    // Get input data
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);
    
    $debug_info['parsed_input'] = $input;
    $debug_info['json_error'] = json_last_error_msg();
    
    if (!$input) {
        throw new Exception('Invalid JSON input: ' . json_last_error_msg());
    }
    
    $user_id = $input['user_id'] ?? '';
    $project_id = $input['project_id'] ?? '';
    $project_name = $input['project_name'] ?? '';
    $action = $input['action'] ?? 'load'; // default to load
    $settings = $input['settings'] ?? null;
    
    $debug_info['extracted_data'] = [
        'user_id' => $user_id,
        'project_id' => $project_id,
        'project_name' => $project_name,
        'action' => $action,
        'has_settings' => !empty($settings)
    ];
    
    if (empty($user_id) || empty($project_name)) {
        throw new Exception('Missing required parameters: user_id or project_name');
    }
    
    // Sanitize user_id for directory name
    $safe_user_id = preg_replace('/[^a-zA-Z0-9_-]/', '_', $user_id);
    
    // Create user projects directory path
    $user_dir = "user_projects/{$safe_user_id}";
    
    $debug_info['paths'] = [
        'user_dir' => $user_dir,
        'user_dir_exists' => is_dir($user_dir),
        'user_dir_readable' => is_readable($user_dir)
    ];
    
    // Find the project directory
    $project_dirs = [];
    if (is_dir($user_dir)) {
        $dirs = scandir($user_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            if (is_dir("$user_dir/$dir")) {
                // Check if this directory matches our project
                if (strpos($dir, $project_name) !== false || strpos($project_name, $dir) !== false) {
                    $project_dirs[] = "$user_dir/$dir";
                }
            }
        }
    }
    
    $debug_info['project_search'] = [
        'found_dirs' => $project_dirs,
        'search_pattern' => $project_name
    ];
    
    if (empty($project_dirs)) {
        if ($action === 'save') {
            throw new Exception("Project directory not found for project: $project_name");
        } else {
            // For load, just return no settings found
            echo json_encode([
                'success' => false,
                'message' => 'No project directory found',
                'debug_info' => $debug_info
            ]);
            exit;
        }
    }
    
    // Use the first matching project directory
    $project_dir = $project_dirs[0];
    $settings_file = "$project_dir/chart_settings.json";
    
    $debug_info['project_dir'] = [
        'path' => $project_dir,
        'exists' => is_dir($project_dir),
        'writable' => is_writable($project_dir),
        'settings_file' => $settings_file,
        'settings_exists' => file_exists($settings_file)
    ];
    
    if ($action === 'save') {
        // Save settings
        if (!$settings) {
            throw new Exception('No settings data provided for save operation');
        }
        
        // Ensure project directory exists
        if (!is_dir($project_dir)) {
            if (!mkdir($project_dir, 0755, true)) {
                throw new Exception("Failed to create project directory: $project_dir");
            }
        }
        
        // Add metadata to settings
        $settings['saved_at'] = date('Y-m-d H:i:s');
        $settings['version'] = '1.0';
        
        // Save settings to JSON file
        $json_data = json_encode($settings, JSON_PRETTY_PRINT);
        if ($json_data === false) {
            throw new Exception('Failed to encode settings to JSON');
        }
        
        if (file_put_contents($settings_file, $json_data) === false) {
            throw new Exception("Failed to save chart settings to: $settings_file");
        }
        
        // Also save a backup with timestamp
        $backup_file = "$project_dir/chart_settings_" . date('Y-m-d_H-i-s') . ".json";
        file_put_contents($backup_file, $json_data);
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings saved successfully',
            'file_path' => $settings_file,
            'backup_file' => $backup_file,
            'debug_info' => $debug_info
        ]);
        
    } else {
        // Load settings
        if (!file_exists($settings_file)) {
            echo json_encode([
                'success' => false,
                'message' => 'No saved chart settings found for this project',
                'settings' => null,
                'debug_info' => $debug_info
            ]);
            exit;
        }
        
        // Read and decode the settings file
        $json_data = file_get_contents($settings_file);
        if ($json_data === false) {
            throw new Exception("Failed to read chart settings file: $settings_file");
        }
        
        $settings = json_decode($json_data, true);
        if ($settings === null) {
            throw new Exception("Failed to decode chart settings JSON: " . json_last_error_msg());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings loaded successfully',
            'settings' => $settings,
            'file_path' => $settings_file,
            'loaded_at' => date('Y-m-d H:i:s'),
            'debug_info' => $debug_info
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'chart_settings_error',
        'debug_info' => $debug_info ?? ['error' => 'Failed to generate debug info'],
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
}
?>