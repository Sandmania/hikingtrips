export function renderTripCalendar(travelInfo) {
    const eventMap = buildEventMap(travelInfo);
    renderCalendar(2025, 7, eventMap);
}

function buildEventMap(travelInfo) {
    const allEvents = [];
  
    function parseDateTime(dateStr, timeStr = '00:00') {
      return new Date(`${dateStr}T${timeStr}`);
    }
  
    function extractEventsFromDirection(directionArray, directionType) {
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
  
    // 1. Collect all events from both directions
    allEvents.push(...extractEventsFromDirection(travelInfo.to, 'to'));
    allEvents.push(...extractEventsFromDirection(travelInfo.from, 'from'));
  
    // 2. Compute hike start/end dates based on stay boundaries
    let hikeStart = null;
    let hikeEnd = null;
  
    const toCheckoutDates = travelInfo.to
      .filter(e => e.accommodation)
      .map(e => new Date(e.accommodation.checkOutDate));
  
    const fromCheckinDates = travelInfo.from
      .filter(e => e.accommodation)
      .map(e => new Date(e.accommodation.checkInDate));
  
    if (toCheckoutDates.length && fromCheckinDates.length) {
      hikeStart = new Date(Math.max(...toCheckoutDates.map(d => d.getTime())));
      hikeEnd = new Date(Math.min(...fromCheckinDates.map(d => d.getTime())));
    }
  
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
      const date = new Date(year, month - 1, day);
      const iso = date.toISOString().split("T")[0];
      const cell = document.createElement("td");
      cell.innerText = day;
  
      const events = eventMap[iso] || [];
  
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - 1);
      const prevIso = prevDate.toISOString().split("T")[0];
      const prevEvents = eventMap[prevIso] || [];
  
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const nextIso = nextDate.toISOString().split("T")[0];
      const nextEvents = eventMap[nextIso] || [];
  
      if (events.length === 1) {
        const type = events[0];
        if (!prevEvents.length) {
          cell.classList.add(`nothing-${type}`);
        } else if (!nextEvents.length) {
          cell.classList.add(`${type}-nothing`);
        } else {
          cell.classList.add(type);
        }
      } else if (events.length === 2) {
        const [a, b] = events;
        cell.classList.add(`${a}-${b}`);
      } else if (events.length === 0) {
        cell.classList.add("nothing");
      }
  
      cell.classList.add("date-cell");
  
      row.appendChild(cell);
  
      if ((firstDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
        table.appendChild(row);
        row = document.createElement("tr");
      }
    }
  
    calendarEl.appendChild(table);
  }