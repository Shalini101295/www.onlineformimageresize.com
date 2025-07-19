<?php
// Secure File Download Handler for Project Files
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration
$base_projects_dir = 'user_projects';
$log_file = 'file_download_log.txt';

// Log function
function logDownloadActivity($action, $user_id = '', $project_id = '', $filename = '', $message = '') {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $log_entry = "$timestamp | $ip | $user_id | $project_id | $action | $filename | $message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

try {
    // Get parameters
    $user_id = $_GET['user_id'] ?? '';
    $project_id = $_GET['project_id'] ?? '';
    $filename = $_GET['filename'] ?? '';
    
    if (empty($user_id) || empty($project_id) || empty($filename)) {
        throw new Exception('Missing required parameters');
    }
    
    // Find project directory
    $project_dir = findProjectDirectory($user_id, $project_id);
    if (!$project_dir) {
        throw new Exception('Project not found or access denied');
    }
    
    // Validate and sanitize filename
    $safe_filename = basename($filename);
    $file_path = $project_dir . '/' . $safe_filename;
    
    if (!file_exists($file_path)) {
        throw new Exception('File not found');
    }
    
    // Validate file type
    $allowed_extensions = ['xlsx', 'xls'];
    $file_extension = strtolower(pathinfo($safe_filename, PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, $allowed_extensions)) {
        throw new Exception('File type not allowed');
    }
    
    // Set appropriate headers for file download
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $safe_filename . '"');
    header('Content-Length: ' . filesize($file_path));
    header('Cache-Control: private');
    header('Pragma: private');
    header('Expires: 0');
    
    // Read and output file
    readfile($file_path);
    
    logDownloadActivity('DOWNLOAD_SUCCESS', $user_id, $project_id, $safe_filename, 'File downloaded successfully');
    
} catch (Exception $e) {
    logDownloadActivity('DOWNLOAD_ERROR', $user_id ?? '', $project_id ?? '', $filename ?? '', $e->getMessage());
    
    header('HTTP/1.1 404 Not Found');
    echo 'File not found or access denied';
}

function findProjectDirectory($user_id, $project_id) {
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
?>