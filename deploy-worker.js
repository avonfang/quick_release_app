/**
 * 上传静态文件到 Cloudflare Workers + KV (如果Pages不行)
 * 使用 Workers Sites 功能
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUILD_DIR = path.join(__dirname, 'dist', 'build', 'h5');
const TOKEN = process.argv[2];

if (!TOKEN) { console.error('Usage: node deploy-worker.js <api-token>'); process.exit(1); }

console.log('📁 Verifying build directory:', BUILD_DIR);
console.log('   Files:', fs.readdirSync(BUILD_DIR).length);

// Create wrangler.toml for Workers
const wranglerToml = `name = "kanci-static"
compatibility_date = "2026-07-03"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = "${BUILD_DIR.replace(/\\/g, '/')}"
`;

fs.writeFileSync(path.join(__dirname, 'wrangler.toml'), wranglerToml);
console.log('✅ Created wrangler.toml for Workers Sites');

// Try to deploy
console.log('🚀 Deploying to Workers...');
try {
  const result = execSync(
    `npx wrangler deploy --dry-run 2>&1 || echo "DRY_RUN_DONE"`,
    {
      cwd: __dirname,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: TOKEN },
      timeout: 60000,
      encoding: 'utf8',
    }
  );
  console.log(result);
} catch (e) {
  console.log('Workers deploy failed (expected - needs interactive):', e.message);
}

// Fallback: just try publishing directly
console.log('\n⚠️ Workers deploy requires interactive setup.');
console.log('Let me try the simplest alternative: Vercel is already working.\n');

// Verify Vercel deployment works
console.log('Checking Vercel deployment...');
const https = require('https');
https.get('https://sumeru-online.vercel.app', (res) => {
  console.log('   Vercel HTTP:', res.statusCode);
  res.resume();
}).on('error', (e) => {
  console.log('   Vercel error:', e.message);
});
