<?php
// Project File Management System
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$base_projects_dir = 'user_projects';
$log_file = 'file_upload_log.txt';
$max_file_size = 10 * 1024 * 1024; // 10MB
$allowed_extensions = ['xlsx', 'xls'];

// Log function
function logFileActivity($action, $user_id = '', $project_id = '', $filename = '', $message = '') {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_entry = "$timestamp | $ip | $user_id | $project_id | $action | $filename | $message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// Handle file upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['excel_file'])) {
    handleFileUpload();
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handleProjectFileOperations();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}

function handleFileUpload() {
    global $base_projects_dir, $max_file_size, $allowed_extensions;
    
    try {
        // Validate required POST data
        $user_id = $_POST['user_id'] ?? '';
        $project_id = $_POST['project_id'] ?? '';
        
        if (empty($user_id) || empty($project_id)) {
            throw new Exception('User ID and Project ID are required');
        }
        
        // Validate file upload
        if (!isset($_FILES['excel_file']) || $_FILES['excel_file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload failed or no file selected');
        }
        
        $file = $_FILES['excel_file'];
        
        // Validate file size
        if ($file['size'] > $max_file_size) {
            throw new Exception('File size exceeds 10MB limit');
        }
        
        // Validate file extension
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($file_extension, $allowed_extensions)) {
            throw new Exception('Only Excel files (.xlsx, .xls) are allowed');
        }
        
        // Find project directory
        $project_dir = findProjectDirectory($user_id, $project_id);
        if (!$project_dir) {
            throw new Exception('Project not found or access denied');
        }
        
        // Create safe filename
        $safe_filename = sanitizeFilename($file['name']);
        $target_path = $project_dir . '/' . $safe_filename;
        
        // Check if file exists - we now allow replacement for same filename
        $replacing_existing = file_exists($target_path);
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $target_path)) {
            // Update project metadata
            updateProjectMetadata($project_dir, $safe_filename);
            
            $action_message = $replacing_existing ? 'File replaced successfully' : 'File uploaded successfully';
            logFileActivity('UPLOAD_SUCCESS', $user_id, $project_id, $safe_filename, $action_message);
            
            echo json_encode([
                'success' => true,
                'message' => $action_message,
                'filename' => $safe_filename,
                'file_path' => $target_path,
                'replaced' => $replacing_existing
            ]);
        } else {
            throw new Exception('Failed to save uploaded file');
        }
        
    } catch (Exception $e) {
        logFileActivity('UPLOAD_ERROR', $user_id ?? '', $project_id ?? '', $file['name'] ?? '', $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function handleProjectFileOperations() {
    try {
        $input_raw = file_get_contents('php://input');
        $input = json_decode($input_raw, true);
        
        if (!$input || !isset($input['action'])) {
            throw new Exception('Invalid JSON input or missing action');
        }
        
        $action = $input['action'];
        
        switch ($action) {
            case 'get_project_files':
                getProjectFiles($input);
                break;
            case 'delete_project_file':
                deleteProjectFile($input);
                break;
            case 'load_excel_data':
                loadExcelData($input);
                break;
            default:
                throw new Exception('Invalid action: ' . $action);
        }
        
    } catch (Exception $e) {
        logFileActivity('OPERATION_ERROR', '', '', '', $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

function getProjectFiles($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    
    if (empty($user_id) || empty($project_id)) {
        throw new Exception('User ID and Project ID are required');
    }
    
    $project_dir = findProjectDirectory($user_id, $project_id);
    if (!$project_dir) {
        throw new Exception('Project not found');
    }
    
    $files = [];
    $excel_extensions = ['xlsx', 'xls'];
    
    if (is_dir($project_dir)) {
        $dir_files = scandir($project_dir);
        foreach ($dir_files as $file) {
            if ($file === '.' || $file === '..' || $file === 'project_metadata.json') {
                continue;
            }
            
            $file_path = $project_dir . '/' . $file;
            if (is_file($file_path)) {
                $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array($extension, $excel_extensions)) {
                    $files[] = [
                        'name' => $file,
                        'size' => filesize($file_path),
                        'modified' => date('Y-m-d H:i:s', filemtime($file_path)),
                        'extension' => $extension
                    ];
                }
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'files' => $files
    ]);
}

function deleteProjectFile($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    $filename = $data['filename'] ?? '';
    
    if (empty($user_id) || empty($project_id) || empty($filename)) {
        throw new Exception('User ID, Project ID, and filename are required');
    }
    
    $project_dir = findProjectDirectory($user_id, $project_id);
    if (!$project_dir) {
        throw new Exception('Project not found');
    }
    
    $file_path = $project_dir . '/' . $filename;
    
    if (!file_exists($file_path)) {
        throw new Exception('File not found');
    }
    
    if (unlink($file_path)) {
        logFileActivity('DELETE_SUCCESS', $user_id, $project_id, $filename, 'File deleted successfully');
        
        echo json_encode([
            'success' => true,
            'message' => 'File deleted successfully'
        ]);
    } else {
        throw new Exception('Failed to delete file');
    }
}

function loadExcelData($data) {
    $user_id = $data['user_id'] ?? '';
    $project_id = $data['project_id'] ?? '';
    $filename = $data['filename'] ?? '';
    
    if (empty($user_id) || empty($project_id) || empty($filename)) {
        throw new Exception('User ID, Project ID, and filename are required');
    }
    
    $project_dir = findProjectDirectory($user_id, $project_id);
    if (!$project_dir) {
        throw new Exception('Project not found');
    }
    
    $file_path = $project_dir . '/' . $filename;
    
    if (!file_exists($file_path)) {
        throw new Exception('File not found');
    }
    
    // Read file content and encode as base64
    $file_content = file_get_contents($file_path);
    if ($file_content === false) {
        throw new Exception('Failed to read file');
    }
    
    $base64_content = base64_encode($file_content);
    
    // Return file content directly
    echo json_encode([
        'success' => true,
        'message' => 'File loaded successfully',
        'filename' => $filename,
        'file_content' => $base64_content,
        'file_size' => filesize($file_path)
    ]);
}

// Helper functions
function findProjectDirectory($user_id, $project_id) {
    global $base_projects_dir;
    
    // Load projects index to find the project
    $projects_index_file = 'projects_index.txt';
    
    if (!file_exists($projects_index_file)) {
        return false;
    }
    
    $content = file_get_contents($projects_index_file);
    if (!$content) {
        return false;
    }
    
    $lines = explode("\n", trim($content));
    foreach ($lines as $line) {
        if (!empty($line)) {
            $project = json_decode($line, true);
            if ($project && $project['id'] === $project_id && $project['user_id'] === $user_id) {
                return $project['project_dir'];
            }
        }
    }
    
    return false;
}

function sanitizeFilename($filename) {
    // Remove any path traversal attempts
    $filename = basename($filename);
    
    // Replace unsafe characters
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    
    // Limit length
    if (strlen($filename) > 100) {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $name = substr(pathinfo($filename, PATHINFO_FILENAME), 0, 95);
        $filename = $name . '.' . $extension;
    }
    
    return $filename;
}

function updateProjectMetadata($project_dir, $filename) {
    $metadata_file = $project_dir . '/project_metadata.json';
    
    if (file_exists($metadata_file)) {
        $metadata = json_decode(file_get_contents($metadata_file), true);
        
        if (!isset($metadata['files'])) {
            $metadata['files'] = [];
        }
        
        // Add file info
        $metadata['files'][] = [
            'name' => $filename,
            'uploaded_at' => date('Y-m-d H:i:s'),
            'size' => filesize($project_dir . '/' . $filename)
        ];
        
        $metadata['updated_at'] = date('Y-m-d H:i:s');
        
        file_put_contents($metadata_file, json_encode($metadata, JSON_PRETTY_PRINT));
    }
}
?>