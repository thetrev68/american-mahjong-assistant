const fs = require('fs');
const path = process.argv[2];
const s = fs.readFileSync(path, 'utf8');
let brace = 0, paren = 0;
let line = 1, col = 0;
let state = 'code'; // code | sq | dq | tq | line | block
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  const next = s[i+1];
  if (ch === '\n') { line++; col = 0; if (state === 'line') state = 'code'; continue; }
  col++;
  if (state === 'code') {
    if (ch === '/' && next === '*') { state = 'block'; i++; continue; }
    if (ch === '/' && next === '/') { state = 'line'; i++; continue; }
    if (ch === '\\') { i++; continue; }
    if (ch === "'") { state = 'sq'; continue; }
    if (ch === '"') { state = 'dq'; continue; }
    if (ch === '`') { state = 'tq'; continue; }
    if (ch === '{') { brace++; }
    if (ch === '}') { brace--; if (brace < 0) { console.log('extra } at', line, col); process.exit(0); } }
    if (ch === '(') { paren++; }
    if (ch === ')') { paren--; if (paren < 0) { console.log('extra ) at', line, col); process.exit(0); } }
  } else if (state === 'sq') {
    if (ch === '\\') { i++; continue; }
    if (ch === "'") { state = 'code'; continue; }
  } else if (state === 'dq') {
    if (ch === '\\') { i++; continue; }
    if (ch === '"') { state = 'code'; continue; }
  } else if (state === 'tq') {
    if (ch === '\\') { i++; continue; }
    if (ch === '`') { state = 'code'; continue; }
    if (ch === '$' && next === '{') { i++; brace++; }
  } else if (state === 'block') {
    if (ch === '*' && next === '/') { state = 'code'; i++; continue; }
  }
}
console.log('end balances', { brace, paren, line });
