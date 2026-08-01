const { Liquid } = require('liquidjs');
const fs = require('fs');
const engine = new Liquid({ root: ['.'] });
const files = ['home-hero','home-trust-bar','home-social-proof'];
let ok = true;
for (const f of files) {
  const src = fs.readFileSync(`sections/${f}.liquid`, 'utf8');
  // parse only the template body (before {% schema %}) - schema is JSON, not parsed as liquid
  const body = src.split(/\{%-?\s*schema\s*-?%\}/)[0];
  try {
    engine.parse(body, `sections/${f}.liquid`);
    console.log(`${f}: PARSE OK`);
  } catch (e) {
    ok = false;
    console.log(`${f}: PARSE ERROR -> ${e.message}`);
  }
}
process.exit(ok ? 0 : 1);
