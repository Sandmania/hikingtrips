// The actual route: the track a watch recorded while the hiker was moving.
//
// Read once, because the file is large and three readings are wanted from it:
// the Walking Windows, the Trip Window they span, and every trackpoint's time
// and position.

/**
 * Read the actual route into its Walking Windows and the Trip Window they span.
 *
 * A Walking Window is a contiguous span of recording, which in GPX is exactly a
 * `<trkseg>`. Reading segments rather than tracks covers both shapes the merged
 * exports come in: one `<trk>` per day, and one `<trk>` holding a segment per
 * day — which is what muotka2025's combined.gpx actually is.
 *
 * @param {string} gpxText the actual route, verbatim
 * @returns {{walkingWindows: Array<{day: number, start: Date, end: Date,
 *            trackpoints: Array<{at: Date, latitude: number, longitude: number}>}>,
 *           tripWindow: {start: Date, end: Date}}}
 */
export function parseActualRoute(gpxText) {
    const doc = new DOMParser().parseFromString(gpxText, 'application/xml');

    const walkingWindows = Array.from(doc.getElementsByTagName('trkseg'))
        .map(segment => Array.from(segment.getElementsByTagName('trkpt'))
            .map(trkpt => ({
                at: new Date(trkpt.getElementsByTagName('time')[0]?.textContent ?? ''),
                latitude: parseFloat(trkpt.getAttribute('lat')),
                longitude: parseFloat(trkpt.getAttribute('lon'))
            }))
            // An untimed trackpoint cannot bound a window, and a segment of
            // nothing but those is not a window at all.
            .filter(trackpoint => !Number.isNaN(trackpoint.at.getTime())))
        .filter(trackpoints => trackpoints.length > 0)
        .map(trackpoints => ({
            start: trackpoints[0].at,
            end: trackpoints[trackpoints.length - 1].at,
            trackpoints
        }))
        // The days are numbered by when they were walked, not by where they sit
        // in the file, which is only the order the watch exports happened to be
        // merged in.
        .sort((a, b) => a.start - b.start)
        .map((window, index) => ({ day: index + 1, ...window }));

    if (walkingWindows.length === 0) {
        throw new Error('Actual route has no timed trackpoints, so the trip has no Trip Window');
    }

    // Per ADR-0002 the track, not the sensor, says when the trip happened; and
    // per CONTEXT.md the Trip Window runs from the first Walking Window's start
    // to the last one's end. GPX trackpoint times are already UTC.
    return {
        walkingWindows,
        tripWindow: {
            start: walkingWindows[0].start,
            end: walkingWindows[walkingWindows.length - 1].end
        }
    };
}
