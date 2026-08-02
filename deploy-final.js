/**
 * Deployment script for Cloudflare Pages.
 *
 * If subdomain not active, fallback to alternative approach:
 * Use a Cloudflare Worker to serve the static site.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN = process.argv[2];
const ACCOUNT_ID = '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT = 'kanci';
const BUILD_DIR = path.join(__dirname, 'dist', 'build', 'h5');

function api(method, urlPath, body, contentType) {
  return new Promise((resolve, reject) => {
    const u = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${urlPath}`);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { 'Authorization': `Bearer ${TOKEN}` } };
    if (body && contentType) {
      opts.headers['Content-Type'] = contentType;
    } else if (body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ success: false, errors: [{ message: d.slice(0,200) }] }); } }); });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

(async () => {
  // Step 1: Delete project (if exists)
  console.log('🗑️  Deleting project...');
  const delRes = await api('DELETE', `/pages/projects/${PROJECT}`);
  console.log('   Result:', delRes.success ? 'OK' : (delRes.errors || 'no project'));

  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Recreate project
  console.log('🏗️  Creating project...');
  const createRes = await api('POST', `/pages/projects`,
    { name: PROJECT, production_branch: 'main' });
  console.log('   Result:', createRes.success ? 'OK' : JSON.stringify(createRes.errors));
  if (!createRes.success) process.exit(1);
  console.log('   Subdomain:', createRes.result.subdomain);

  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Upload via multipart
  console.log('📦 Preparing upload...');
  const allFiles = [];
  function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : allFiles.push(f); }); }
  walk(BUILD_DIR);

  // Compute manifest and build multipart body
  const manifest = {};
  for (const f of allFiles) {
    const rel = path.relative(BUILD_DIR, f).replace(/\\/g, '/');
    manifest[rel] = fileHash(f);
  }

  const boundary = '----CloudflarePages' + crypto.randomBytes(8).toString('hex');
  const parts = [];

  // Manifest field
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="manifest"\r\n\r\n${JSON.stringify(manifest)}\r\n`));

  // Branch field
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="branch"\r\n\r\nmain\r\n`));

  // File fields
  for (const f of allFiles) {
    const rel = path.relative(BUILD_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f);
    const ext = path.extname(f).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
      '.json': 'application/json', '.txt': 'text/plain', '.woff': 'font/woff',
      '.woff2': 'font/woff2' }[ext] || 'application/octet-stream';
    parts.push(Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${rel}"; filename="${rel}"\r\nContent-Type: ${mime}\r\n\r\n`),
      content,
      Buffer.from('\r\n'),
    ]));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  console.log(`   Files: ${allFiles.length}, Size: ${(body.length/1024/1024).toFixed(2)} MB`);

  console.log('🚀 Uploading deployment...');
  const deployRes = await api('POST', `/pages/projects/${PROJECT}/deployments`, body,
    `multipart/form-data; boundary=${boundary}`);

  if (!deployRes.success) {
    console.error('❌ Upload failed:', JSON.stringify(deployRes.errors));
    process.exit(1);
  }

  console.log('✅ Deployment created!');
  console.log('   ID:', deployRes.result.id);
  console.log('   URL:', deployRes.result.url);

  // Step 4: Wait and check
  console.log('\n⏳ Waiting 10s for deployment to be ready...');
  await new Promise(r => setTimeout(r, 10000));

  const prodUrl = `https://${PROJECT}-6nh.pages.dev`;
  console.log(`\n📡 Checking URL: ${prodUrl}`);
  https.get(prodUrl, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log(`   HTTP ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log(`   ✅ 部署成功！访问地址: ${prodUrl}`);
      } else {
        console.log(`   ❌ 仍然不可访问 (HTTP ${res.statusCode})`);
        console.log('   请尝试在 Cloudflare Dashboard 中手动操作:');
        console.log('   https://dash.cloudflare.com/' + ACCOUNT_ID + '/pages/view/' + PROJECT);
      }
    });
  }).on('error', e => console.error('   Error:', e.message));
})().catch(err => { console.error('❌', err.message); process.exit(1); });
