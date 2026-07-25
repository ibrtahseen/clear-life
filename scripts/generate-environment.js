// Generates src/environments/environment.ts if it's missing (e.g. in CI/CD,
// where the real file is gitignored). Never overwrites a local copy.
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');

if (fs.existsSync(targetPath)) {
  process.exit(0);
}

const apiKey = process.env.UMMAH_API_KEY || '';
const content = `export const environment = {
  production: true,
  ummahApiKey: '${apiKey}',
};
`;

fs.writeFileSync(targetPath, content);
console.log(`Generated ${targetPath}${apiKey ? '' : ' (no UMMAH_API_KEY set, using empty key)'}`);
