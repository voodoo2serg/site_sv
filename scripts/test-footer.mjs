import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const shell=await readFile('components/Shell.tsx','utf8');
const css=await readFile('app/globals.css','utf8');
const siteContent=await readFile('lib/content.ts','utf8');
assert.ok(siteContent.includes("|| 'https://vodopetov.ru'"),'Canonical site fallback must use vodopetov.ru');
assert.ok(siteContent.includes("configuredSiteUrl.includes('sergey-vodopetov.workspace-973399.chatgpt.site') ? 'https://vodopetov.ru'"),'Normalize old deployment URL');
const homepage=await readFile('app/page.tsx','utf8');
assert.ok(homepage.includes('className="portrait-link" href="/about/"'),'Home portrait must remain a local site link');

for(const url of [
  'https://t.me/prvodo',
  'https://max.ru/join/RlWmJZNJ0D2nzGDatRQMEMj9NQVpqPb1RMoDhCqFz_M',
  'https://solo-pr.ru',
  'https://raga.vodopetov.ru',
])assert.ok(shell.includes(url),'Missing footer destination: '+url);

for(const name of ['Telegram','MAX','Соло-Пиар','RAGA'])assert.ok(shell.includes(name),'Missing link label '+name);
assert.ok(!shell.includes('ContactLeadForm'),'Footer must not render contact form');
assert.ok(shell.indexOf('footer-socials') < shell.indexOf('className="email"'),'Social links must appear before email');
assert.ok(shell.indexOf('footer-projects') > shell.indexOf('className="email"'),'Projects must appear after email');
for(const file of ['public/assets/projects/solo-pr-mark.svg','public/assets/projects/raga-frog.png']) {
  const info=await stat(file);
  assert.ok(info.size>1000,'Expected original brand image: '+file);
}
assert.ok(css.includes('.footer-socials')&&css.includes('.footer-projects'),'Footer responsive styles are missing');
console.log('PASS: Footer and canonical vodopetov.ru links verified.');
