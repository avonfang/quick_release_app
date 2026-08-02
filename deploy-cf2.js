/**
 * Alternative deployment - use the Cloudflare Pages API with multipart properly
 * Based on how wrangler sends direct uploads
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const API_TOKEN = process.argv[2];
const ACCOUNT_ID = '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT = 'kanci';
const BUILD_DIR = path.join(__dirname, 'dist', 'build', 'h5');

// Delete and recreate project to clear stuck state
async function api(method, urlPath, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${urlPath}`);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { 'Authorization': `Bearer ${API_TOKEN}`, ...extraHeaders } };
    const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) })); });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

(async () => {
  // Delete existing project
  console.log('🗑️  Deleting existing project...');
  const del = await api('DELETE', `/pages/projects/${PROJECT}`);
  console.log(`   ${del.status}: ${del.data.success ? 'OK' : JSON.stringify(del.data.errors)}`);

  // Wait for deletion
  await new Promise(r => setTimeout(r, 2000));

  // Recreate project
  console.log('🏗️  Recreating project...');
  const create = await api('POST', `/pages/projects/${PROJECT}`,
    { name: PROJECT, production_branch: 'main' });
  if (!create.data.success) {
    console.error('❌ Create failed:', JSON.stringify(create.data.errors));
    process.exit(1);
  }
  console.log(`   OK - Subdomain: ${create.data.result.subdomain}`);

  // Wait for project to be ready
  await new Promise(r => setTimeout(r, 2000));

  // Now use wrangler with the proper API - pipe yes to account selection
  console.log('🚀 Deploying via wrangler CLI...');
  const child = spawn('npx', ['wrangler', 'pages', 'deploy', BUILD_DIR, '--project-name', PROJECT, '--branch', 'main'], {
    cwd: __dirname,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, CLOUDFLARE_API_TOKEN: API_TOKEN }
  });

  // Auto-confirm account selection
  child.stdin.write('1\n');
  child.stdin.end();

  child.on('exit', (code) => {
    console.log(`\nwrangler exited with code ${code}`);
    if (code === 0) {
      console.log(`\n✅ 部署完成！`);
      console.log(`   访问地址: https://kanci-6nh.pages.dev`);
    }
  });
})().catch(err => { console.error('❌', err.message); process.exit(1); });
