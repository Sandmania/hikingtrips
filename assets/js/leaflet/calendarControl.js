const DEFAULTS = {
    position: 'topright',
    title: 'Show Calendar',
};

export function calendarControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            // this config.travelInfo is really not used for anything else, 
            // we just need to know that travel info exists and then we need to render this leaflet control button
            // to show the calendar component
            return config.travelInfo; 
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const calendarControl = L.Control.extend({
                onAdd: function (map) {
                    var calendarButton = L.DomUtil.create('button', 'leaflet-bar leaflet-control calendar-button');
                    // Don't propagate click events to the map, double clicking would zoom in
                    L.DomEvent.disableClickPropagation(calendarButton);
                    calendarButton.innerHTML = '';
                    const rightContent = document.getElementById('calendar-container');
                    calendarButton.onclick = function () {
                        if (rightContent.style.display === 'none' || rightContent.style.display === '') {
                            rightContent.style.display = 'flex';
                        } else {
                            rightContent.style.display = 'none';
                        }
                    };
                    return calendarButton;
                }
            });

            map.addControl(new calendarControl({ position: 'topright' }));
        }
    };
}