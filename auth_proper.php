<?php
// Proper authentication with credential storage and validation
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

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Only POST requests allowed']);
    exit;
}

// Configuration
$users_file = 'secure_users.txt';
$projects_file = 'user_projects.txt';
$log_file = 'auth_log.txt';

// Create files with proper permissions if they don't exist
if (!file_exists($users_file)) {
    file_put_contents($users_file, '');
    chmod($users_file, 0600); // Only owner can read/write
}
if (!file_exists($projects_file)) {
    file_put_contents($projects_file, '');
    chmod($projects_file, 0600);
}

// Log access attempts
function logActivity($action, $email = '', $success = false, $message = '') {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $status = $success ? 'SUCCESS' : 'FAILED';
    $log_entry = "$timestamp | $ip | $action | $email | $status | $message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// Get and validate input
try {
    $input_raw = file_get_contents('php://input');
    $input = json_decode($input_raw, true);
    
    if (!$input || !isset($input['action'])) {
        throw new Exception('Invalid JSON input or missing action');
    }

    $action = $input['action'];

    switch ($action) {
        case 'register':
            handleRegister($input);
            break;
        case 'login':
            handleLogin($input);
            break;
        case 'save_project':
            saveProject($input);
            break;
        case 'load_projects':
            loadProjects($input);
            break;
        default:
            throw new Exception('Invalid action: ' . $action);
    }

} catch (Exception $e) {
    logActivity('ERROR', '', false, $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function handleRegister($data) {
    global $users_file;
    
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validation
    if (empty($name) || empty($email) || empty($password)) {
        logActivity('REGISTER', $email, false, 'Missing required fields');
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        logActivity('REGISTER', $email, false, 'Invalid email format');
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    if (strlen($password) < 6) {
        logActivity('REGISTER', $email, false, 'Password too short');
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    // Check if user already exists
    $existingUsers = loadUsers();
    foreach ($existingUsers as $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            logActivity('REGISTER', $email, false, 'Email already exists');
            echo json_encode(['success' => false, 'message' => 'An account with this email already exists']);
            return;
        }
    }

    // Create new user with proper security
    $newUser = [
        'id' => 'user_' . time() . '_' . rand(1000, 9999),
        'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
        'email' => strtolower($email),
        'password' => password_hash($password, PASSWORD_DEFAULT), // Properly hashed password
        'created_at' => date('Y-m-d H:i:s'),
        'last_login' => null,
        'is_active' => true
    ];

    // Save user to file
    if (saveUser($newUser)) {
        logActivity('REGISTER', $email, true, 'Account created successfully');
        
        // Return user data without password
        $userResponse = $newUser;
        unset($userResponse['password']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Account created successfully',
            'user' => $userResponse
        ]);
    } else {
        logActivity('REGISTER', $email, false, 'Failed to save user data');
        echo json_encode(['success' => false, 'message' => 'Failed to create account. Please try again.']);
    }
}

function handleLogin($data) {
    global $users_file;
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validation
    if (empty($email) || empty($password)) {
        logActivity('LOGIN', $email, false, 'Missing credentials');
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }

    // Find user by email
    $users = loadUsers();
    $foundUser = null;

    foreach ($users as $index => $user) {
        if (strtolower($user['email']) === strtolower($email)) {
            $foundUser = $user;
            $foundUserIndex = $index;
            break;
        }
    }

    if (!$foundUser) {
        logActivity('LOGIN', $email, false, 'User not found');
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }

    // Check if account is active
    if (!$foundUser['is_active']) {
        logActivity('LOGIN', $email, false, 'Account disabled');
        echo json_encode(['success' => false, 'message' => 'Account is disabled. Please contact support.']);
        return;
    }

    // Verify password
    if (password_verify($password, $foundUser['password'])) {
        // Update last login time
        $foundUser['last_login'] = date('Y-m-d H:i:s');
        updateUser($foundUserIndex, $foundUser);
        
        logActivity('LOGIN', $email, true, 'Login successful');
        
        // Return user data without password
        $userResponse = $foundUser;
        unset($userResponse['password']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => $userResponse
        ]);
    } else {
        logActivity('LOGIN', $email, false, 'Invalid password');
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    }
}

function saveProject($data) {
    // Basic project save functionality - can be expanded
    logActivity('SAVE_PROJECT', $data['user_email'] ?? '', true, 'Project save attempted');
    echo json_encode(['success' => true, 'message' => 'Project save feature - coming soon']);
}

function loadProjects($data) {
    // Basic project load functionality - can be expanded  
    echo json_encode(['success' => true, 'projects' => []]);
}

// Helper functions for user management
function loadUsers() {
    global $users_file;
    $users = [];
    
    if (file_exists($users_file) && filesize($users_file) > 0) {
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

function saveUser($user) {
    global $users_file;
    try {
        $userJson = json_encode($user);
        if (file_put_contents($users_file, $userJson . "\n", FILE_APPEND | LOCK_EX) !== false) {
            return true;
        }
    } catch (Exception $e) {
        logActivity('ERROR', $user['email'] ?? '', false, 'Failed to save user: ' . $e->getMessage());
    }
    return false;
}

function updateUser($index, $updatedUser) {
    global $users_file;
    try {
        $users = loadUsers();
        if (isset($users[$index])) {
            $users[$index] = $updatedUser;
            
            // Rewrite entire file
            $content = '';
            foreach ($users as $user) {
                $content .= json_encode($user) . "\n";
            }
            
            return file_put_contents($users_file, $content, LOCK_EX) !== false;
        }
    } catch (Exception $e) {
        logActivity('ERROR', $updatedUser['email'] ?? '', false, 'Failed to update user: ' . $e->getMessage());
    }
    return false;
}

// Additional security: Rate limiting (basic implementation)
function checkRateLimit($email) {
    // This is a basic rate limiting - in production, use Redis or database
    $attempts_file = 'login_attempts.txt';
    $max_attempts = 5;
    $time_window = 300; // 5 minutes
    
    if (!file_exists($attempts_file)) {
        return true;
    }
    
    $current_time = time();
    $content = file_get_contents($attempts_file);
    $lines = explode("\n", trim($content));
    
    $recent_attempts = 0;
    $new_content = '';
    
    foreach ($lines as $line) {
        if (!empty($line)) {
            list($timestamp, $attempt_email) = explode('|', $line);
            if ($current_time - $timestamp < $time_window) {
                $new_content .= $line . "\n";
                if ($attempt_email === $email) {
                    $recent_attempts++;
                }
            }
        }
    }
    
    // Save cleaned up attempts
    file_put_contents($attempts_file, $new_content, LOCK_EX);
    
    return $recent_attempts < $max_attempts;
}
?>