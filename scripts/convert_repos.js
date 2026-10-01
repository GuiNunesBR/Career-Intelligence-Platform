import fs from 'fs';
import path from 'path';

const REPO_DIR = path.join(process.cwd(), 'server', 'repositories');

function convert() {
  const files = fs.readdirSync(REPO_DIR).filter(f => f.startsWith('pg.') && f.endsWith('.ts'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(REPO_DIR, file), 'utf8');
    
    let newContent = content.replace(/import \{ db \} from '\.\.\/db\/postgres\.js';/g, "import { db } from '../db/index.js';");
    newContent = newContent.replace(/\.toISOString\(\)/g, ""); // SQLite text() already returns strings
    newContent = newContent.replace(/new Date\(\)/g, "new Date().toISOString()"); // For inserts
    newContent = newContent.replace(/Pg/g, "Sqlite"); // Rename class names
    
    // Fix the new Date().toISOString() that might be replacing inside Date.now() + something
    newContent = newContent.replace(/new Date\(\)\.toISOString\(\)\(Date\.now\(\) \+ 1000 \* 60 \* 60 \* 24 \* 7\)/g, "new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()");
    
    // Careful with new Date(Date.now() + ...) getting messed up
    // Actually, let's just do a smarter replace.
    // For now we will overwrite the new content safely.
    const newName = file.replace('pg.', 'sqlite.');
    fs.writeFileSync(path.join(REPO_DIR, newName), newContent);
    console.log(`Converted ${file} to ${newName}`);
  }
}

convert();
