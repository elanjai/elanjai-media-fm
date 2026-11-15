const fs = require('fs');

const dynPages = [
  ['src/app/[lang]/category/[slug]/page.tsx', 'category', 'c'],
  ['src/app/[lang]/city/[slug]/page.tsx', 'city', 'c'],
  ['src/app/[lang]/collection/[slug]/page.tsx', 'collection', 'c'],
  ['src/app/[lang]/genre/[slug]/page.tsx', 'genre', 'g'],
  ['src/app/[lang]/network/[slug]/page.tsx', 'network', 'n'],
  ['src/app/[lang]/station/[slug]/page.tsx', 'station', 's'],
];

for (const [f, pathBase, v] of dynPages) {
  let c = fs.readFileSync(f, 'utf8');
  const oldAlt = `alternates: { canonical: \`\${SITE.url}/${pathBase}/\${${v}.slug}\` },`;
  const newAlt = `alternates: { canonical: \`\${SITE.url}/\${lang}/${pathBase}/\${${v}.slug}\`, ...langAlternates(\`/${pathBase}/\${${v}.slug}\`) },`;
  if (c.includes(oldAlt)) {
    c = c.replace(oldAlt, newAlt);
    console.log('alt ok', f);
  } else {
    console.log('ALT MISS', f);
  }
  // canonical og:url if present
  c = c.replaceAll(`url: \`\${SITE.url}/${pathBase}/\${${v}.slug}\``, `url: \`\${SITE.url}/\${lang}/${pathBase}/\${${v}.slug}\``);
  // breadcrumb jsonld URLs
  c = c.replaceAll(`{ name: "Home", url: SITE.url }`, `{ name: "Home", url: \`\${SITE.url}/\${lang}\` }`);
  c = c.replaceAll(`url: \`\${SITE.url}/genre/${pathBase === 'genre' ? '' : ''}`, `url: \`\${SITE.url}/\${lang}/genre/`);
  fs.writeFileSync(f, c);
}
