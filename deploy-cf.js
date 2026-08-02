/**
 * Cloudflare Pages 两步部署：先发 manifest 拿上传 URL，再逐文件上传
 * 用法: node deploy-cf.js <api-token>
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_TOKEN = process.argv[2];
const ACCOUNT_ID = '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT = 'kanci';
const BUILD_DIR = path.join(__dirname, 'dist', 'build', 'h5');

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${urlPath}`);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { 'Authorization': `Bearer ${API_TOKEN}` } };
    if (body) { opts.headers['Content-Type'] = 'application/json'; }
    const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function putFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const content = fs.readFileSync(filePath);
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': content.length } };
    const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); });
    r.on('error', reject);
    r.write(content);
    r.end();
  });
}

(async () => {
  // Scan files
  const allFiles = [];
  function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : allFiles.push(f); }); }
  walk(BUILD_DIR);

  const manifest = {};
  for (const f of allFiles) {
    const rel = path.relative(BUILD_DIR, f).replace(/\\/g, '/');
    if (rel.startsWith('functions')) continue; // skip functions for now
    manifest[rel] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  }

  console.log(`📁 ${allFiles.length} files, ${Object.keys(manifest).length} in manifest`);

  // Step 1: Create deployment with manifest
  console.log('🚀 Step 1: Creating deployment...');
  const result = await api('POST', `/pages/projects/${PROJECT}/deployments`, { manifest, branch: 'main' });
  if (!result.success) {
    console.error('❌ Failed:', JSON.stringify(result.errors));
    process.exit(1);
  }

  const deployId = result.result.id;
  const deployUrl = result.result.url;
  const needsUpload = result.result.needs_upload || {};
  const keys = Object.keys(needsUpload);

  console.log(`   ID: ${deployId}, URL: ${deployUrl}, needs_upload: ${keys.length} files`);

  // Step 2: Upload files
  if (keys.length > 0) {
    console.log('📤 Step 2: Uploading files...');
    for (let i = 0; i < keys.length; i++) {
      const relPath = keys[i];
      const filePath = path.join(BUILD_DIR, relPath);
      if (!fs.existsSync(filePath)) { console.warn(`   ⚠️  Missing: ${relPath}`); continue; }
      await putFile(needsUpload[relPath], filePath);
      console.log(`   [${i+1}/${keys.length}] ${relPath}`);
    }
  }

  console.log('✅ Deployment submitted!');
  console.log(`   Preview: ${deployUrl}`);
  console.log(`   Production: https://kanci-6nh.pages.dev`);

  // Promote to production
  console.log('⏳ Promoting to production...');
  await new Promise(r => setTimeout(r, 3000));
  const status = await api('GET', `/pages/projects/${PROJECT}/deployments/${deployId}`);
  if (status.success) {
    const s = status.result;
    console.log(`   Status: ${s.latest_stage?.name || 'unknown'}:${s.latest_stage?.status || 'unknown'}`);
    console.log(`   Aliases: ${s.aliases ? s.aliases.join(', ') : 'none'}`);
  }
})();
