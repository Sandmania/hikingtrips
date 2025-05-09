export function renderTripCalendar(travelInfo) {
  if (travelInfo) {
    const eventMap = buildEventMap(travelInfo);
    console.log(eventMap)
    renderCalendar(2025, 7, eventMap);
  }
}

function buildEventMap(travelInfo) {
  const allEvents = [];

  // 1. Collect all events from both directions
  allEvents.push(...extractEventsFromDirection(travelInfo.to));
  allEvents.push(...extractEventsFromDirection(travelInfo.from));

  // 2. Compute hike start/end dates
  const { hikeStart, hikeEnd } = calculateHikeDates(travelInfo);

  // 3. Insert hike events into the flat event list
  // TODO FIXME: Hike events have a hardcoded time of 13:00
  // This is because accommodation check-in is usually at 15:00
  // and check-out is usually at 12:00, so 13:00 sits between those
  if (hikeStart && hikeEnd && hikeStart < hikeEnd) {
    const dateCursor = new Date(hikeStart);
    while (dateCursor <= hikeEnd) {
      const dateStr = dateCursor.toISOString().slice(0, 10);
      allEvents.push({
        date: dateStr,
        time: '13:00',
        type: 'hike',
        isoDateTime: parseDateTime(dateStr, '13:00'),
      });
      dateCursor.setDate(dateCursor.getDate() + 1);
    }
  }

  // 4. Sort all events by datetime
  allEvents.sort((a, b) => a.isoDateTime - b.isoDateTime);

  // 5. Build eventMap with arrays preserving order
  const eventMap = {};

  for (const evt of allEvents) {
    if (!eventMap[evt.date]) {
      eventMap[evt.date] = [];
    }
    // Avoid duplicate back-to-back events, this makes it visually cleaner
    const lastEventType = eventMap[evt.date][eventMap[evt.date].length - 1];
    if (lastEventType !== evt.type) {
      eventMap[evt.date].push(evt.type);
    }
  }

  return eventMap;
}

function extractEventsFromDirection(directionArray) {
  const events = [];

  for (const segment of directionArray) {
    if (segment.transportation) {
      const transport = segment.transportation;
      events.push({
        date: transport.outboundDate,
        time: transport.outboundTime?.slice(0, 5),
        type: 'travel',
        isoDateTime: parseDateTime(transport.outboundDate, transport.outboundTime?.slice(0, 5)),
      });
    } else if (segment.accommodation) {
      const acc = segment.accommodation;

      // Add check-in and check-out as stay events
      events.push({
        date: acc.checkInDate,
        time: acc.checkInTime,
        type: 'stay',
        isoDateTime: parseDateTime(acc.checkInDate, acc.checkInTime),
      });
      events.push({
        date: acc.checkOutDate,
        time: acc.checkOutTime,
        type: 'stay',
        isoDateTime: parseDateTime(acc.checkOutDate, acc.checkOutTime),
      });
    }
  }

  return events;
}

function parseDateTime(dateStr, timeStr = '00:00') {
  return new Date(`${dateStr}T${timeStr}`);
}

function calculateHikeDates(travelInfo) {
  const toCheckoutDates = travelInfo.to
    .filter(e => e.accommodation)
    .map(e => new Date(e.accommodation.checkOutDate));

  const fromCheckinDates = travelInfo.from
    .filter(e => e.accommodation)
    .map(e => new Date(e.accommodation.checkInDate));

  if (toCheckoutDates.length && fromCheckinDates.length) {
    const hikeStart = new Date(Math.max(...toCheckoutDates.map(d => d.getTime())));
    const hikeEnd = new Date(Math.min(...fromCheckinDates.map(d => d.getTime())));
    return { hikeStart, hikeEnd };
  }

  return { hikeStart: null, hikeEnd: null };
}

function getEventsForAdjacentDate(eventMap, baseDate, offset) {
  const adjacentDate = new Date(baseDate);
  adjacentDate.setDate(baseDate.getDate() + offset);
  const iso = adjacentDate.toISOString().slice(0, 10);
  return eventMap[iso] || [];
}

function renderCalendar(year, month, eventMap) {
  const calendarEl = document.getElementById("calendar-container");
  calendarEl.innerHTML = "";

  const daysInMonth = new Date(year, month, 0).getDate();
  let firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  firstDayOfWeek = (firstDayOfWeek + 6) % 7;

  const table = document.createElement("table");
  table.classList.add("calendar");
  const headerRow = document.createElement("tr");
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
    const th = document.createElement("th");
    th.innerText = day;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  let row = createEmptyCells(firstDayOfWeek);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = createDateWithTimezone(year, month - 1, day);
    const iso = date.toISOString().slice(0, 10);

    const events = eventMap[iso] || [];
    const prevEvents = getEventsForAdjacentDate(eventMap, date, -1);
    const nextEvents = getEventsForAdjacentDate(eventMap, date, 1);

    const cell = createCalendarCell(day, events, prevEvents, nextEvents);
    row.appendChild(cell);

    if ((firstDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
      table.appendChild(row);
      row = document.createElement("tr");
    }
  }

  const container2 = document.createElement("div");
  container2.classList.add("calendar-container2");
  container2.appendChild(table);
  container2.insertAdjacentHTML("beforeend", calendarLegend);
  calendarEl.appendChild(container2);
}

function createCalendarCell(day, events, prevEvents, nextEvents) {
  const cell = document.createElement("td");
  cell.innerText = day;

  // Add "nothing" as the first event if there are no previous events
  if (!prevEvents.length) {
    events = ["nothing", ...events];
  }

  // Add "nothing" as the last event if there are no next events
  if (!nextEvents.length) {
    events = [...events, "nothing"];
  }

  if (events.length > 1) {
    // Multiple events: Dynamically calculate gradient
    const gradientStops = events
      .map((event, index) => {
        const start = (index / events.length) * 100;
        const end = ((index + 1) / events.length) * 100;
        return `${getEventColor(event)} ${start}% ${end}%`;
      })
      .join(", ");
    cell.style.background = `linear-gradient(115deg, ${gradientStops})`;
  } else if (events.length === 1) {
    // Single event: Use the event type as the class
    cell.classList.add(events[0]);
  } else {
    // No events: Use "nothing" class
    cell.classList.add("nothing");
  }

  cell.classList.add("date-cell");
  return cell;
}

function getEventColor(event) {
  const colors = {
    travel: "#6BA9E6",
    stay: "#F5A623",
    hike: "#79CC1F",
  };
  return colors[event] || "#D8F3DC";
}

function createDateWithTimezone(year, month, day) {
  // Create base date
  const date = new Date(Date.UTC(year, month, day));
  
  // Adjust for timezone
  const offsetHours = date.getTimezoneOffset() / 60;
  const adjustedDate = new Date(date.getTime() + (Math.abs(offsetHours) * 60 * 60 * 1000));
  
  return adjustedDate;
}

function createEmptyCells(count) {
  const row = document.createElement("tr");
  for (let i = 0; i < count; i++) {
    const emptyCell = document.createElement("td");
    emptyCell.classList.add("empty");
    row.appendChild(emptyCell);
  }
  return row;
}

const calendarLegend = `
<div class="legend">
  <div class="legend-item"><div class="legend-color nothing"></div> Nothing</div>
  <div class="legend-item"><div class="legend-color travel"></div> Travel</div>
  <div class="legend-item"><div class="legend-color stay"></div> Stay</div>
  <div class="legend-item"><div class="legend-color hike"></div> Hike</div>
  <div class="legend-item"><div class="legend-color travel-stay"></div> Mixed</div>
</div>
  `;