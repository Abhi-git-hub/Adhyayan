const fs = require('fs');
const path = require('path');

// The repository currently ships the compiled frontend in /build.
// There is no client source tree in this branch, so deployment should verify
// the artifact rather than attempting to build a missing directory.
const buildDir = path.join(__dirname, 'build');
const indexFile = path.join(buildDir, 'index.html');

if (!fs.existsSync(buildDir) || !fs.statSync(buildDir).isDirectory()) {
  console.error('Build directory not found:', buildDir);
  process.exit(1);
}

if (!fs.existsSync(indexFile) || !fs.statSync(indexFile).isFile()) {
  console.error('Frontend build is missing index.html:', indexFile);
  process.exit(1);
}

console.log('Frontend build verified successfully.');
console.log(`Build directory: ${buildDir}`);
