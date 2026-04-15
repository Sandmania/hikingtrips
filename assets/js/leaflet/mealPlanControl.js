const DEFAULTS = {
    position: 'topright',
    title: 'Show/Hide Meal Plan'
};

export function mealPlanControl(options = {}) {
    const config = { ...DEFAULTS, ...options };

    return {
        canAdd() {
            return !!config.csvUrl;
        },

        addTo(map) {
            if (!this.canAdd()) return this;

            const MealPlanControl = L.Control.extend({
                onAdd: function () {
                    const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control meal-plan-button');
                    L.DomEvent.disableClickPropagation(btn);
                    btn.title = config.title;
                    btn.onclick = () => {
                        document.dispatchEvent(new CustomEvent('toggle-meal-plan'));
                    };
                    return btn;
                }
            });

            map.addControl(new MealPlanControl({ position: config.position }));
        }
    };
}
