class TripInfo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this._trip = [];
        this._speed = 0;
        this._defaults = null;
    }

    connectedCallback() {
        this._toggleListener = () => this.toggle();
        document.addEventListener('toggle-trip-info', this._toggleListener);

        document.addEventListener('trip-loaded', (e) => {
            console.log("trip loaded")
            this._trip = e.detail.tripConfiguration;
            this._defaults = e.detail.defaults;
            this._speed = e.detail.walkingSpeed;
            this.render();
        })
    }

    disconnectedCallback() {
        document.removeEventListener('toggle-trip-info', this._toggleListener);
    }

    toggle() {
        const details = this.shadowRoot.querySelector('#trip-info');
        if (details) {
            details.classList.toggle('hidden');
        }
    }

    render() {
        if (!this._trip.length || !this._defaults) {
            this.shadowRoot.innerHTML = '';
            return;
        }

        const totals = {
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snacks: 0
        };

        const enrichedLegs = this._trip.map(leg =>
            enrichLeg(leg, this._speed, this._defaults)
        );
        const legViewModels = enrichedLegs.map(legToViewModel);

        const zeroDaysCount = this._defaults.numberOfZeroDays || 0;
        const enrichedZeroDays = Array.from(
            { length: zeroDaysCount },
            (_, i) => enrichZeroDay(i, this._speed, this._defaults)
        );

        const zeroDayViewModels = enrichedZeroDays.map(zeroDayToViewModel);

        [...enrichedLegs, ...enrichedZeroDays].forEach(item =>
            accumulateMealPlans(totals, item)
        );


        this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="../assets/components/tripInfo/TripInfo.css">
        <div id="trip-info" class="hidden">

            <div class="legs">
            ${legViewModels
                .map(vm => `
                    <p>${vm.title}</p>
                    <p>${vm.mealPlanText}</p>
                `)
                .join('')}
            </div>

            <div class="zeros">
                ${zeroDayViewModels.map(vm => `
                    <p>${vm.title}</p>
                    <p>${vm.mealPlanText}</p>
                `).join('')}
            </div>
            <div class="totals">
                <p>Total length: ${this._trip.totalDistance.toFixed(2)} km</p>
                <p>Total meals:</p>
                Breakfast: ${totals.breakfast}, Lunch: ${totals.lunch}, Dinner: ${totals.dinner}, Snacks: ${totals.snacks}
            </div>
            <section>
                <slot name="leg-alternatives"></slot>
            </section>
        </div>
        `;

    }
}

customElements.define('trip-info', TripInfo);

function enrichLeg(leg, speed, defaults) {
    const mealPlan = leg.mealPlan || defaults.trip.mealPlan;

    const mealPlanDetails = calculateMealPlan(
        leg.distance,
        speed,
        mealPlan
    );

    const snackCount = mealPlan.snacks
        ? Math.floor(leg.distance / speed)
        : 0;

    return {
        ...leg,
        mealPlan,
        mealPlanDetails,
        snackCount
    };
}

function calculateMealPlan(distance, speed, mealPlan) {
    var time = distance / speed;
    var mealPlanDetails = [];

    if (mealPlan.breakfast) mealPlanDetails.push("Breakfast");
    if (mealPlan.lunch) mealPlanDetails.push("Lunch");
    if (mealPlan.dinner) mealPlanDetails.push("Dinner");

    if (mealPlan.snacks) {
        var snacks = Math.floor(time);
        mealPlanDetails.push(`${snacks} Snack Bar${snacks > 1 ? 's' : ''}`);
    }

    return mealPlanDetails.join(", ");
}

function accumulateMealPlans(total, item) {
    if (item.mealPlan.breakfast) total.breakfast++;
    if (item.mealPlan.lunch) total.lunch++;
    if (item.mealPlan.dinner) total.dinner++;
    total.snacks += item.snackCount || 0;
}

function enrichZeroDay(index, speed, defaults) {
    const mealPlan = defaults.zero.mealPlan;

    return {
        type: 'zero',
        index,
        mealPlan,
        mealPlanDetails: calculateMealPlan(0, speed, mealPlan),
        snackCount: 0
    };
}

function legToViewModel(leg, index) {
    const distanceInfo = leg.distance
        ? `: ${leg.distance.toFixed(2)} km`
        : '';

    const elevationInfo =
        leg.elevationGain || leg.elevationLoss
            ? ` (+${leg.elevationGain || 0} m / -${leg.elevationLoss || 0} m)`
            : '';

    return {
        title: `Leg ${index + 1}${distanceInfo}${elevationInfo}`,
        mealPlanText: `Meal Plan: ${leg.mealPlanDetails}`
    };
}

function zeroDayToViewModel(zeroDay) {
    return {
        title: `Zero Day ${zeroDay.index + 1}`,
        mealPlanText: `Meal Plan: ${zeroDay.mealPlanDetails}`
    };
}