const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting client build script...');

// Check if client directory exists
const clientDir = path.join(__dirname, '../client');
if (!fs.existsSync(clientDir)) {
  console.error('Error: client directory not found');
  process.exit(1);
}

try {
  // Navigate to client directory and install dependencies
  console.log('Installing client dependencies...');
  execSync('npm install --no-optional', { 
    cwd: clientDir, 
    stdio: 'inherit'
  });

  // Build the client
  console.log('Building client...');
  execSync('npm run build', { 
    cwd: clientDir, 
    stdio: 'inherit', 
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max_old_space_size=4096',
      CI: 'false' // Treat warnings as warnings, not errors
    }
  });

  // Check if build directory was created
  const buildDir = path.join(clientDir, 'build');
  if (fs.existsSync(buildDir)) {
    console.log('Client build completed successfully.');
    
    // Check if index.html exists
    const indexFile = path.join(buildDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      console.log('index.html found in build directory.');
    } else {
      console.error('Warning: index.html not found in build directory.');
    }
  } else {
    console.error('Error: Build directory not created.');
    process.exit(1);
  }

} catch (error) {
  console.error('Build error:', error.message);
  process.exit(1);
}

console.log('Build script completed.'); 