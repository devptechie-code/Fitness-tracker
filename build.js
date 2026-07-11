import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build script: combines HTML + CSS + JS into a single self-contained file
 * for easy sharing or deployment as a static artifact.
 */

const htmlPath = path.join(__dirname, 'public', 'index.html');
const outPath = path.join(__dirname, 'dist', 'NeoFit.html');

try {
  let html = fs.readFileSync(htmlPath, 'utf-8');

  // Inline the local stylesheet (handles both "styles.css" and "/styles.css")
  html = html.replace(/<link rel="stylesheet" href="\/?styles\.css">/, () => {
    const css = fs.readFileSync(path.join(__dirname, 'public', 'styles.css'), 'utf-8');
    return `<style>\n${css}\n</style>`;
  });

  // Inline every local script tag (kb.js, chat.js, app.js, …) in order
  html = html.replace(/<script src="\/?([\w-]+\.js)"><\/script>/g, (_, file) => {
    const js = fs.readFileSync(path.join(__dirname, 'public', file), 'utf-8');
    return `<script>\n${js}\n</script>`;
  });

  if (html.includes('src="/') || /href="\/?styles\.css"/.test(html)) {
    throw new Error('Some local assets were not inlined — check the tags in index.html.');
  }

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
