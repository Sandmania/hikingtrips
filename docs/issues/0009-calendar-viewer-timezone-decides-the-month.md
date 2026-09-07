# 0009 — Calendar: the viewer's timezone decides which month renders

- **Type**: AFK
- **Status**: ready
- **Blocked by**: none — can start immediately

## Symptom

Six of the nineteen `HikingCalendar` tests fail when the viewer's clock is west
of UTC, and pass everywhere east of it:

```
Europe/London        19 passing, 0 failing
Asia/Tokyo           19 passing, 0 failing
America/New_York     13 passing, 6 failing
America/Los_Angeles  13 passing, 6 failing
```

One failure is the cause and five are its wreckage:

```
FAIL  getInitialYearMonth returns the year and month of the first event
      AssertionError: expected 6 to equal 7
FAIL  rendering renders a calendar table with the correct month caption
      AssertionError: expected 'June, 2025' to include 'July'
FAIL  rendering renders date cells for every day in the month
      AssertionError: expected 30 to equal 31
FAIL  rendering date cells carry a data-date attribute in YYYY-MM-DD format
FAIL  rendering a day with only one event type gets that type as a CSS class
FAIL  rendering a day with mixed events gets a gradient background
```

A reader in New York opens a trip beginning 1 July and gets a calendar of
**June** — thirty empty cells, not one day of the trip on it. Nothing errors and
nothing looks broken; the calendar just shows the wrong month, confidently.

Found while checking that the Weather Timeline work of issue 0003 was
timezone-independent. It reproduces with none of that work present and is not
caused by it.

## Mechanism 1 — a date string parsed one way and read back another

`getInitialYearMonth`, `calendar.js:49-58`:

```js
const firstDateStr = Object.keys(eventMap)[0];   // '2025-07-01'
const firstDate = new Date(firstDateStr);
return {
  year: firstDate.getFullYear(),                 // local
  month: firstDate.getMonth() + 1,               // local
};
```

ECMA-262 parses a **date-only** string as UTC and a date-time string without an
offset as **local**. So `new Date('2025-07-01')` is midnight *UTC*, and
`getMonth()` then reads it on the *viewer's* clock. Anywhere west of UTC that
instant is still 30 June:

```
Europe/Helsinki      month 7
America/New_York     month 6      ← 2025-06-30T20:00 local
America/Los_Angeles  month 6
```

`render` (`calendar.js:44-45`) passes that month straight to `renderCalendar`,
so a single hour's arithmetic decides the entire grid: the caption, the number
of cells, and — because every `data-date` is generated from the wrong month —
whether any trip event has a cell to land in at all.

**This is latent for the trips currently published.** It fires only when the
first event falls on the 1st of a month, and none of the five does:

| trip | first event |
|---|---|
| moskangaisi2026 | 2026-08-15 |
| muotka2025 | 2025-07-02 |
| paistunturi2024 | 2024-08-11 |
| repovesi2023 | 2023-06-22 |
| sarek2025 | 2025-07-18 |

One `trip_config.yaml` edit is all it takes. A trip starting 1 January would
also render the wrong *year*.

## Mechanism 2 — `Math.abs` on a signed offset

Independent of the above, and unconditional. `createDateWithTimezone`,
`calendar.js:447-458`:

```js
const date = new Date(Date.UTC(year, month, day));
const offsetHours = date.getTimezoneOffset() / 60;
const adjustedDate = new Date(
  date.getTime() + Math.abs(offsetHours) * 60 * 60 * 1000,   // sign discarded
);
```

`getTimezoneOffset()` is signed — positive west of UTC, negative east — and
`Math.abs` throws that away, so the correction is applied in the wrong direction
for half the world. West of UTC the two errors cancel and the result is exactly
local midnight, which is why this has never been noticed. East of UTC they
compound, and past +12 the sum carries into the next day:

```
                     cell number   data-date
America/New_York          15       2025-07-15
Europe/Helsinki           15       2025-07-15
Pacific/Kiritimati        16       2025-07-15   ← disagree
Pacific/Apia              16       2025-07-15
```

The cell prints `date.getDate()` (local, `calendar.js:397`) but stores
`date.toISOString()` (UTC, `calendar.js:398`). In UTC+13/+14 every cell shows a
number one day ahead of the date it actually means, so events land on
visibly wrong squares. Small audience, but it is wrong for all of them all of
the time, and it is the same confusion as mechanism 1 rather than a separate
idea.

## Not a bug: what the two `calculateHikeDateTimes` tests catch

```
FAIL  calculateHikeDateTimes sets hikeEnd to the earliest checkin date   (UTC-11)
FAIL  calculateHikeDateTimes sets hikeStart to the latest checkout date  (UTC+14)
```

These two fail only in the extreme zones, and the defect is in the **test**, not
the code:

```js
expect(hikeStart.toISOString().slice(0, 10)).to.equal('2025-07-02');
```

`calculateHikeDateTimes` builds its Dates from `'2025-07-02T10:00'` — a
date-time with no offset, so local — and everything downstream reads them back
with the local getters in `getLocalIsoDate`. The code is self-consistent. It is
the assertion that converts a local Date through UTC and expects the date to
survive, which it does not once the local time of day is within the offset of
midnight. Fix the assertion, not `calculateHikeDateTimes`. Whoever takes this
issue should be careful not to "fix" the correct side.

## The shape of the fix

These dates have no timezone and should never acquire one. A trip that starts on
2 July starts on 2 July for a reader in Helsinki and a reader in Los Angeles
alike — there is no instant involved, and no zone in which the answer differs.
The config states no offset because none is meant.

That makes this a different problem from the one CONTEXT.md and ADR-0002 settle
for the Exposure Record, and the difference is worth stating because the two
look alike. A sensor reading *is* an instant: it happened at one moment, the log
states a naive wall time, and `wallTimeToInstant` places it on the world clock
using the trip's zone. A calendar date is not an instant and needs no zone
resolved — it needs to stay a plain `YYYY-MM-DD` and be compared as one.
Reaching for `Intl` here would be answering a question nobody asked.

So the fix is to stop routing calendar dates through `Date` at all where a
string comparison will do:

1. **`getInitialYearMonth` should split the string**, not parse it —
   `firstDateStr.slice(0, 4)` and `.slice(5, 7)`. The keys are already
   `YYYY-MM-DD` and already sorted.
2. **`createDateWithTimezone` should go**, along with the `toISOString()` calls
   that consume it. `createCalendarCell` wants a day number and a `YYYY-MM-DD`
   key, both of which can be formed from `year`/`month`/`day` directly without a
   `Date` existing.
3. **`getEventsForAdjacentDate` (`calendar.js:242-247`)** mixes the same two
   conventions — local `setDate` then `toISOString` — and should be re-expressed
   against the same string keys. It happens to work today; it works for the same
   accidental reason as mechanism 2.

`buildEventMap` and `getLocalIsoDate` are already consistent and can stay as
they are.

## Reproducing

```bash
TZ=America/New_York node .devcontainer/run-tests.mjs --grep 'HikingCalendar'
TZ=Pacific/Kiritimati node .devcontainer/run-tests.mjs --grep 'HikingCalendar'
```

Chromium picks the zone up from the environment, so this needs no code change
and no browser setting. `Europe/Helsinki` and `Asia/Tokyo` are the controls —
both should stay green throughout.

The test fixture's first event is already 2025-07-01, which is why the suite
catches mechanism 1 even though no shipped trip triggers it. Keep it that way.

## Acceptance criteria

- [ ] The `HikingCalendar` suite passes in `Europe/Helsinki`, `America/New_York`,
      `America/Los_Angeles`, `Pacific/Kiritimati` and `Pacific/Apia`
- [ ] A trip whose first event is on the 1st of a month renders that month, in
      every zone above — covered by a fixture, since no published trip does this
- [ ] Every cell's printed number agrees with its own `data-date`
- [ ] The two `calculateHikeDateTimes` assertions are fixed on the test side,
      with `calculateHikeDateTimes` itself unchanged
- [ ] No calendar date is resolved through `Intl` or a zone — the fix removes
      `Date` from these paths rather than adding a zone to them

## Blocked by

None — can start immediately
