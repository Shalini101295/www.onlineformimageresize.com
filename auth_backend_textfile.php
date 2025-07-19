<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
$users_file = 'data/users.txt';
$projects_file = 'data/projects.txt';
$data_dir = 'data';

// Create data directory if it doesn't exist
if (!file_exists($data_dir)) {
    mkdir($data_dir, 0755, true);
}

// Create files if they don't exist
if (!file_exists($users_file)) {
    file_put_contents($users_file, '');
}
if (!file_exists($projects_file)) {
    file_put_contents($projects_file, '');
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

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
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Only POST requests allowed']);
}

function loadUsers() {
    global $users_file;
    $content = file_get_contents($users_file);
    $users = [];
    
    if (!empty($content)) {
        $lines = explode("\n", trim($content));
        foreach ($lines as $line) {
            if (!empty($line)) {
                $userData = json_decode($line, true);
                if ($userData) {
                    $users[] = $userData;
                }
            }
        }
    }
    
    return $users;
}

function saveUser($user) {
    global $users_file;
    $userJson = json_encode($user);
    file_put_contents($users_file, $userJson . "\n", FILE_APPEND | LOCK_EX);
}

function loadProjects() {
    global $projects_file;
    $content = file_get_contents($projects_file);
    $projects = [];
    
    if (!empty($content)) {
        $lines = explode("\n", trim($content));
        foreach ($lines as $line) {
            if (!empty($line)) {
                $projectData = json_decode($line, true);
                if ($projectData) {
                    $projects[] = $projectData;
                }
            }
        }
    }
    
    return $projects;
}

function saveProjectToFile($project) {
    global $projects_file;
    $projectJson = json_encode($project);
    file_put_contents($projects_file, $projectJson . "\n", FILE_APPEND | LOCK_EX);
}

function updateProjectInFile($updatedProject) {
    global $projects_file;
    $projects = loadProjects();
    $updated = false;
    
    for ($i = 0; $i < count($projects); $i++) {
        if ($projects[$i]['id'] === $updatedProject['id']) {
            $projects[$i] = $updatedProject;
            $updated = true;
            break;
        }
    }
    
    if ($updated) {
        $content = '';
        foreach ($projects as $project) {
            $content .= json_encode($project) . "\n";
        }
        file_put_contents($projects_file, $content, LOCK_EX);
    }
    
    return $updated;
}

function handleRegister($data) {
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
    $users = loadUsers();
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            echo json_encode(['success' => false, 'message' => 'User with this email already exists']);
            return;
        }
    }

    // Create new user
    $newUser = [
        'id' => uniqid('user_', true),
        'name' => $name,
        'email' => $email,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'created_at' => date('Y-m-d H:i:s'),
        'last_login' => null
    ];

    // Save user to file
    saveUser($newUser);

    // Return user data (without password)
    unset($newUser['password']);
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully',
        'user' => $newUser
    ]);
}

function handleLogin($data) {
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }

    // Find user
    $users = loadUsers();
    $foundUser = null;
    
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            $foundUser = $user;
            break;
        }
    }

    if (!$foundUser) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }

    // Verify password
    if (password_verify($password, $foundUser['password'])) {
        // Update last login (this is complex with text files, so we'll skip for simplicity)
        
        // Return user data (without password)
        unset($foundUser['password']);
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => $foundUser
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    }
}

function saveProject($data) {
    $userId = $data['user_id'] ?? '';
    $projectName = trim($data['project_name'] ?? '');
    $projectDescription = trim($data['project_description'] ?? '');
    $projectData = $data['project_data'] ?? [];

    if (empty($userId) || empty($projectName)) {
        echo json_encode(['success' => false, 'message' => 'User ID and project name are required']);
        return;
    }

    // Check if project exists
    $projects = loadProjects();
    $existingProject = null;
    
    foreach ($projects as $project) {
        if ($project['user_id'] === $userId && $project['name'] === $projectName) {
            $existingProject = $project;
            break;
        }
    }

    if ($existingProject) {
        // Update existing project
        $existingProject['description'] = $projectDescription;
        $existingProject['project_data'] = $projectData;
        $existingProject['updated_at'] = date('Y-m-d H:i:s');
        
        if (updateProjectInFile($existingProject)) {
            echo json_encode(['success' => true, 'message' => 'Project updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update project']);
        }
    } else {
        // Create new project
        $newProject = [
            'id' => uniqid('project_', true),
            'user_id' => $userId,
            'name' => $projectName,
            'description' => $projectDescription,
            'project_data' => $projectData,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];

        saveProjectToFile($newProject);
        echo json_encode(['success' => true, 'message' => 'Project created successfully']);
    }
}

function loadProjects($data) {
    $userId = $data['user_id'] ?? '';

    if (empty($userId)) {
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $allProjects = loadProjects();
    $userProjects = [];

    foreach ($allProjects as $project) {
        if ($project['user_id'] === $userId) {
            // Remove project_data from list view for performance
            unset($project['project_data']);
            $userProjects[] = $project;
        }
    }

    // Sort by updated_at descending
    usort($userProjects, function($a, $b) {
        return strcmp($b['updated_at'], $a['updated_at']);
    });

    echo json_encode(['success' => true, 'projects' => $userProjects]);
}

?>