const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function makeZip(repoPath, zipFileName) {
  const sentclaudeDir = path.join(repoPath, 'sentclaude');
  if (!fs.existsSync(sentclaudeDir)) {
    fs.mkdirSync(sentclaudeDir, { recursive: true });
  }
  const zipPath = path.join(sentclaudeDir, zipFileName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use tar or powershell Compress-Archive with clean temporary staging
  const tempDir = path.join(process.env.TEMP || 'C:\\temp', 'sentclaude_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const excludes = new Set([
    'node_modules', '.git', 'dist', 'release', 'backups', 'sentclaude',
    'scratch', '.agents', '.system_generated', 'content', 'GEMINI.md', 'README.md'
  ]);

  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (excludes.has(entry.name) || entry.name.startsWith('.env')) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(repoPath, tempDir);

  // Archive
  const psCmd = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -Force`;
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });

  // Cleanup tempDir
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`Successfully generated: ${zipPath} (${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB)`);
}

makeZip('S:\\Git\\bombastype', 'bombastype_sentclaude.zip');
makeZip('S:\\Git\\subqifont', 'subqifont_sentclaude.zip');
