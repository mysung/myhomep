import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function saveContentPlugin(): Plugin {
  return {
    name: 'save-content-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/save-content' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const indexPath = path.resolve(process.cwd(), 'index.html');
              if (!fs.existsSync(indexPath)) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'index.html not found' }));
                return;
              }

              let html = fs.readFileSync(indexPath, 'utf-8');
              const newVersion = '2026-09-15-v' + Date.now();

              // 1. Update APP_DATA_VERSION
              html = html.replace(
                /var APP_DATA_VERSION = ['"].*?['"];/,
                `var APP_DATA_VERSION = '${newVersion}';`
              );

              // 2. Update DEFAULT_AUTHOR_INFO
              if (data.authorInfo) {
                const authorInfoStr = JSON.stringify(data.authorInfo, null, 2);
                html = html.replace(
                  /const DEFAULT_AUTHOR_INFO = \{[\s\S]*?\};/,
                  `const DEFAULT_AUTHOR_INFO = ${authorInfoStr};`
                );

                if (data.authorInfo.name) {
                  const safeName = data.authorInfo.name;
                  html = html.replace(
                    /<title>.*?<\/title>/,
                    `<title>${safeName} 미니 홈페이지</title>`
                  );
                  html = html.replace(
                    /<meta property="og:title" content=".*?" \/>/,
                    `<meta property="og:title" content="${safeName} 미니 홈페이지" />`
                  );
                  html = html.replace(
                    /<meta name="twitter:title" content=".*?" \/>/,
                    `<meta name="twitter:title" content="${safeName} 미니 홈페이지" />`
                  );
                }

                if (data.authorInfo.oneLineBio) {
                  const safeBio = String(data.authorInfo.oneLineBio).replace(/"/g, '&quot;');
                  html = html.replace(
                    /<meta name="description" content=".*?" \/>/,
                    `<meta name="description" content="${safeBio}" />`
                  );
                  html = html.replace(
                    /<meta property="og:description" content=".*?" \/>/,
                    `<meta property="og:description" content="${safeBio}" />`
                  );
                  html = html.replace(
                    /<meta name="twitter:description" content=".*?" \/>/,
                    `<meta name="twitter:description" content="${safeBio}" />`
                  );
                }
              }

              // 3. Update DEFAULT_CAREERS
              if (data.careers && Array.isArray(data.careers)) {
                const careersStr = JSON.stringify(data.careers, null, 2);
                html = html.replace(
                  /const DEFAULT_CAREERS = \[[\s\S]*?\];/,
                  `const DEFAULT_CAREERS = ${careersStr};`
                );
              }

              // 4. Update DEFAULT_CUSTOM_SECTIONS
              if (data.customSections && Array.isArray(data.customSections)) {
                const customSecStr = JSON.stringify(data.customSections, null, 2);
                html = html.replace(
                  /const DEFAULT_CUSTOM_SECTIONS = \[[\s\S]*?\];/,
                  `const DEFAULT_CUSTOM_SECTIONS = ${customSecStr};`
                );
              }

              // 5. Update DEFAULT_WEBAPPS
              if (data.webapps && Array.isArray(data.webapps)) {
                const webappsStr = JSON.stringify(data.webapps, null, 2);
                html = html.replace(
                  /const DEFAULT_WEBAPPS = \[[\s\S]*?\];/,
                  `const DEFAULT_WEBAPPS = ${webappsStr};`
                );
              }

              // 6. Update DEFAULT_AVATAR
              if (data.profileImage) {
                html = html.replace(
                  /const DEFAULT_AVATAR = ['"].*?['"];/,
                  `const DEFAULT_AVATAR = '${data.profileImage}';`
                );
              }

              // 7. Update DEFAULT_ADMIN_PWD
              if (data.adminPassword) {
                html = html.replace(
                  /const DEFAULT_ADMIN_PWD = ['"].*?['"];/,
                  `const DEFAULT_ADMIN_PWD = '${data.adminPassword}';`
                );
              }

              // Write updated index.html
              fs.writeFileSync(indexPath, html, 'utf-8');

              // Also sync to dist/index.html if dist exists
              const distIndexPath = path.resolve(process.cwd(), 'dist/index.html');
              if (fs.existsSync(distIndexPath)) {
                fs.writeFileSync(distIndexPath, html, 'utf-8');
              }

              // Update metadata.json if name or description provided
              const metaPath = path.resolve(process.cwd(), 'metadata.json');
              if (fs.existsSync(metaPath) && data.authorInfo) {
                try {
                  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                  if (data.authorInfo.name) {
                    meta.name = `${data.authorInfo.name} 미니 홈페이지`;
                  }
                  if (data.authorInfo.oneLineBio) {
                    meta.description = data.authorInfo.oneLineBio;
                  }
                  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
                } catch (e) {
                  console.warn('Failed to update metadata.json', e);
                }
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  version: newVersion,
                  message: 'index.html 파일에 성공적으로 영구 저장되었습니다.',
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Server error' }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), saveContentPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
