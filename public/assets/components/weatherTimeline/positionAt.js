// Where the hiker was at a given moment.

/**
 * The hiker's position at a moment, read off the Walking Windows.
 *
 * Inside a window the answer is the trackpoint nearest in time. Outside one it
 * is the preceding Camp — which is not a fallback but the correct answer, since
 * a Camp's position is the last trackpoint of the day that ended there.
 *
 * The moment must lie within the Trip Window, which runs from the first
 * trackpoint of the trip to the last: before that there is no Camp to hold at,
 * because the hiker had not yet been anywhere.
 *
 * @param {Array<{start: Date, end: Date, trackpoints: Array<{at: Date, latitude: number, longitude: number}>}>} walkingWindows
 * @param {Date} at the moment being asked about
 * @returns {{latitude: number, longitude: number, camp: boolean}}
 */
export function positionAt(walkingWindows, at) {
    const walking = walkingWindows.find(window => at >= window.start && at <= window.end);
    if (walking) return { ...place(nearestTrackpoint(walking.trackpoints, at)), camp: false };

    const preceding = walkingWindows.filter(window => window.end < at).pop();
    const trackpoints = preceding.trackpoints;
    return { ...place(trackpoints[trackpoints.length - 1]), camp: true };
}

function nearestTrackpoint(trackpoints, at) {
    return trackpoints.reduce((nearest, trackpoint) =>
        Math.abs(trackpoint.at - at) < Math.abs(nearest.at - at) ? trackpoint : nearest);
}

/** A trackpoint's position alone: its time answered a question already asked. */
function place({ latitude, longitude }) {
    return { latitude, longitude };
}
