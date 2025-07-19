<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$servername = "localhost";
$username = "your_db_username";    // Replace with your database username
$password = "your_db_password";    // Replace with your database password
$dbname = "your_database_name";    // Replace with your database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'register':
            handleRegister($conn, $input);
            break;
        case 'login':
            handleLogin($conn, $input);
            break;
        case 'save_project':
            saveProject($conn, $input);
            break;
        case 'load_projects':
            loadProjects($conn, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Only POST requests allowed']);
}

function handleRegister($conn, $data) {
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validation
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    // Check if user already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'User with this email already exists']);
        return;
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("sss", $name, $email, $hashedPassword);

    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        echo json_encode([
            'success' => true, 
            'message' => 'Account created successfully',
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
}

function handleLogin($conn, $data) {
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }

    // Get user from database
    $stmt = $conn->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }

    $user = $result->fetch_assoc();

    // Verify password
    if (password_verify($password, $user['password'])) {
        // Update last login
        $updateStmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $updateStmt->bind_param("i", $user['id']);
        $updateStmt->execute();

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    }
}

function saveProject($conn, $data) {
    $userId = $data['user_id'] ?? 0;
    $projectName = trim($data['project_name'] ?? '');
    $projectDescription = trim($data['project_description'] ?? '');
    $projectData = json_encode($data['project_data'] ?? []);

    if (empty($userId) || empty($projectName)) {
        echo json_encode(['success' => false, 'message' => 'User ID and project name are required']);
        return;
    }

    // Check if project exists
    $stmt = $conn->prepare("SELECT id FROM projects WHERE user_id = ? AND name = ?");
    $stmt->bind_param("is", $userId, $projectName);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Update existing project
        $projectId = $result->fetch_assoc()['id'];
        $stmt = $conn->prepare("UPDATE projects SET description = ?, project_data = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("ssi", $projectDescription, $projectData, $projectId);
    } else {
        // Create new project
        $stmt = $conn->prepare("INSERT INTO projects (user_id, name, description, project_data, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->bind_param("isss", $userId, $projectName, $projectDescription, $projectData);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Project saved successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save project']);
    }
}

function loadProjects($conn, $data) {
    $userId = $data['user_id'] ?? 0;

    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $stmt = $conn->prepare("SELECT id, name, description, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $projects = [];
    while ($row = $result->fetch_assoc()) {
        $projects[] = $row;
    }

    echo json_encode(['success' => true, 'projects' => $projects]);
}

$conn->close();
?>