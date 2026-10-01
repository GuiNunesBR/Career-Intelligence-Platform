import fs from 'fs';
import path from 'path';

const schemaFile = path.join(process.cwd(), 'server', 'db', 'schema.ts');
let content = fs.readFileSync(schemaFile, 'utf8');

// Any text('...') that eventually has .$type< will get { mode: 'json' } added.
// Example: text('target_roles').notNull().$type<string[]>()
// becomes: text('target_roles', { mode: 'json' }).notNull().$type<string[]>()

content = content.replace(/text\('([^']+)'\)(.*?)\.\$type</g, "text('$1', { mode: 'json' })$2.$type<");

// Also, the `requirements` field in `jobs` is json, `timeline` in `applications`, `dimensions` and `evidenceMatrix` in `fitAnalyses`, `selectedExperiences`, `selectedSkills`, `selectedProjects` in `tailoredCvs`.
// Let's manually replace those to have { mode: 'json' }
content = content.replace(/requirements: text\('requirements'\)\.notNull\(\),/g, "requirements: text('requirements', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/timeline: text\('timeline'\)\.notNull\(\),/g, "timeline: text('timeline', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/dimensions: text\('dimensions'\)\.notNull\(\),/g, "dimensions: text('dimensions', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/evidenceMatrix: text\('evidence_matrix'\)\.notNull\(\),/g, "evidenceMatrix: text('evidence_matrix', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/selectedExperiences: text\('selected_experiences'\)\.notNull\(\),/g, "selectedExperiences: text('selected_experiences', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/selectedSkills: text\('selected_skills'\)\.notNull\(\),/g, "selectedSkills: text('selected_skills', { mode: 'json' }).notNull().$type<any>(),");
content = content.replace(/selectedProjects: text\('selected_projects'\)\.notNull\(\),/g, "selectedProjects: text('selected_projects', { mode: 'json' }).notNull().$type<any>(),");

// Also the 'logs' field in backgroundJobs might need it, but I used .$type<string[]>() which is caught by the regex!

fs.writeFileSync(schemaFile, content);
console.log('Schema JSON modes fixed.');
