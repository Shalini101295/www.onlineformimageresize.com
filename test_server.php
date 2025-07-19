<?php
// Test file to check server configuration and PHP errors
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "PHP Test Results:\n";
echo "================\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Time: " . date('Y-m-d H:i:s') . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";

// Test if we can create content-type headers
header('Content-Type: text/plain');

// Test basic functionality
echo "\nBasic Tests:\n";
echo "- PHP is working: YES\n";

// Test JSON functions
if (function_exists('json_encode')) {
    echo "- JSON support: YES\n";
} else {
    echo "- JSON support: NO (PROBLEM!)\n";
}

// Test MySQLi
if (extension_loaded('mysqli')) {
    echo "- MySQLi extension: YES\n";
} else {
    echo "- MySQLi extension: NO (Use text file option)\n";
}

// Test file operations
if (is_writable('.')) {
    echo "- Directory writable: YES\n";
} else {
    echo "- Directory writable: NO (Permission issue)\n";
}

// Test if we can receive POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "\nPOST Request Received:\n";
    $input = file_get_contents('php://input');
    echo "Raw input: " . $input . "\n";
    
    if (!empty($input)) {
        $decoded = json_decode($input, true);
        if ($decoded) {
            echo "JSON decoded successfully\n";
            print_r($decoded);
        } else {
            echo "JSON decode failed: " . json_last_error_msg() . "\n";
        }
    }
} else {
    echo "\nTo test POST: Send a POST request to this file\n";
}

echo "\nIf you see this message, PHP is working!\n";
echo "Check the results above for any issues.\n";
?>