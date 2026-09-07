// The trip's extreme readings, drawn from the Exposure Record.

/**
 * The coldest and warmest the trip got.
 *
 * `coldestWalking` is the reason this exists. It is the coldest reading taken
 * while the hiker was moving, and it is warmer than `coldest` because the
 * coldest hours of a trip happen at night, in Camp, with the watch off. The two
 * side by side are what stops the elevation profile's minimum — which can only
 * know Walking Windows — reading as a contradiction of this chart's.
 *
 * @param {Array<{instant: Date, wallTime: string, temperature: number}>} record
 *        the Exposure Record, already trimmed to the Trip Window
 * @param {Array<{start: Date, end: Date}>} walkingWindows
 * @returns {{coldest: object|null, coldestWalking: object|null, warmest: object|null}}
 *          the chosen samples themselves; null where the trip has no such
 *          reading, which for `coldestWalking` means a logger that only ever
 *          ran in Camp, and for the other two an empty record
 */
export function extremes(record, walkingWindows) {
    const walking = record.filter(sample => walkingWindows.some(
        window => sample.instant >= window.start && sample.instant <= window.end));

    return {
        coldest: coldestOf(record),
        coldestWalking: coldestOf(walking),
        warmest: warmestOf(record)
    };
}

// A trip whose logger never ran while the watch did has no walking reading to
// report. That is an answer, not a failure, so it is null rather than a throw:
// the rest of the chart is still worth drawing.
function coldestOf(samples) {
    return pick(samples, (coldest, sample) => sample.temperature < coldest.temperature);
}

function warmestOf(samples) {
    return pick(samples, (warmest, sample) => sample.temperature > warmest.temperature);
}

function pick(samples, beats) {
    return samples.reduce((chosen, sample) =>
        chosen === null || beats(chosen, sample) ? sample : chosen, null);
}
