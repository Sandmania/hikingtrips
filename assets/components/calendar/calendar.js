// Export for backward compatibility
export function renderTripCalendar(travelInfo) {
  const calendar = document.querySelector("hiking-calendar");
  if (calendar) {
    calendar.setTravelInfo(travelInfo);
  }
}

// Web Component Definition
class HikingCalendar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.travelInfo = null;
    this.isVisible = false;
  }

  connectedCallback() {
    this.render();
  }

  setTravelInfo(travelInfo) {
    this.travelInfo = travelInfo;
    this.render();
  }

  render() {
    if (this.travelInfo) {
      const eventMap = this.buildEventMap(this.travelInfo);
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

      this.renderCalendar(year, month, eventMap);
    }
  }

  buildEventMap(travelInfo) {
    const allEvents = [];

    // 1. Collect all events from both directions
    allEvents.push(...this.extractEventsFromDirection(travelInfo.to));
    allEvents.push(...this.extractEventsFromDirection(travelInfo.from));

    // 2. Compute hike start/end dates
    const { hikeStart, hikeEnd } = this.calculateHikeDateTimes(travelInfo);

    // 3. Insert hike events into the flat event list
    if (hikeStart && hikeEnd && hikeStart < hikeEnd) {
      let dateCursor = new Date(hikeStart);
      const endDateStr = this.getLocalIsoDate(hikeEnd);
      while (this.getLocalIsoDate(dateCursor) <= endDateStr) {
        const dateStr = this.getLocalIsoDate(dateCursor);
        let time = "09:00";
        if (dateStr === this.getLocalIsoDate(hikeStart)) {
          time = this.getLocalIsoTime(this.addMinutes(hikeStart, 15));
        } else if (dateStr === this.getLocalIsoDate(hikeEnd)) {
          time = this.getLocalIsoTime(this.addMinutes(hikeEnd, -120));
        }
        allEvents.push({
          date: dateStr,
          time,
          type: "hike",
          isoDateTime: this.parseDateTime(dateStr, time),
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

  extractEventsFromDirection(directionArray) {
    const events = [];

    for (const segment of directionArray) {
      if (segment.transportation) {
        const transport = segment.transportation;
        events.push({
          date: transport.outboundDate,
          time: transport.outboundTime?.slice(0, 5),
          type: "travel",
          vehicle: transport.type,
          from: transport.from,
          to: transport.to,
          url: transport.url,
          isoDateTime: this.parseDateTime(
            transport.outboundDate,
            transport.outboundTime?.slice(0, 5),
          ),
        });
      } else if (segment.accommodation) {
        const acc = segment.accommodation;

        // Add check-in and check-out as stay events
        events.push({
          date: acc.checkInDate,
          time: acc.checkInTime,
          type: "stay",
          name: acc.name,
          url: acc.url,
          isoDateTime: this.parseDateTime(
            acc.checkInDate,
            acc.checkInTime?.slice(0, 5),
          ),
        });
        events.push({
          date: acc.checkOutDate,
          time: acc.checkOutTime,
          type: "stay",
          name: acc.name,
          url: acc.url,
          isoDateTime: this.parseDateTime(
            acc.checkOutDate,
            acc.checkOutTime?.slice(0, 5),
          ),
        });
      }
    }

    return events;
  }

  parseDateTime(dateStr, timeStr = "00:00") {
    return new Date(`${dateStr}T${timeStr}`);
  }

  calculateHikeDateTimes(travelInfo) {
    const getDateTime = (obj, dateKey, timeKey) => {
      const date = obj[dateKey];
      const time = obj[timeKey] ? obj[timeKey].slice(0, 5) : "00:00";
      return new Date(`${date}T${time}`);
    };

    // Flatten all events with date+time from 'to'
    const toEvents = travelInfo.to
      .flatMap((e) => {
        if (e.transportation) {
          return [
            {
              date: e.transportation.outboundDate,
              time: e.transportation.outboundTime,
              obj: e,
            },
          ];
        }
        if (e.accommodation) {
          return [
            {
              date: e.accommodation.checkOutDate,
              time: e.accommodation.checkOutTime,
              obj: e,
            },
          ];
        }
        return [];
      })
      .filter((e) => e.date);

    // Flatten all events with date+time from 'from'
    const fromEvents = travelInfo.from
      .flatMap((e) => {
        if (e.transportation) {
          return [
            {
              date: e.transportation.outboundDate,
              time: e.transportation.outboundTime,
              obj: e,
            },
          ];
        }
        if (e.accommodation) {
          return [
            {
              date: e.accommodation.checkInDate,
              time: e.accommodation.checkInTime,
              obj: e,
            },
          ];
        }
        return [];
      })
      .filter((e) => e.date);

    // Find the last 'to' event by datetime
    const lastTo = toEvents.length
      ? toEvents.reduce((a, b) =>
          getDateTime(a, "date", "time") > getDateTime(b, "date", "time")
            ? a
            : b,
        )
      : null;

    // Find the first 'from' event by datetime
    const firstFrom = fromEvents.length
      ? fromEvents.reduce((a, b) =>
          getDateTime(a, "date", "time") < getDateTime(b, "date", "time")
            ? a
            : b,
        )
      : null;

    const hikeStart = lastTo ? getDateTime(lastTo, "date", "time") : null;
    const hikeEnd = firstFrom ? getDateTime(firstFrom, "date", "time") : null;

    return { hikeStart, hikeEnd };
  }

  getEventsForAdjacentDate(eventMap, baseDate, offset) {
    const adjacentDate = new Date(baseDate);
    adjacentDate.setDate(baseDate.getDate() + offset);
    const iso = adjacentDate.toISOString().slice(0, 10);
    return eventMap[iso] || [];
  }

  renderCalendar(year, month, eventMap) {
    const container = document.createElement("div");
    container.className = "calendar-container2";

    const daysInMonth = new Date(year, month, 0).getDate();
    let firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    firstDayOfWeek = (firstDayOfWeek + 6) % 7;

    const table = document.createElement("table");
    table.classList.add("calendar");

    // Add caption for month and year
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const caption = document.createElement("caption");
    caption.classList.add("calendar-header");
    caption.textContent = `${monthNames[month - 1]}, ${year}`;
    table.appendChild(caption);

    const headerRow = document.createElement("tr");
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((day) => {
      const th = document.createElement("th");
      th.innerText = day;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    let row = this.createEmptyCells(firstDayOfWeek);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = this.createDateWithTimezone(year, month - 1, day);
      const iso = date.toISOString().slice(0, 10);

      const events = eventMap[iso] || [];
      const prevEvents = this.getEventsForAdjacentDate(eventMap, date, -1);
      const nextEvents = this.getEventsForAdjacentDate(eventMap, date, 1);

      const cell = this.createCalendarCell(
        date,
        events,
        prevEvents,
        nextEvents,
      );
      row.appendChild(cell);

      if ((firstDayOfWeek + day) % 7 === 0 || day === daysInMonth) {
        table.appendChild(row);
        row = document.createElement("tr");
      }
    }

    container.appendChild(table);

    // Add legend
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `
      <div class="legend-item"><div class="legend-color nothing"></div> Nothing</div>
      <div class="legend-item"><div class="legend-color travel"></div> Travel</div>
      <div class="legend-item"><div class="legend-color stay"></div> Stay</div>
      <div class="legend-item"><div class="legend-color hike"></div> Hike</div>
      <div class="legend-item"><div class="legend-color travel-stay"></div> Mixed</div>
    `;
    container.appendChild(legend);

    // Create tooltip element
    const tooltip = document.createElement("div");
    tooltip.className = "event-tooltip hidden";
    tooltip.id = "event-tooltip";

    this.shadowRoot.innerHTML =
      '<link rel="stylesheet" href="../assets/components/calendar/calendar.css">';
    this.shadowRoot.appendChild(container);
    this.shadowRoot.appendChild(tooltip);

    // Attach event listeners to cells after rendering
    this.shadowRoot.querySelectorAll(".date-cell").forEach((cell) => {
      cell.addEventListener("mouseover", (e) =>
        this.showEventTooltip(e, cell.dataset.date),
      );
      cell.addEventListener("mouseout", () => this.hideEventTooltip());
      cell.addEventListener("click", (e) =>
        this.toggleEventTooltip(e, cell.dataset.date),
      );
    });
  }

  createCalendarCell(date, events, prevEvents, nextEvents) {
    const cell = document.createElement("td");

    cell.innerText = date.getDate();
    cell.dataset.date = date.toISOString().slice(0, 10);
    cell.dataset.events = JSON.stringify(events);

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
        .filter(
          (event, index, arr) =>
            index === 0 || event.type !== arr[index - 1].type,
        )
        .map((event, index, filteredEvents) => {
          const start = (index / filteredEvents.length) * 100;
          const end = ((index + 1) / filteredEvents.length) * 100;
          return `${this.getEventColor(event.type)} ${start}% ${end}%`;
        })
        .join(", ");
      cell.style.background = `linear-gradient(115deg, ${gradientStops})`;
    } else if (events.length === 1) {
      cell.classList.add(events[0].type);
    } else {
      cell.classList.add("nothing");
    }

    cell.classList.add("date-cell");

    return cell;
  }

  getEventColor(event) {
    const colors = {
      travel: "#6BA9E6",
      stay: "#F5A623",
      hike: "#79CC1F",
    };
    return colors[event] || "#D8F3DC";
  }

  createDateWithTimezone(year, month, day) {
    // Create base date
    const date = new Date(Date.UTC(year, month, day));

    // Adjust for timezone
    const offsetHours = date.getTimezoneOffset() / 60;
    const adjustedDate = new Date(
      date.getTime() + Math.abs(offsetHours) * 60 * 60 * 1000,
    );

    return adjustedDate;
  }

  createEmptyCells(count) {
    const row = document.createElement("tr");
    for (let i = 0; i < count; i++) {
      const emptyCell = document.createElement("td");
      emptyCell.classList.add("empty");
      row.appendChild(emptyCell);
    }
    return row;
  }

  showEventTooltip(event, dateStr) {
    const eventsData = event.target.dataset.events;
    if (!eventsData) return;

    const events = JSON.parse(eventsData);
    if (events.length === 0) return;

    const tooltip = this.shadowRoot.getElementById("event-tooltip");
    const date = new Date(dateStr);
    tooltip.innerHTML = this.generateEventDetailsHTML(date, events);

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

  hideEventTooltip() {
    const tooltip = this.shadowRoot.getElementById("event-tooltip");
    tooltip.classList.remove("visible");
    tooltip.classList.add("hidden");
  }

  toggleEventTooltip(event, dateStr) {
    const eventsData = event.target.dataset.events;
    if (!eventsData) return;

    const events = JSON.parse(eventsData);
    if (events.length === 0) return;

    const tooltip = this.shadowRoot.getElementById("event-tooltip");
    if (tooltip.classList.contains("visible")) {
      this.hideEventTooltip();
    } else {
      this.showEventTooltip(event, dateStr);
    }
  }

  generateEventDetailsHTML(date, events) {
    const formattedDate = this.formatDate(date);

    const eventDetails = events
      .filter((event) => event !== "nothing")
      .map((event) => {
        const time = event.time
          ? `<div><strong>Time:</strong> ${event.time}</div>`
          : `<div><strong>Time:</strong> Not specified</div>`;
        const type = `<div><strong>Type:</strong> <span style="color: ${this.getEventColor(event.type)};">${this.capitalizeFirstLetter(event.type)}</span></div>`;
        const fromTo =
          event.from && event.to
            ? `<div><strong>From:</strong> ${event.from} <strong>To:</strong> ${event.to}</div>`
            : "";
        const location = event.name
          ? `<div><strong>Location:</strong> ${event.name}</div>`
          : "";

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

  formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}.`;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getLocalIsoTime(date) {
    return (
      String(date.getHours()).padStart(2, "0") +
      ":" +
      String(date.getMinutes()).padStart(2, "0")
    );
  }

  getLocalIsoDate(date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  addMinutes(date, minutes) {
    const newDate = new Date(date);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    return newDate;
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.updateVisibility();
  }

  updateVisibility() {
    const container = this.shadowRoot?.querySelector(".calendar-container2");
    if (container) {
      container.style.display = this.isVisible ? "block" : "none";
    }
  }
}

// Register the custom element
customElements.define("hiking-calendar", HikingCalendar);
