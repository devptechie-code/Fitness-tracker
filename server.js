import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 fallback to index (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  Neo Fit Fitness Tracker                      ║
║  🌐 http://localhost:${PORT}                    ║
║  📁 public/                                   ║
║  ⚛️  npm run dev   (with --watch)             ║
║  🚀 npm start      (production)               ║
╚═══════════════════════════════════════════════╝
  `);
});
