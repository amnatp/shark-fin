#!/usr/bin/env node
/* eslint-disable */
// Zero-dependency static SPA preview server with index.html fallback
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const port = process.env?.PORT || 5000;

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
    // Try to serve the exact file from dist
    let filePath = path.join(distDir, urlPath);
    // Prevent directory traversal
    if (!filePath.startsWith(distDir)) throw new Error('invalid');

    let data;
    try {
      data = await readFile(filePath);
    } catch {
      // Fallback to index.html for SPA routes
      data = await readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});
