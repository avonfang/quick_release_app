/**
 * Test Cloudflare Pages multipart upload with actual file content included
 */
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN = process.argv[2];
const ACCOUNT_ID = '3b381f096a1def0c90a87a4325eeb2f9';
const PROJECT = 'kanci';

// Create a test HTML file
const content = '<!DOCTYPE html><html><body><h1>Hello from 看见此刻!</h1><p>Deploy test: ' + Date.now() + '</p></body></html>';
const hash = crypto.createHash('sha256').update(content).digest('hex');
const manifest = JSON.stringify({ 'index.html': hash });

console.log('Manifest:', manifest);

// Build multipart with the actual file
const boundary = '----TestBoundary' + Math.random().toString(36).slice(2);
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="manifest"\r\n\r\n${manifest}\r\n`),
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="branch"\r\n\r\nmain\r\n`),
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="index.html"; filename="index.html"\r\nContent-Type: text/html\r\n\r\n`),
  Buffer.from(content),
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

console.log('Body length:', body.length);
console.log('Content hash:', hash);

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
      console.log('  needs_upload:', Object.keys(nu).length);

      // Wait and check the URL
      console.log('\n⏳ Checking deployment after 5s...');
      setTimeout(() => {
        https.get(j.result.url, (res2) => {
          let d = '';
          res2.on('data', c => d += c);
          res2.on('end', () => {
            console.log('  HTTP:', res2.statusCode);
            console.log('  Content:', d.slice(0, 200));
          });
        });
      }, 5000);
    } else {
      console.log('❌ Error:', JSON.stringify(j.errors));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
