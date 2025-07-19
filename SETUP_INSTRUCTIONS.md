# Excel Visualizer Authentication Setup Guide

## Overview
Your Excel Visualizer project already has a complete authentication interface. This guide will help you implement server-side authentication and data storage for your hosting at https://www.onlineformimageresize.com/excelvisualizer/

## Option 1: MySQL Database (Recommended)

### Prerequisites
- PHP 7.4+ with MySQL support
- MySQL/MariaDB database access
- cPanel or phpMyAdmin access

### Step 1: Database Setup
1. **Access your hosting control panel** (cPanel or similar)
2. **Create a MySQL database:**
   - Go to "MySQL Databases" in cPanel
   - Create database: `excel_visualizer_db`
   - Create user with full permissions to this database
   - Note down: database name, username, password

3. **Import the database schema:**
   - Open phpMyAdmin
   - Select your database
   - Go to "Import" tab
   - Upload the `database.sql` file
   - Click "Go" to execute

### Step 2: Backend Configuration
1. **Upload files to your server:**
   ```
   /your-site-root/excelvisualizer/
   ├── auth_backend.php
   ├── index.html
   ├── excel-visualizer.html
   ├── Js/auth.js (modified)
   └── ... (other existing files)
   ```

2. **Configure database connection:**
   - Edit `auth_backend.php`
   - Update lines 8-11 with your database credentials:
   ```php
   $servername = "localhost";          // Usually localhost
   $username = "your_db_username";     // Your database username
   $password = "your_db_password";     // Your database password
   $dbname = "excel_visualizer_db";    // Your database name
   ```

### Step 3: File Permissions
Set proper permissions on your hosting:
```bash
chmod 644 auth_backend.php
chmod 644 database.sql
```

### Step 4: Test the Setup
1. Visit: `https://www.onlineformimageresize.com/excelvisualizer/`
2. Try to register a new account
3. Try to login with the created account

---

## Option 2: Text File Storage (Simple Alternative)

If you prefer not to use a database or don't have MySQL access:

### Step 1: Upload Files
1. **Upload the text file backend:**
   ```
   /your-site-root/excelvisualizer/
   ├── auth_backend_textfile.php
   ├── data/ (will be created automatically)
   └── ... (other files)
   ```

2. **Rename the backend file:**
   - Rename `auth_backend_textfile.php` to `auth_backend.php`
   - Or update the JavaScript to point to `auth_backend_textfile.php`

### Step 2: Set Permissions
```bash
chmod 755 data/
chmod 666 data/users.txt
chmod 666 data/projects.txt
```

### Step 3: Security Considerations
- Add `.htaccess` file in `data/` folder to prevent direct access:
```apache
Order deny,allow
Deny from all
```

---

## Option 3: Enhanced Security Setup

### Session Management
For production use, consider implementing proper session management:

1. **Add session support to PHP backend**
2. **Implement JWT tokens** for API authentication
3. **Add CSRF protection**
4. **Use HTTPS** for all authentication requests

### Database Security
- Use environment variables for database credentials
- Implement proper input sanitization
- Add rate limiting for login attempts
- Use prepared statements (already implemented)

---

## Current Features Working

✅ **Sign-in and Sign-up pages** - Already implemented in your `index.html`
✅ **Form validation** - Client-side validation working
✅ **User session management** - LocalStorage + server authentication
✅ **Project management** - Save/load user projects
✅ **Password hashing** - Server-side password security
✅ **Error handling** - Proper error messages

---

## File Structure After Setup

```
/excelvisualizer/
├── index.html                 # Authentication pages (existing)
├── excel-visualizer.html      # Main application (existing)
├── auth_backend.php           # Server authentication API
├── database.sql               # Database schema
├── Js/
│   ├── auth.js               # Modified for server API
│   └── excel-visualizer.js   # Main app (existing)
├── css/
│   ├── auth.css              # Auth styling (existing)
│   └── excel-visualizer.css  # App styling (existing)
└── data/                     # For text file option
    ├── users.txt
    └── projects.txt
```

---

## Troubleshooting

### Common Issues:

1. **"Connection error" messages:**
   - Check if `auth_backend.php` is accessible
   - Verify database credentials
   - Check PHP error logs

2. **Database connection failed:**
   - Verify database exists
   - Check username/password
   - Ensure user has proper permissions

3. **File permission errors:**
   - Set correct permissions on data directory
   - Ensure PHP can write to files

4. **CORS errors:**
   - Headers are already set in PHP files
   - Check if mod_rewrite is enabled

### Debug Steps:
1. Check browser console for JavaScript errors
2. Check browser network tab for API responses
3. Check server error logs
4. Test database connection separately

---

## Next Steps

After setup is complete:
1. Test user registration and login
2. Test project saving/loading
3. Consider implementing:
   - Password reset functionality
   - Email verification
   - User profile management
   - File upload for Excel files

## Security Recommendations

1. **Use HTTPS** in production
2. **Regular backups** of user data
3. **Monitor for suspicious activity**
4. **Keep PHP and database updated**
5. **Implement rate limiting** for API endpoints

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify file permissions and paths
3. Test database connectivity
4. Review server error logs

Your authentication system will be fully functional once these steps are completed!