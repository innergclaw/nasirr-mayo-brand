import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./Code.gs', import.meta.url), 'utf8');

assert.match(source, /MailApp\.sendEmail\(/);
assert.match(source, /OwnYourWeb for INNERG INTEL/);
assert.match(source, /WEBHOOK_SECRET/);
assert.match(source, /Your INNERG ID is active/);
assert.match(source, /https:\/\/nasirr\.innergintel\.org\/innerg-id\//);
assert.doesNotMatch(source, /service[_-]?role/i);
assert.doesNotMatch(source, /AIza|sk_live_|whsec_/);

console.log('INNERG welcome email checks passed.');
