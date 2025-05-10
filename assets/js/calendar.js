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
        isoDateTime: parseDateTime(acc.outboundDate, acc.outboundTime?.slice(0, 5)),
      });
      events.push({
        date: acc.checkOutDate,
        time: acc.checkOutTime,
        type: 'stay',
        name: acc.name,
        url: acc.url,
        isoDateTime: parseDateTime(acc.outboundDate, acc.outboundTime?.slice(0, 5)),
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

  // Add "nothing" as the first and last event only if:
  // - There are no previous events
  // - There are no next events
  // - The current day has at least one event
  if (!prevEvents.length && !nextEvents.length && events.length > 0) {
    events = [{ type: "nothing" }, ...events, { type: "nothing" }];
  }

  if (events.length > 1) {
    // Multiple events: Dynamically calculate gradient, skipping back-to-back duplicates
    const gradientStops = events
      .filter((event, index, arr) => index === 0 || event.type !== arr[index - 1].type) // Skip duplicates
      .map((event, index, filteredEvents) => {
        const start = (index / filteredEvents.length) * 100;
        const end = ((index + 1) / filteredEvents.length) * 100;
        return `${getEventColor(event.type)} ${start}% ${end}%`;
      })
      .join(", ");
    cell.style.background = `linear-gradient(115deg, ${gradientStops})`;
  } else if (events.length === 1) {
    // Single event: Use the event type as the class
    cell.classList.add(events[0].type);
  } else {
    // No events: Use "nothing" class
    cell.classList.add("nothing");
  }

  cell.classList.add("date-cell");

  // Attach event listeners for tooltip
  cell.addEventListener("mouseover", (e) => showEventTooltip(e, day, events));
  cell.addEventListener("mouseout", hideEventTooltip);
  cell.addEventListener("click", (e) => toggleEventTooltip(e, day, events));

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
  // Skip showing tooltip if all events are "nothing"
  if (events.length === 0 || (events.length === 1 && events[0].type === "nothing")) {
    return;
  }

  const tooltip = document.getElementById("event-tooltip");
  tooltip.innerHTML = generateEventDetailsHTML(day, events);

  // Set initial position near the mouse pointer
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;

  // Make the tooltip visible to calculate its dimensions
  tooltip.classList.remove("hidden");
  tooltip.classList.add("visible");

  // Get tooltip dimensions and viewport dimensions
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Adjust position if the tooltip goes outside the viewport
  let adjustedLeft = event.pageX + 10;
  let adjustedTop = event.pageY + 10;

  if (tooltipRect.right > viewportWidth) {
    adjustedLeft = event.pageX - tooltipRect.width - 10; // Move to the left
  }
  if (tooltipRect.bottom > viewportHeight) {
    adjustedTop = event.pageY - tooltipRect.height - 10; // Move above
  }
  if (tooltipRect.left < 0) {
    adjustedLeft = 10; // Align to the left edge of the viewport
  }
  if (tooltipRect.top < 0) {
    adjustedTop = 10; // Align to the top edge of the viewport
  }

  // Apply adjusted position
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

function generateEventDetailsHTML(day, events) {
  const eventDetails = events
    .map((event) => {
      const time = event.time ? `<strong>${event.time}</strong>` : "Time not specified";
      const type = capitalizeFirstLetter(event.type);
      const fromTo = event.from && event.to ? `<div><strong>From:</strong> ${event.from} <strong>To:</strong> ${event.to}</div>` : "";
      const location = event.name ? `<div><strong>Location:</strong> ${event.name}</div>` : "";
      const link = event.url
        ? `<div><a href="${event.url}" target="_blank" style="color: #2980b9; text-decoration: none;">View Details</a></div>`
        : "";

      return `
        <li style="margin-bottom: 10px;">
          <div><strong>${type}</strong></div>
          <div>${time}</div>
          ${fromTo}
          ${location}
          ${link}
        </li>
      `;
    })
    .join("");

  return `<strong>${day}</strong><br><ul style="list-style: none; padding: 0;">${eventDetails}</ul>`;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}