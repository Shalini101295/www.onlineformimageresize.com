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
    $user_id = $input['user_id'] ?? '';
    
    $debug_info = [
        'user_id' => $user_id,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Check if user_projects directory exists
    $base_dir = 'user_projects';
    $debug_info['base_dir_exists'] = is_dir($base_dir);
    
    if (is_dir($base_dir)) {
        $all_user_dirs = [];
        $dirs = scandir($base_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            if (is_dir("$base_dir/$dir")) {
                $user_dir_info = [
                    'name' => $dir,
                    'path' => "$base_dir/$dir",
                    'project_count' => 0,
                    'projects' => []
                ];
                
                // Check projects in this user directory
                if (is_dir("$base_dir/$dir")) {
                    $project_dirs = scandir("$base_dir/$dir");
                    foreach ($project_dirs as $project_dir) {
                        if ($project_dir === '.' || $project_dir === '..') continue;
                        if (is_dir("$base_dir/$dir/$project_dir")) {
                            $user_dir_info['projects'][] = [
                                'name' => $project_dir,
                                'path' => "$base_dir/$dir/$project_dir",
                                'has_chart_settings' => file_exists("$base_dir/$dir/$project_dir/chart_settings.json")
                            ];
                            $user_dir_info['project_count']++;
                        }
                    }
                }
                
                $all_user_dirs[] = $user_dir_info;
            }
        }
        $debug_info['all_user_dirs'] = $all_user_dirs;
        
        // Try to find matching user directory
        $matching_dirs = [];
        $safe_user_id = preg_replace('/[^a-zA-Z0-9_-]/', '_', $user_id);
        
        foreach ($all_user_dirs as $user_dir_info) {
            $dir_name = $user_dir_info['name'];
            if (strpos($dir_name, $user_id) !== false || 
                strpos($dir_name, $safe_user_id) !== false ||
                strpos($user_id, $dir_name) !== false) {
                $matching_dirs[] = $user_dir_info;
            }
        }
        
        $debug_info['matching_user_dirs'] = $matching_dirs;
    }
    
    echo json_encode([
        'success' => true,
        'debug_info' => $debug_info
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => $debug_info ?? []
    ]);
}
?>