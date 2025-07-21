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
    
    $debug_info = [
        'input_received' => $input,
        'extracted_data' => [
            'user_id' => $user_id,
            'project_name' => $project_name,
            'action' => $action,
            'has_settings' => !empty($settings)
        ],
        'validation' => [],
        'directory_scan' => [],
        'project_search' => [],
        'file_operations' => []
    ];
    
    if (empty($user_id) || empty($project_name)) {
        throw new Exception('Missing user_id or project_name');
    }
    
    $debug_info['validation']['user_id_valid'] = !empty($user_id);
    $debug_info['validation']['project_name_valid'] = !empty($project_name);
    
    // Use the same logic as quick_file_loader.php for consistency
    $base_dir = 'user_projects';
    $found_project_dir = null;
    
    // Find ALL user directories and scan them all
    $user_dirs = [];
    
    if (is_dir($base_dir)) {
        $dirs = scandir($base_dir);
        foreach ($dirs as $dir) {
            if ($dir === '.' || $dir === '..') continue;
            $user_dirs[] = $dir;
        }
    }
    
    $debug_info['directory_scan']['base_dir_exists'] = is_dir($base_dir);
    $debug_info['directory_scan']['total_user_dirs'] = count($user_dirs);
    $debug_info['directory_scan']['user_dirs_found'] = $user_dirs;
    
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
    
    $debug_info['directory_scan']['user_patterns'] = $user_patterns;
    
    // Scan each user directory for projects
    $matching_user_dirs = [];
    $all_projects_found = [];
    
    foreach ($user_dirs as $user_dir) {
        $user_path = $base_dir . '/' . $user_dir;
        
        // Check if this user directory matches any of our patterns
        $is_match = false;
        $matched_patterns = [];
        foreach ($user_patterns as $pattern) {
            if (strpos(strtolower($user_dir), strtolower($pattern)) !== false) {
                $is_match = true;
                $matched_patterns[] = $pattern;
            }
        }
        
        if ($is_match) {
            $matching_user_dirs[] = [
                'dir' => $user_dir,
                'path' => $user_path,
                'matched_patterns' => $matched_patterns
            ];
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
                    $project_info = [
                        'dir_name' => $project_dir,
                        'full_path' => $project_path,
                        'user_dir' => $user_dir,
                        'has_metadata' => false,
                        'metadata' => null,
                        'match_result' => false,
                        'match_reasons' => []
                    ];
                    
                    // Check project metadata for more accurate filtering
                    $metadata_file = $project_path . '/project_metadata.json';
                    if (file_exists($metadata_file)) {
                        $metadata_content = file_get_contents($metadata_file);
                        $project_metadata = json_decode($metadata_content, true);
                        $project_info['has_metadata'] = true;
                        $project_info['metadata'] = $project_metadata;
                    }
                    
                    // Apply project filter using the same logic as quick_file_loader.php
                    $include_project = false;
                    
                    // Try project ID match first (most accurate)
                    if ($project_info['metadata'] && isset($project_info['metadata']['id'])) {
                        if ($project_info['metadata']['id'] === $project_name) {
                            $include_project = true;
                            $project_info['match_reasons'][] = 'metadata_id_exact_match';
                        }
                    }
                    
                    // If no ID match, try name matching
                    if (!$include_project) {
                        $project_dir_lower = strtolower($project_dir);
                        $project_name_lower = strtolower($project_name);
                        
                        // Check metadata name first
                        if ($project_info['metadata'] && isset($project_info['metadata']['name'])) {
                            $metadata_name_lower = strtolower($project_info['metadata']['name']);
                            if ($metadata_name_lower === $project_name_lower) {
                                $include_project = true;
                                $project_info['match_reasons'][] = 'metadata_name_exact_match';
                            }
                        }
                        
                        // If no metadata match, try directory name matching
                        if (!$include_project) {
                            if ($project_dir_lower === $project_name_lower) {
                                $include_project = true;
                                $project_info['match_reasons'][] = 'directory_name_exact_match';
                            } elseif (strlen($project_name) > 3 && strpos($project_dir_lower, $project_name_lower) !== false) {
                                $include_project = true;
                                $project_info['match_reasons'][] = 'directory_contains_project_name';
                            } elseif (strlen($project_dir) > 3 && strpos($project_name_lower, $project_dir_lower) !== false) {
                                $include_project = true;
                                $project_info['match_reasons'][] = 'project_name_contains_directory';
                            }
                        }
                    }
                    
                    $project_info['match_result'] = $include_project;
                    $all_projects_found[] = $project_info;
                    
                    if ($include_project && !$found_project_dir) {
                        $found_project_dir = $project_path;
                    }
                }
            }
        }
    }
    
    $debug_info['project_search'] = [
        'matching_user_dirs' => $matching_user_dirs,
        'all_projects_scanned' => $all_projects_found,
        'found_project_dir' => $found_project_dir
    ];
    
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
        
        $debug_info['file_operations']['settings_file'] = $settings_file;
        $debug_info['file_operations']['directory_writable'] = is_writable($found_project_dir);
        $debug_info['file_operations']['directory_exists'] = is_dir($found_project_dir);
        
        $json_data = json_encode($settings, JSON_PRETTY_PRINT);
        if ($json_data === false) {
            throw new Exception('Failed to encode settings to JSON');
        }
        
        $debug_info['file_operations']['json_encoded'] = true;
        $debug_info['file_operations']['json_length'] = strlen($json_data);
        
        $write_result = file_put_contents($settings_file, $json_data);
        if ($write_result === false) {
            throw new Exception("Failed to save settings to: $settings_file");
        }
        
        $debug_info['file_operations']['write_result'] = $write_result;
        $debug_info['file_operations']['file_exists_after_write'] = file_exists($settings_file);
        $debug_info['file_operations']['file_size_after_write'] = file_exists($settings_file) ? filesize($settings_file) : 0;
        
        // Create backup
        $backup_file = "$found_project_dir/chart_settings_" . date('Y-m-d_H-i-s') . ".json";
        file_put_contents($backup_file, $json_data);
        
        $debug_info['file_operations']['backup_file'] = $backup_file;
        $debug_info['file_operations']['backup_created'] = file_exists($backup_file);
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings saved successfully',
            'file_path' => $settings_file,
            'project_dir' => $found_project_dir,
            'debug_info' => $debug_info
        ]);
        
    } else { // load
        $debug_info['file_operations']['action'] = 'load';
        
        if (!$found_project_dir) {
            $debug_info['file_operations']['error'] = 'No project directory found';
            echo json_encode([
                'success' => false,
                'message' => 'No project directory found',
                'user_id' => $user_id,
                'project_name' => $project_name,
                'debug_info' => $debug_info
            ]);
            exit;
        }
        
        $settings_file = "$found_project_dir/chart_settings.json";
        
        $debug_info['file_operations']['settings_file'] = $settings_file;
        $debug_info['file_operations']['file_exists'] = file_exists($settings_file);
        $debug_info['file_operations']['directory_readable'] = is_readable($found_project_dir);
        
        if (file_exists($settings_file)) {
            $debug_info['file_operations']['file_size'] = filesize($settings_file);
            $debug_info['file_operations']['file_readable'] = is_readable($settings_file);
        }
        
        if (!file_exists($settings_file)) {
            $debug_info['file_operations']['error'] = 'Settings file does not exist';
            echo json_encode([
                'success' => false,
                'message' => 'No saved chart settings found',
                'project_dir' => $found_project_dir,
                'debug_info' => $debug_info
            ]);
            exit;
        }
        
        $json_data = file_get_contents($settings_file);
        if ($json_data === false) {
            throw new Exception("Failed to read chart settings file: $settings_file");
        }
        
        $debug_info['file_operations']['json_read'] = true;
        $debug_info['file_operations']['json_length'] = strlen($json_data);
        
        $settings = json_decode($json_data, true);
        if ($settings === null) {
            throw new Exception('Invalid JSON in settings file: ' . json_last_error_msg());
        }
        
        $debug_info['file_operations']['json_decoded'] = true;
        
        echo json_encode([
            'success' => true,
            'message' => 'Chart settings loaded successfully',
            'settings' => $settings,
            'project_dir' => $found_project_dir,
            'debug_info' => $debug_info
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => 'chart_settings_error',
        'debug_info' => $debug_info ?? ['error' => 'Failed to generate debug info']
    ]);
}
?>