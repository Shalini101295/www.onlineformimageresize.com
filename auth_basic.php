<?php
// Basic authentication - no file operations
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

$action = $input['action'] ?? '';

switch ($action) {
    case 'register':
        // For now, just simulate successful registration
        $user = [
            'id' => 'user_' . time(),
            'name' => $input['name'] ?? 'User',
            'email' => $input['email'] ?? ''
        ];
        echo json_encode([
            'success' => true,
            'message' => 'Account created successfully',
            'user' => $user
        ]);
        break;
        
    case 'login':
        // For now, just simulate successful login
        $user = [
            'id' => 'user_' . time(),
            'name' => 'Demo User',
            'email' => $input['email'] ?? ''
        ];
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user
        ]);
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>