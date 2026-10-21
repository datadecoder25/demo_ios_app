#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envExamplePath = path.join(rootDir, '.env.example');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
  console.log('Copying .env.example to .env...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('Please edit .env with your actual configuration values.');
}
