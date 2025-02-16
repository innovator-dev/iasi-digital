/**
 * Iași Digital
 * A data-driven perspective of the city.
 *
 * @author Innovator Dev <hello@innovator.dev>
 * @link https://iasi.digital
 * @link https://oras.digital
 *
 * @copyright (c) 2018-2025. Iasi Digital [https://iasi.digital]
 */

'use strict';

/**
 * Waste collector vehicle.
 *
 * @suppress {misplacedTypeAnnotation}
 */
class WasteCollectorVehicle {

    /**
     * Creates a new instance of Vehicle.
     * @constructor
     */
    constructor(props) {

        // Vehicle identification
        this.id = props.VehicleId || 0;
        this.label = props.PlateNumber || null;
        this.lastUpdate = props.LastRecordDT;
        this.lastUpdateFriendly = CityApp.dateDiff(this.lastUpdate, true);

        // Vehicle position
        this.latitude = props.LastLatitude;
        this.longitude = props.LastLongitude;
    }
}

/**
 * Waste Collection application.
 * Consuming OpenData Iași Portal.
 *
 * @extends {DataSet}
 * @suppress {misplacedTypeAnnotation}
 */
class WasteCollection extends DataSet {

    /**
     * Dataset application constructor.
     * @constructor
     */
    constructor() {
        super();

        /**
         * API resource for fetching public transportation data.
         * @type {string}
         */
        this.dataSet = '544f-2a7a-490a-ac5c-0f79';

        /**
         * Selected marker.
         * @type {null}
         */
        this.selectedMarker = null;
    }

    /**
     * Initialize app.
     */
    init() {

        // Refresh data every 1 minute
        this.setWatcher(60000, () => {
            this.getData();
        });
    }

    /**
     * Fetch data from API.
     * @param callback Callback method
     * @returns {boolean}
     */
    getData(callback = null) {
        return WasteCollection.fetch(this.dataSet, (json) => {
            this.data = json;
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Prepare markers structure.
     * @param callback Callback method
     */
    render(callback = null) {

        // Data missing, fetch data and try again
        if (!this.hasData()) {
            this.getData(() => {
                this.render();
            });
        } else {
            this.data.forEach((entry) => {

                // Create a new Vehicle instance
                const vehicle = new WasteCollectorVehicle(entry);

                // Validate vehicle
                if (vehicle.latitude && vehicle.longitude) {

                    if (this.markers[vehicle.id]) {

                        // Update vehicle position
                        this.markers[vehicle.id]._ref.position = {lat: parseFloat(vehicle.latitude), lng: parseFloat(vehicle.longitude)};

                        // Show marker if hidden
                        if (!this.markers[vehicle.id].isVisible && this.markers[vehicle.id]._ref) {
                            this.markers[vehicle.id]._ref.setMap(CityApp.data.map._ref);
                            this.markers[vehicle.id].isVisible = true;
                        }

                    } else {

                        // Custom label for marker
                        const label = document.createElement('div');
                        label.innerText = '♺';
                        label.style.fontSize = '16px';

                        // Custom marker
                        const pin = new google.maps.marker.PinElement({
                            glyphColor: '#fff',
                            background: '#97b534',
                            borderColor: '#97b534',
                            glyph: label
                        });

                        // Marker
                        const marker = new google.maps.marker.AdvancedMarkerElement({
                            position: {lat: parseFloat(vehicle.latitude), lng: parseFloat(vehicle.longitude)},
                            map: CityApp.data.map._ref,
                            title: vehicle.label,
                            content: pin.element
                        });

                        this.markers[vehicle.id] = {
                            id: vehicle.id,
                            _ref: marker,
                            isVisible: true
                        };

                        // Open popup
                        this.markers[vehicle.id]._ref.addListener('click', () => {
                            this.selectedMarker = this.markers[vehicle.id]._ref;

                            // Close InfoWindow
                            CityApp.mapUtils('closePopup');

                            // Create InfoWindow
                            CityApp.mapUtils('createPopup', {
                                title: vehicle.label,
                                content: `<h6>${CityApp.config.labels['wasteCollection.lastUpdate']}</h6><p>${new Date(vehicle.lastUpdate).toLocaleString('ro-RO', {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric"
                                })}</p>`,
                                onClick: () => {
                                    this.selectedMarker = null;
                                }
                            });

                            // Show InfoWindow
                            CityApp.mapUtils('openPopup', {ref: this.markers[vehicle.id]._ref});
                        });
                    }
                }
            });
        }
    }

    /**
     * Show markers on the map.
     * @param callback Callback method
     */
    show(callback = null) {

        // Data missing, fetch data and try again
        if (!this.hasData()) {
            this.getData(() => {
                setTimeout(() => {
                    this.show();
                }, 1000);
            })
        } else {

            // Show pins on map
            this.render();

            // Setup watcher
            // Run marker updated rendering (30 seconds)
            this.setWatcher(30000, () => {
                this.getData(() => {
                    this.render();
                });
            });

            // Mark markers as visible
            this.isVisible = true;
        }

        // Callback
        if (callback) {
            callback();
        }
    }

    /**
     * Hide markers from the map.
     * @param callback Callback method
     */
    hide(callback = null) {

        // Clear markers
        Object.values(this.markers).forEach((pin) => {
            if (pin._ref) {
                pin._ref.setMap(null);
                pin.isVisible = false;
            }
        });

        // Set application is not visible
        this.isVisible = false;

        // Return watcher to default value
        this.setWatcher(60000, () => {
            this.getData();
        });

        // Callback
        if (callback) {
            callback();
        }
    }
}

/**
 * Initialize app.
 */
(() => {
    CityApp.data.sets.wasteCollection = new WasteCollection();
})();