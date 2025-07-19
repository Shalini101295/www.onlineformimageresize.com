<?php
// Secure Excel File Server - Bypass 403 restrictions
session_start();

// Set CORS headers to allow file access from your domain
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get parameters
$user_id = $_GET['user_id'] ?? '';
$project_id = $_GET['project_id'] ?? '';
$filename = $_GET['filename'] ?? '';

// Validate parameters
if (empty($user_id) || empty($project_id) || empty($filename)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

// Sanitize inputs
$user_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $user_id);
$project_id = preg_replace('/[^a-zA-Z0-9_-]/', '', $project_id);
$filename = basename($filename); // Prevent directory traversal

// Validate file extension
$allowed_extensions = ['xlsx', 'xls'];
$file_extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
if (!in_array($file_extension, $allowed_extensions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// Build file path
$file_path = "user_projects/{$user_id}/{$project_id}/{$filename}";

// Check if file exists and is readable
if (!file_exists($file_path) || !is_readable($file_path)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found or not accessible']);
    exit;
}

// Get file info
$file_size = filesize($file_path);
$mime_type = ($file_extension === 'xlsx') ? 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
    'application/vnd.ms-excel';

// Set headers for file download
header('Content-Type: ' . $mime_type);
header('Content-Length: ' . $file_size);
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');

// Output file content
readfile($file_path);
exit;
?>