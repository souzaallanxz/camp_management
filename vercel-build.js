#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Log the beginning of the build process
console.log('Starting custom build process...');

try {
  // Build the frontend
  console.log('Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Check if dist directory exists
  if (!fs.existsSync('dist')) {
    console.error('Build failed: dist directory does not exist');
    process.exit(1);
  }
  
  // Copy the api directory to dist
  console.log('Copying API files to dist...');
  
  // Create the api directory in dist if it doesn't exist
  if (!fs.existsSync('dist/api')) {
    fs.mkdirSync('dist/api', { recursive: true });
  }
  
  // Copy all files from /api to /dist/api
  const apiFiles = fs.readdirSync('api');
  apiFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.mjs')) {
      const sourceFile = path.join('api', file);
      const destFile = path.join('dist/api', file);
      fs.copyFileSync(sourceFile, destFile);
      console.log(`Copied ${sourceFile} to ${destFile}`);
    }
  });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} 