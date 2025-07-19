<?php
// Project Management System with File Organization
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$base_projects_dir = 'user_projects';
$projects_index_file = 'projects_index.txt';
$log_file = 'project_log.txt';

// Ensure base directory exists
if (!file_exists($base_projects_dir)) {
    mkdir($base_projects_dir, 0755, true);
}

// Log function
function logProjectActivity($action, $user_id = '', $project_id = '', $message = '') {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_entry = "$timestamp | $ip | $user_id | $action | $project_id | $message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// Get and validate input
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests allowed']);
    exit;
}

try {
    $input_raw = file_get_contents('php://input');
    $input = json_decode($input_raw, true);
    
    if (!$input || !isset($input['action'])) {
        throw new Exception('Invalid JSON input or missing action');
    }

    $action = $input['action'];

    switch ($action) {
        case 'create_project':
            createProject($input);
            break;
        case 'get_user_projects':
            getUserProjects($input);
            break;
        case 'get_project_details':
            getProjectDetails($input);
            break;
        case 'upload_excel_file':
            uploadExcelFile($input);
            break;
        case 'save_project_data':
            saveProjectData($input);
            break;
        case 'delete_project':
            deleteProject($input);
            break;
        default:
            throw new Exception('Invalid action: ' . $action);
    }

} catch (Exception $e) {
    logProjectActivity('ERROR', '', '', $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function createProject($data) {
    global $base_projects_dir, $projects_index_file;
    
    $user_id = $data['user_id'] ?? '';
    $user_name = $data['user_name'] ?? '';
    $project_name = trim($data['project_name'] ?? '');
    $project_description = trim($data['project_description'] ?? '');
    
    // Validation
    if (empty($user_id) || empty($project_name)) {
        throw new Exception('User ID and project name are required');
    }
    
    // Sanitize names for file system
    $safe_user_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $user_name);
    $safe_project_name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $project_name);
    
    // Create user directory if it doesn't exist
    $user_dir = $base_projects_dir . '/' . $safe_user_name . '_' . substr($user_id, -6);
    if (!file_exists($user_dir)) {
        mkdir($user_dir, 0755, true);
    }
    
    // Create project directory
    $project_id = 'proj_' . time() . '_' . rand(1000, 9999);
    $project_dir = $user_dir . '/' . $safe_project_name . '_' . $project_id;
    
    if (file_exists($project_dir)) {
        throw new Exception('Project with this name already exists');
    }
    
    mkdir($project_dir, 0755, true);
    
    // Create project metadata
    $project_metadata = [
        'id' => $project_id,
        'name' => $project_name,
        'description' => $project_description,
        'user_id' => $user_id,
        'user_name' => $user_name,
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'project_dir' => $project_dir,
        'files' => [],
        'chart_settings' => [],
        'status' => 'active'
    ];
    
    // Save project metadata
    $metadata_file = $project_dir . '/project_metadata.json';
    file_put_contents($metadata_file, json_encode($project_metadata, JSON_PRETTY_PRINT));
    
    // Add to projects index
    addToProjectsIndex($project_metadata);
    
    logProjectActivity('CREATE_PROJECT', $user_id, $project_id, "Project created: $project_name");
    
    echo json_encode([
        'success' => true,
        'message' => 'Project created successfully',
        'project' => $project_metadata
    ]);
}

function getUserProjects($data) {
    global $projects_index_file;
    
    $user_id = $data['user_id'] ?? '';
    
    if (empty($user_id)) {
        throw new Exception('User ID is required');
    }
    
    $all_projects = loadProjectsIndex();
    $user_projects = [];
    
    foreach ($all_projects as $project) {
        if ($project['user_id'] === $user_id && $project['status'] === 'active') {
            // Remove sensitive paths for security
            $project_safe = $project;
            unset($project_safe['project_dir']);
            $user_projects[] = $project_safe;
        }
    }
    
    // Sort by updated_at descending
    usort($user_projects, function($a, $b) {
        return strcmp($b['updated_at'], $a['updated_at']);
    });
    
    logProjectActivity('GET_PROJECTS', $user_id, '', 'Retrieved user projects');
    
    echo json_encode([
        'success' => true,
        'projects' => $user_projects
    ]);
}

function getProjectDetails($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    
    if (empty($user_id) || empty($project_id)) {
        throw new Exception('User ID and Project ID are required');
    }
    
    $project = findProjectById($project_id, $user_id);
    
    if (!$project) {
        throw new Exception('Project not found or access denied');
    }
    
    // Load full project data including files and settings
    $metadata_file = $project['project_dir'] . '/project_metadata.json';
    if (file_exists($metadata_file)) {
        $full_project = json_decode(file_get_contents($metadata_file), true);
        
        // Remove sensitive path information
        unset($full_project['project_dir']);
        
        echo json_encode([
            'success' => true,
            'project' => $full_project
        ]);
    } else {
        throw new Exception('Project metadata not found');
    }
}

function uploadExcelFile($data) {
    // This would handle file uploads - for now, return a placeholder
    // In a real implementation, you'd handle $_FILES here
    
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    
    if (empty($user_id) || empty($project_id)) {
        throw new Exception('User ID and Project ID are required');
    }
    
    $project = findProjectById($project_id, $user_id);
    if (!$project) {
        throw new Exception('Project not found');
    }
    
    logProjectActivity('UPLOAD_FILE', $user_id, $project_id, 'File upload attempted');
    
    echo json_encode([
        'success' => true,
        'message' => 'File upload endpoint ready - implement file handling'
    ]);
}

function saveProjectData($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    $project_data = $data['project_data'] ?? [];
    
    if (empty($user_id) || empty($project_id)) {
        throw new Exception('User ID and Project ID are required');
    }
    
    $project = findProjectById($project_id, $user_id);
    if (!$project) {
        throw new Exception('Project not found');
    }
    
    // Load current metadata
    $metadata_file = $project['project_dir'] . '/project_metadata.json';
    $metadata = json_decode(file_get_contents($metadata_file), true);
    
    // Update with new data
    $metadata['chart_settings'] = $project_data;
    $metadata['updated_at'] = date('Y-m-d H:i:s');
    
    // Save updated metadata
    file_put_contents($metadata_file, json_encode($metadata, JSON_PRETTY_PRINT));
    
    // Update projects index
    updateProjectsIndex($project_id, $metadata);
    
    logProjectActivity('SAVE_DATA', $user_id, $project_id, 'Project data saved');
    
    echo json_encode([
        'success' => true,
        'message' => 'Project data saved successfully'
    ]);
}

function deleteProject($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    
    if (empty($user_id) || empty($project_id)) {
        throw new Exception('User ID and Project ID are required');
    }
    
    $project = findProjectById($project_id, $user_id);
    if (!$project) {
        throw new Exception('Project not found');
    }
    
    // Mark as deleted instead of actually deleting
    $metadata_file = $project['project_dir'] . '/project_metadata.json';
    $metadata = json_decode(file_get_contents($metadata_file), true);
    $metadata['status'] = 'deleted';
    $metadata['deleted_at'] = date('Y-m-d H:i:s');
    
    file_put_contents($metadata_file, json_encode($metadata, JSON_PRETTY_PRINT));
    updateProjectsIndex($project_id, $metadata);
    
    logProjectActivity('DELETE_PROJECT', $user_id, $project_id, 'Project deleted');
    
    echo json_encode([
        'success' => true,
        'message' => 'Project deleted successfully'
    ]);
}

// Helper functions
function loadProjectsIndex() {
    global $projects_index_file;
    $projects = [];
    
    if (file_exists($projects_index_file)) {
        $content = file_get_contents($projects_index_file);
        if ($content) {
            $lines = explode("\n", trim($content));
            foreach ($lines as $line) {
                if (!empty($line)) {
                    $project = json_decode($line, true);
                    if ($project) {
                        $projects[] = $project;
                    }
                }
            }
        }
    }
    
    return $projects;
}

function addToProjectsIndex($project) {
    global $projects_index_file;
    $project_line = json_encode($project) . "\n";
    file_put_contents($projects_index_file, $project_line, FILE_APPEND | LOCK_EX);
}

function updateProjectsIndex($project_id, $updated_project) {
    global $projects_index_file;
    $projects = loadProjectsIndex();
    $updated = false;
    
    for ($i = 0; $i < count($projects); $i++) {
        if ($projects[$i]['id'] === $project_id) {
            $projects[$i] = $updated_project;
            $updated = true;
            break;
        }
    }
    
    if ($updated) {
        $content = '';
        foreach ($projects as $project) {
            $content .= json_encode($project) . "\n";
        }
        file_put_contents($projects_index_file, $content, LOCK_EX);
    }
}

function findProjectById($project_id, $user_id) {
    $projects = loadProjectsIndex();
    
    foreach ($projects as $project) {
        if ($project['id'] === $project_id && $project['user_id'] === $user_id) {
            return $project;
        }
    }
    
    return null;
}
?>