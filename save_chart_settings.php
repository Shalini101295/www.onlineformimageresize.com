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
    $settings = $input['settings'] ?? null;
    
    if (empty($user_id) || empty($project_id) || empty($project_name) || !$settings) {
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
        throw new Exception("Project directory not found for project: $project_name");
    }
    
    // Use the first matching project directory
    $project_dir = $project_dirs[0];
    
    // Ensure project directory exists
    if (!is_dir($project_dir)) {
        if (!mkdir($project_dir, 0755, true)) {
            throw new Exception("Failed to create project directory: $project_dir");
        }
    }
    
    // Create chart settings file path
    $settings_file = "$project_dir/chart_settings.json";
    
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
        'backup_file' => $backup_file
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'chart_settings_save_error'
    ]);
}
?>