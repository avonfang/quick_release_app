/**
 * 通过 Cloudflare API multipart 直接上传部署 Pages
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_TOKEN = process.argv[2];
const ACCOUNT_ID = process.argv[3] || '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT_NAME = process.argv[4] || 'kanci';
const BUILD_DIR = process.argv[5] || path.join(__dirname, 'dist', 'build', 'h5');

if (!API_TOKEN) {
  console.error('Usage: node deploy-cloudflare.js <api-token>');
  process.exit(1);
}

// Scan files and compute hashes
function getAllFiles(dir) {
  const files = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(full);
    }
  }
  walk(dir);
  return files;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

console.log('📁 Scanning:', BUILD_DIR);
const allFiles = getAllFiles(BUILD_DIR);
const manifest = {};
for (const f of allFiles) {
  const rel = path.relative(BUILD_DIR, f).replace(/\\/g, '/');
  manifest[rel] = sha256(f);
}
console.log(`   ${allFiles.length} files`);

// Build multipart form
const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
const encoder = new TextEncoder();

function formField(name, value) {
  return `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}

function formFile(fieldName, filePath, relativePath) {
  const content = fs.readFileSync(filePath);
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${relativePath}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    content,
    Buffer.from('\r\n'),
  ]);
}

// Build manifest JSON and include as form field
const manifestJson = JSON.stringify(manifest);

let bodyParts = [
  Buffer.from(formField('manifest', manifestJson)),
  Buffer.from(formField('branch', 'main')),
];

// Add all files as form fields
for (const f of allFiles) {
  const rel = path.relative(BUILD_DIR, f).replace(/\\/g, '/');
  bodyParts.push(formFile(rel, f, rel));
}
bodyParts.push(Buffer.from(`--${boundary}--\r\n`));

const body = Buffer.concat(bodyParts);

console.log('🚀 Creating deployment...');
console.log('   Body size:', (body.length / 1024 / 1024).toFixed(2), 'MB');

const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`);
const opts = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  },
};

const req = https.request(opts, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log(`✅ 部署成功!`);
        console.log(`   URL: ${result.result.url || 'kanci-6nh.pages.dev'}`);
        console.log(`   Deploy ID: ${result.result.id}`);
        console.log(`   Dashboard: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}`);
      } else {
        console.error('❌ 部署失败:', JSON.stringify(result.errors));
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ 解析响应失败:', data.slice(0, 500));
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ 请求失败:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
