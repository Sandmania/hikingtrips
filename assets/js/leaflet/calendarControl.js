const DEFAULTS = {
    position: 'topright',
    title: 'Show Calendar',
};

export function calendarControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            // Check if travelInfo exists and if the hiking-calendar element is available
            return config.travelInfo && document.querySelector('hiking-calendar'); 
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const calendarControl = L.Control.extend({
                onAdd: function (map) {
                    var calendarButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control calendar-button');
                    // Don't propagate click events to the map, double clicking would zoom in
                    L.DomEvent.disableClickPropagation(calendarButton);
                    calendarButton.innerHTML = '';
                    const calendar = document.querySelector('hiking-calendar');
                    calendarButton.onclick = function () {
                        if (calendar) {
                            calendar.toggleVisibility();
                        }
                    };
                    return calendarButton;
                }
            });

            map.addControl(new calendarControl({ position: 'topright' }));
        }
    };
}