// What sits at the same spot on the map, and what that spot has to say.
//
// A trip's waypoints are placed by where the hiker was, not by where there is
// room to draw them: photos taken minutes apart are metres apart, and a photo
// taken at camp is metres from the waypoint marking that camp. Their icons are
// a fixed size whatever the zoom, so those waypoints overlap, and an overlapped
// icon cannot be hovered — the one on top takes the pointer.
//
// Rather than push them off the position they are making a claim about, spots
// that crowd each other are drawn as one, and that one speaks for all of them.
// The GPX already models a busy spot this way: a single <wpt> can carry several
// photos.

/**
 * Group points that would be drawn on top of each other.
 *
 * Greedy against a fixed anchor rather than single-link: chaining every point
 * within reach of any group member would swallow a whole line of photos strung
 * along the track into one blob, because each is close to the next. Holding the
 * anchor still keeps a group no wider than the icon it is drawn as.
 *
 * @param {Array<{x: number, y: number}>} points positions in screen pixels
 * @param {number} minSeparation how far apart two icons must be to stand alone
 * @returns {Array<Array<Object>>} the points, in groups, in the order given
 */
export function groupByProximity(points, minSeparation) {
    const crowded = minSeparation * minSeparation;
    const groups = [];

    for (const point of points) {
        const group = groups.find(({ anchor }) => squaredDistance(anchor, point) < crowded);
        if (group) group.members.push(point);
        else groups.push({ anchor: point, members: [point] });
    }

    return groups.map(group => group.members);
}

function squaredDistance(one, other) {
    const dx = one.x - other.x;
    const dy = one.y - other.y;
    return dx * dx + dy * dy;
}

/**
 * What a group of waypoints shows when it is hovered.
 *
 * Every photo in the group goes into one `.image-grid`, not one grid per
 * waypoint: three photos of the same view are one three-up grid, which is what
 * the grid is for and what a single <wpt> carrying several photos already
 * renders as. Names — "Leg 3" and the like — head the grid, so a camp with
 * photos taken at it still says which camp it is.
 *
 * @param {Array<{sym: string, name: string, desc: string}>} waypoints one spot's waypoints
 * @returns {{html: string, items: number, hasPhoto: boolean, hasCamp: boolean}}
 *          what to draw, how many separate things it shows, and what kinds of
 *          thing those are
 */
export function mergeGroupContent(waypoints) {
    const headings = [];
    const thumbnails = [];
    const rest = [];

    for (const waypoint of waypoints) {
        const name = (waypoint.name ?? '').trim();
        if (name) headings.push(name);

        const description = (waypoint.desc ?? '').trim();
        if (!description) continue;

        const body = new DOMParser().parseFromString(description, 'text/html').body;
        body.querySelectorAll('.image-grid').forEach(grid => {
            thumbnails.push(...Array.from(grid.children).map(child => child.outerHTML));
            grid.remove();
        });
        // A description that is not a photo grid is something the trip meant to
        // say, so it is kept rather than dropped for not fitting the shape.
        const leftover = body.innerHTML.trim();
        if (leftover) rest.push(leftover);
    }

    const parts = [
        headings.map(heading => `<b>${escaped(heading)}</b>`).join('<br>'),
        thumbnails.length ? `<div class="image-grid">${thumbnails.join('')}</div>` : '',
        ...rest
    ].filter(Boolean);

    return {
        html: parts.join('<br>'),
        // Counted as what the hover shows, so the badge on the icon and the
        // content behind it can never disagree.
        items: headings.length + thumbnails.length,
        hasPhoto: waypoints.some(waypoint => waypoint.sym === 'Photo'),
        // A named waypoint is a camp — "Leg 3", "Camp 5", "Ze end", depending
        // on the trip. Which is why this asks whether there is a name at all
        // rather than reading one: the naming is the hiker's, not a format.
        hasCamp: headings.length > 0
    };
}

function escaped(text) {
    const holder = document.createElement('span');
    holder.textContent = text;
    return holder.innerHTML;
}
