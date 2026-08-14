// Reading the Exposure Record at a given moment.

/**
 * The sample nearest a moment in time.
 *
 * Nearest rather than interpolated: these are point measurements taken every
 * half hour, and a value computed between two of them would be a reading the
 * device never took.
 *
 * @param {Array<{at: Date}>} samples in time order, and never empty — an
 *        Exposure Record with nothing in it is refused where it is built, so
 *        there is no such thing as a chart with no reading to point at
 * @param {Date} at the moment being read
 * @returns {object} the sample itself
 */
export function nearestSample(samples, at) {
    return samples.reduce((nearest, sample) =>
        Math.abs(sample.at - at) < Math.abs(nearest.at - at) ? sample : nearest);
}
