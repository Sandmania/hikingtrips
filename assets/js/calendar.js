export function renderTripCalendar(travelInfo) {
  if (travelInfo) {
    const eventMap = buildEventMap(travelInfo);
    console.log(eventMap);

    // Get the first date from eventMap keys (sorted by buildEventMap)
    const firstDateStr = Object.keys(eventMap)[0];
    let year, month;
    if (firstDateStr) {
      const firstDate = new Date(firstDateStr);
      year = firstDate.getFullYear();
      month = firstDate.getMonth() + 1;
    } else {
      // fallback to current month/year
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    renderCalendar(year, month, eventMap);
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
  if (hikeStart && hikeEnd && hikeStart < hikeEnd) {
    const dateCursor = new Date(hikeStart);
    while (dateCursor <= hikeEnd) {
      const dateStr = dateCursor.toISOString().slice(0, 10);
      allEvents.push({
        date: dateStr,
        time: '13:30',
        type: 'hike',
        isoDateTime: parseDateTime(dateStr, '13:30'),
      });
      dateCursor.setDate(dateCursor.getDate() + 1);
    }
  }

  // 4. Sort all events by datetime
  allEvents.sort((a, b) => a.isoDateTime - b.isoDateTime);

  // 5. Build eventMap with arrays of full event objects
  const eventMap = {};

  for (const evt of allEvents) {
    if (!eventMap[evt.date]) {
      eventMap[evt.date] = [];
    }
    // Add all events without filtering duplicates
    eventMap[evt.date].push(evt);
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
        vehicle: transport.type,
        from: transport.from,
        to: transport.to,
        url: transport.url,
        isoDateTime: parseDateTime(transport.outboundDate, transport.outboundTime?.slice(0, 5)),
      });
    } else if (segment.accommodation) {
      const acc = segment.accommodation;

      // Add check-in and check-out as stay events
      events.push({
        date: acc.checkInDate,
        time: acc.checkInTime,
        type: 'stay',
        name: acc.name,
        url: acc.url,
        isoDateTime: parseDateTime(acc.checkInDate, acc.checkInTime?.slice(0, 5)),
      });
      events.push({
        date: acc.checkOutDate,
        time: acc.checkOutTime,
        type: 'stay',
        name: acc.name,
        url: acc.url,
        isoDateTime: parseDateTime(acc.checkOutDate, acc.checkOutTime?.slice(0, 5)),
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

    const cell = createCalendarCell(date, events, prevEvents, nextEvents);
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

function createCalendarCell(date, events, prevEvents, nextEvents) {
  const cell = document.createElement("td");

  cell.innerText = date.getDate();
  cell.dataset.date = date.toISOString().slice(0, 10); // Add full date as a data attribute

  // Add "nothing" as the first and last event only if:
  if (events.length > 0) {
    if (!prevEvents.length) {
      events = ["nothing", ...events];
    }
    if (!nextEvents.length) {
      events = [...events, "nothing"];
    }
  }

  if (events.length > 1) {
    const gradientStops = events
      .filter((event, index, arr) => index === 0 || event.type !== arr[index - 1].type)
      .map((event, index, filteredEvents) => {
        const start = (index / filteredEvents.length) * 100;
        const end = ((index + 1) / filteredEvents.length) * 100;
        return `${getEventColor(event.type)} ${start}% ${end}%`;
      })
      .join(", ");
    cell.style.background = `linear-gradient(115deg, ${gradientStops})`;
  } else if (events.length === 1) {
    cell.classList.add(events[0].type);
  } else {
    cell.classList.add("nothing");
  }

  cell.classList.add("date-cell");

  // Attach event listeners for tooltip
  cell.addEventListener("mouseover", (e) => showEventTooltip(e, date, events));
  cell.addEventListener("mouseout", hideEventTooltip);
  cell.addEventListener("click", (e) => toggleEventTooltip(e, date, events));

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

function showEventTooltip(event, day, events) {
  if (events.length === 0) {
    return;
  }

  const tooltip = document.getElementById("event-tooltip");

  // Create a Date object for the current day
  const currentDate = new Date(event.target.dataset.date); // Assuming the cell has a `data-date` attribute
  tooltip.innerHTML = generateEventDetailsHTML(currentDate, events);

  // Set initial position near the mouse pointer
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;

  // Make the tooltip visible to calculate its dimensions
  tooltip.classList.remove("hidden");
  tooltip.classList.add("visible");

  // Adjust position if the tooltip goes outside the viewport
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let adjustedLeft = event.pageX + 10;
  let adjustedTop = event.pageY + 10;

  if (tooltipRect.right > viewportWidth) {
    adjustedLeft = event.pageX - tooltipRect.width - 10;
  }
  if (tooltipRect.bottom > viewportHeight) {
    adjustedTop = event.pageY - tooltipRect.height - 10;
  }
  if (tooltipRect.left < 0) {
    adjustedLeft = 10;
  }
  if (tooltipRect.top < 0) {
    adjustedTop = 10;
  }

  tooltip.style.left = `${adjustedLeft}px`;
  tooltip.style.top = `${adjustedTop}px`;
}

function hideEventTooltip() {
  const tooltip = document.getElementById("event-tooltip");
  tooltip.classList.remove("visible");
  tooltip.classList.add("hidden");
}

function toggleEventTooltip(event, day, events) {
  // Skip toggling tooltip if all events are "nothing"
  if (events.length === 0) {
    return;
  }

  const tooltip = document.getElementById("event-tooltip");
  if (tooltip.classList.contains("visible")) {
    hideEventTooltip();
  } else {
    showEventTooltip(event, day, events);
  }
}

function generateEventDetailsHTML(date, events) {
  const formattedDate = formatDate(date); // Format the date as "day.month."

  const eventDetails = events
    .filter((event) => event !== "nothing")
    .map((event) => {
      const time = event.time ? `<div><strong>Time:</strong> ${event.time}</div>` : `<div><strong>Time:</strong> Not specified</div>`;
      const type = `<div><strong>Type:</strong> <span style="color: ${getEventColor(event.type)};">${capitalizeFirstLetter(event.type)}</span></div>`;
      const fromTo = event.from && event.to ? `<div><strong>From:</strong> ${event.from} <strong>To:</strong> ${event.to}</div>` : "";
      const location = event.name ? `<div><strong>Location:</strong> ${event.name}</div>` : "";

      return `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
          ${type}
          ${time}
          ${fromTo}
          ${location}
        </div>
      `;
    })
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background-color: white; max-width: 300px;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${formattedDate}</div>
      ${eventDetails || "<div>No events for this day.</div>"}
    </div>
  `;
}

// Helper function to format the date as "day.month."
function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are zero-based
  return `${day}.${month}.`;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}