const trips = [
{
    name: "Repovesi National Park",
    dates: "June 22-25, 2023",
    image: "repovesi2023/photos/DSC03381.jpeg",
    url: "repovesi2023/index.html",
},
    {
    name: "Paistunturi Wilderness Area",
    dates: "August 11-25, 2024",
    image: "paistunturi2024/photos/DSC03759.jpg",
    url: "paistunturi2024/index.html",
  },
  {
    name: "Muotkatunturi Wilderness Area",
    dates: "July 2-12, 2025",
    image: "muotka2025/photos/DSC03935.jpeg",
    url: "muotka2025/index.html",
  },
{
    name: "Sarek National Park",
    dates: "Did Not Start (July 18-27, 2025)",
    image: "placeholder_small.png",
    url: "sarek2025/index.html",
}
];

const grid = document.getElementById("trips-grid");

trips.forEach(trip => {
  const card = document.createElement("div");
  card.className = "trip-card";
  card.style.backgroundImage = `url('${trip.image}')`;

  const link = document.createElement("a");
  link.href = trip.url;
  link.className = "trip-link";

  const overlay = document.createElement("div");
  overlay.className = "trip-overlay";

  const title = document.createElement("h2");
  title.className = "trip-title";
  title.textContent = trip.name;

  const dates = document.createElement("h3");
  dates.className = "trip-dates";
  dates.textContent = trip.dates;

  overlay.appendChild(title);
  overlay.appendChild(dates);
  link.appendChild(overlay);
  card.appendChild(link);
  grid.appendChild(card);
});