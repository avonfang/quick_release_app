/**
 * Test Cloudflare Pages multipart upload with just the manifest (no files)
 * to see if we get upload URLs back
 */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = process.argv[2];
const ACCOUNT_ID = '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT = 'kanci';

// Create a temp file
const tmpFile = path.join(__dirname, '_test_upload.txt');
fs.writeFileSync(tmpFile, 'hello test ' + Date.now());
const hash = crypto.createHash('sha256').update(fs.readFileSync(tmpFile)).digest('hex');
const manifest = JSON.stringify({ '_test_upload.txt': hash });

console.log('Manifest:', manifest);

// Build multipart
const boundary = '----TestBoundary' + Math.random().toString(36).slice(2);
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="manifest"\r\n\r\n${manifest}\r\n`),
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="branch"\r\n\r\nmain\r\n`),
  Buffer.from(`--${boundary}--\r\n`),
]);

console.log('Body length:', body.length);

const u = new URL(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`);
const opts = {
  hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  },
};

const req = https.request(opts, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const j = JSON.parse(data);
    if (j.success) {
      console.log('✅ Success!');
      console.log('  ID:', j.result.id);
      console.log('  URL:', j.result.url);
      const nu = j.result.needs_upload || {};
      console.log('  needs_upload:', Object.keys(nu).length, 'files');
      if (Object.keys(nu).length > 0) {
        console.log('  Upload URL for test.txt:', nu['_test_upload.txt']);
      }
    } else {
      console.log('❌ Error:', JSON.stringify(j.errors));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
