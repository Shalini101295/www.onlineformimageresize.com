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
    $project_id = $input['project_id'] ?? '';
    $project_name = $input['project_name'] ?? '';
    
    if (empty($user_id) || empty($project_id) || empty($project_name)) {
        throw new Exception('Missing required parameters');
    }
    
    // Sanitize user_id for directory name
    $safe_user_id = preg_replace('/[^a-zA-Z0-9_-]/', '_', $user_id);
    
    // Create user projects directory path
    $user_dir = "user_projects/{$safe_user_id}";
    
    // Find the project directory (it might have a suffix)
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
    
    if (empty($project_dirs)) {
        // Project directory not found, return empty result (not an error)
        echo json_encode([
            'success' => false,
            'message' => 'No saved chart settings found - project directory not found',
            'settings' => null
        ]);
        exit;
    }
    
    // Use the first matching project directory
    $project_dir = $project_dirs[0];
    
    // Check for chart settings file
    $settings_file = "$project_dir/chart_settings.json";
    
    if (!file_exists($settings_file)) {
        // No saved settings found, return empty result (not an error)
        echo json_encode([
            'success' => false,
            'message' => 'No saved chart settings found for this project',
            'settings' => null
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
        throw new Exception("Failed to decode chart settings JSON");
    }
    
    // Return the settings
    echo json_encode([
        'success' => true,
        'message' => 'Chart settings loaded successfully',
        'settings' => $settings,
        'file_path' => $settings_file,
        'loaded_at' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'chart_settings_load_error',
        'settings' => null
    ]);
}
?>