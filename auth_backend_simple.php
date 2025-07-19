<?php
// Simplified authentication backend with debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Add headers at the very beginning
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log for debugging (you can remove this later)
$log_file = 'debug.log';
$debug_info = date('Y-m-d H:i:s') . " - " . $_SERVER['REQUEST_METHOD'] . " request received\n";
file_put_contents($log_file, $debug_info, FILE_APPEND);

try {
    // Configuration for text file storage
    $users_file = 'users_data.txt';
    $projects_file = 'projects_data.txt';

    // Create files if they don't exist
    if (!file_exists($users_file)) {
        file_put_contents($users_file, '');
        chmod($users_file, 0644);
    }
    if (!file_exists($projects_file)) {
        file_put_contents($projects_file, '');
        chmod($projects_file, 0644);
    }

    // Get input data
    $input_raw = file_get_contents('php://input');
    $input = json_decode($input_raw, true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $action = isset($input['action']) ? $input['action'] : '';

    switch ($action) {
        case 'register':
            handleRegister($input, $users_file);
            break;
        case 'login':
            handleLogin($input, $users_file);
            break;
        case 'save_project':
            saveProject($input, $projects_file);
            break;
        case 'load_projects':
            loadProjects($input, $projects_file);
            break;
        default:
            throw new Exception('Invalid action: ' . $action);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'php_version' => phpversion(),
            'request_method' => $_SERVER['REQUEST_METHOD'],
            'input_received' => $input_raw
        ]
    ]);
}

function handleRegister($data, $users_file) {
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Basic validation
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    // Check if user exists
    $users = loadUsersFromFile($users_file);
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            return;
        }
    }

    // Create new user
    $newUser = [
        'id' => 'user_' . time() . rand(1000, 9999),
        'name' => $name,
        'email' => $email,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'created_at' => date('Y-m-d H:i:s')
    ];

    // Save to file
    $userLine = json_encode($newUser) . "\n";
    if (file_put_contents($users_file, $userLine, FILE_APPEND | LOCK_EX) === false) {
        echo json_encode(['success' => false, 'message' => 'Failed to save user']);
        return;
    }

    // Return success (without password)
    unset($newUser['password']);
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully',
        'user' => $newUser
    ]);
}

function handleLogin($data, $users_file) {
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password required']);
        return;
    }

    // Find user
    $users = loadUsersFromFile($users_file);
    $foundUser = null;

    foreach ($users as $user) {
        if ($user['email'] === $email) {
            $foundUser = $user;
            break;
        }
    }

    if (!$foundUser) {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        return;
    }

    // Verify password
    if (password_verify($password, $foundUser['password'])) {
        unset($foundUser['password']);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => $foundUser
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }
}

function saveProject($data, $projects_file) {
    echo json_encode(['success' => true, 'message' => 'Project save feature coming soon']);
}

function loadProjects($data, $projects_file) {
    echo json_encode(['success' => true, 'projects' => []]);
}

function loadUsersFromFile($users_file) {
    $users = [];
    if (file_exists($users_file)) {
        $content = file_get_contents($users_file);
        if ($content) {
            $lines = explode("\n", trim($content));
            foreach ($lines as $line) {
                if (!empty($line)) {
                    $user = json_decode($line, true);
                    if ($user) {
                        $users[] = $user;
                    }
                }
            }
        }
    }
    return $users;
}
?>