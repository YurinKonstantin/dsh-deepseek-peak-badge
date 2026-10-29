import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
const start = source.indexOf('// === peak-schedule-start ===');
const end = source.indexOf('// === peak-schedule-end ===');
if (start < 0 || end < 0) throw new Error('schedule markers not found');
const schedule = source.slice(start, end);
const exported = runInNewContext(schedule + '\n;({ computePhase, beijingClock });', {});

const cases = [];
function at(utcIso) {
  return Date.parse(utcIso);
}
function check(label, utcIso, expected) {
  const got = exported.computePhase(at(utcIso));
  const failed = Object.keys(expected).find((key) => got[key] !== expected[key]);
  if (failed !== undefined) {
    throw new Error(
      `${label}: ${failed} expected ${JSON.stringify(expected[failed])}, got ${JSON.stringify(got[failed])} (${JSON.stringify(got)})`,
    );
  }
  cases.push(label);
}

// Thursday 2026-10-29: Beijing 12:30 (gap 12:00–14:00) — off-peak, next start 14:00 Beijing.
check('weekday gap is off-peak', '2026-10-29T04:30:00Z', { level: 'off', startsAt: at('2026-10-29T06:00:00Z') });
check('peak 11:59 Beijing', '2026-10-29T03:59:00Z', { level: 'peak', endsAt: at('2026-10-29T04:00:00Z') });
check('12:00 Beijing leaves peak', '2026-10-29T04:00:00Z', { level: 'off', startsAt: at('2026-10-29T06:00:00Z') });
check('13:29 Beijing is quiet', '2026-10-29T05:29:00Z', { level: 'off' });
check('13:30 Beijing warns with 30 min', '2026-10-29T05:30:00Z', { level: 'warn', minutes: 30 });
check('13:31 Beijing warns with 29 min', '2026-10-29T05:31:00Z', { level: 'warn', minutes: 29 });
check('14:00 Beijing is peak', '2026-10-29T06:00:00Z', { level: 'peak', endsAt: at('2026-10-29T10:00:00Z') });
check('08:59 Beijing warns before first block', '2026-10-29T00:59:00Z', { level: 'warn', minutes: 1 });
check('08:00 Beijing is quiet before first block', '2026-10-29T00:00:00Z', { level: 'off', startsAt: at('2026-10-29T01:00:00Z') });

// Friday 18:00 Beijing — off-peak, next peak Monday 09:00 Beijing.
check('friday evening targets monday', '2026-10-30T10:00:00Z', { level: 'off', startsAt: at('2026-11-02T01:00:00Z') });
// Saturday — weekend all day off-peak.
check('saturday is weekend off-peak', '2026-10-31T06:00:00Z', { level: 'off', weekend: true, startsAt: at('2026-11-02T01:00:00Z') });
// Chinese statutory holidays: Oct 1–7 2026. Thursday Oct 1 11:00 Beijing.
check('statutory holiday is off-peak', '2026-10-01T03:00:00Z', { level: 'off', holiday: true, startsAt: at('2026-10-08T01:00:00Z') });
check('after holiday is peak again', '2026-10-08T01:00:00Z', { level: 'peak' });
// Sunday inside the holiday window stays off-peak.
check('holiday sunday is off-peak', '2026-10-04T03:00:00Z', { level: 'off' });

console.log(`ok: ${cases.length} schedule cases`);
