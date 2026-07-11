import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build script: combines HTML + CSS + JS into a single self-contained file
 * for easy sharing or deployment as a static artifact.
 */

const htmlPath = path.join(__dirname, 'public', 'index.html');
const cssPath = path.join(__dirname, 'public', 'styles.css');
const jsPath = path.join(__dirname, 'public', 'app.js');
const outPath = path.join(__dirname, 'dist', 'NeoFit.html');

try {
  // Read files
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const css = fs.readFileSync(cssPath, 'utf-8');
  const js = fs.readFileSync(jsPath, 'utf-8');

  // Inline CSS: replace <link rel="stylesheet" href="styles.css"> with <style>
  html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    `<style>\n${css}\n</style>`
  );

  // Inline JS: replace <script src="app.js"></script> with <script>
  html = html.replace(
    '<script src="app.js"></script>',
    `<script>\n${js}\n</script>`
  );

  // Ensure dist directory exists
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write bundled file
  fs.writeFileSync(outPath, html, 'utf-8');

  const bundleSize = fs.statSync(outPath).size / 1024;
  console.log(`✅ Build complete!`);
  console.log(`📦 ${outPath}`);
  console.log(`📊 Size: ${bundleSize.toFixed(1)} KB`);
  console.log(`\n💡 Single HTML file ready to share or deploy.`);
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}
