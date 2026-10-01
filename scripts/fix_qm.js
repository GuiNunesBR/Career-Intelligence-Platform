import fs from 'fs';
import path from 'path';

const REPO_DIR = path.join(process.cwd(), 'server', 'repositories');
const files = fs.readdirSync(REPO_DIR).filter(f => f.startsWith('sqlite.') && f.endsWith('.ts'));

for (const file of files) {
  const p = path.join(REPO_DIR, file);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/\?,/g, ' || undefined,');
  content = content.replace(/\?\r?\n/g, ' || undefined\n');
  fs.writeFileSync(p, content);
}
console.log('Fixed trailing question marks.');
