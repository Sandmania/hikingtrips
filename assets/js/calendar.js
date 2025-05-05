export function renderTripCalendar(travelInfo) {
  if (travelInfo) {
    const eventMap = buildEventMap(travelInfo);
    console.log(eventMap)
    renderCalendar(2025, 7, eventMap);
  }
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

function buildEventMap(travelInfo) {
  const allEvents = [];

  // 1. Collect all events from both directions
  allEvents.push(...extractEventsFromDirection(travelInfo.to));
  allEvents.push(...extractEventsFromDirection(travelInfo.from));

  // 2. Compute hike start/end dates
  const { hikeStart, hikeEnd } = calculateHikeDates(travelInfo);

  // 3. Insert hike events into the flat event list
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
    if (!eventMap[evt.date].includes(evt.type)) {
      eventMap[evt.date].push(evt.type);
    }
  }

  return eventMap;
}

function parseDateTime(dateStr, timeStr = '00:00') {
  return new Date(`${dateStr}T${timeStr}`);
}

function extractEventsFromDirection(directionArray) {
  const events = [];

  for (const segment of directionArray) {
    if (segment.train || segment.bus) {
      const transport = segment.train || segment.bus;
      events.push({
        date: transport.outboundDate,
        time: transport.outboundTime?.slice(0, 5),
        type: 'travel',
        isoDateTime: parseDateTime(transport.outboundDate, transport.outboundTime?.slice(0, 5)),
      });
    } else if (segment.accommodation) {
      const acc = segment.accommodation;

      // In 'to' use checkIn & checkOut as stay
      // In 'from' use checkIn & checkOut as stay too
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

function getCellClass(events, prevEvents, nextEvents) {
  if (events.length === 1) {
    const type = events[0];
    if (!prevEvents.length) {
      return `nothing-${type}`;
    } else if (!nextEvents.length) {
      return `${type}-nothing`;
    } else {
      return type;
    }
  } else if (events.length === 2) {
    const [a, b] = events;
    return `${a}-${b}`;
  } else if (events.length === 0) {
    return "nothing";
  }
  return "";
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

  let row = document.createElement("tr");

  // Empty cells before the first day
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement("td");
    emptyCell.classList.add("empty");
    row.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = createDateWithTimezone(year, month - 1, day);
    const iso = date.toISOString().slice(0, 10);
    const cell = document.createElement("td");
    cell.innerText = day;

    const events = eventMap[iso] || [];

    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevIso = prevDate.toISOString().slice(0, 10);
    const prevEvents = eventMap[prevIso] || [];

    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const nextIso = nextDate.toISOString().slice(0, 10);
    const nextEvents = eventMap[nextIso] || [];

    // Use the helper function to determine the cell class
    const cellClass = getCellClass(events, prevEvents, nextEvents);
    if (cellClass) {
      cell.classList.add(cellClass);
    }

    cell.classList.add("date-cell");
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

function createDateWithTimezone(year, month, day) {
  // Create base date
  const date = new Date(Date.UTC(year, month, day));
  
  // Adjust for timezone
  const offsetHours = date.getTimezoneOffset() / 60;
  const adjustedDate = new Date(date.getTime() + (Math.abs(offsetHours) * 60 * 60 * 1000));
  
  return adjustedDate;
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