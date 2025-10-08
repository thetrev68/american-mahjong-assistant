const fs = require('fs');
const path = process.argv[2];
const s0 = fs.readFileSync(path, 'utf8');
let s = s0;
// Strip block comments
s = s.replace(/\/\*[\s\S]*?\*\//g, '');
// Strip line comments
s = s.replace(/(^|\n)\s*\/\/.*(?=\n|$)/g, '$1');
// Strip strings (single, double, template)
s = s.replace(/'(?:\\.|[^'\\])*'/g, "''");
s = s.replace(/"(?:\\.|[^"\\])*"/g, '""');
s = s.replace(/`(?:\\.|[^`\\])*`/g, '``');

let b = 0;
let p = 0;
let problem = null;
const lines = s.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') b++;
    else if (ch === '}') {
      b--;
      if (b < 0 && problem == null) problem = i + 1;
    } else if (ch === '(') p++;
    else if (ch === ')') {
      p--;
      if (p < 0 && problem == null) problem = i + 1;
    }
  }
}
console.log(JSON.stringify({ braceBalance: b, parenBalance: p, problemLine: problem }, null, 2));
