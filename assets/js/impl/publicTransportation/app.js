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
 * Vehicle object.
 */
class Vehicle {

    /**
     * Creates a new instance of Vehicle.
     * @constructor
     * @suppress {misplacedTypeAnnotation}
     *
     * @param props Vehicle properties
     * @param routes Routes
     * @param trips Trips
     */
    constructor(props, routes = [], trips = []) {

        // Vehicle identification
        this.id = props.id || 0;
        this.label = props.label || null;
        this.lastUpdate = props.timestamp;
        this.lastUpdateFriendly = CityApp.dateDiff(this.lastUpdate, true);

        // Vehicle position
        this.latitude = props.latitude;
        this.longitude = props.longitude;

        // Vehicle route
        this.routeId = props.route_id || 0;
        this.route = routes[this.routeId];
        this.routeName = this.route && (this.route.hasOwnProperty('long')) ? this.route['long'] : null;
        this.routeNumber = this.route && (this.route.hasOwnProperty('name')) ? this.route['name'] : null;
        this.routeType = this.route && (this.route.hasOwnProperty('type')) ? this.route['type'] : -1;

        // Vehicle trip
        this.tripId = props.trip_id;
        this.trip = trips[this.tripId];
        this.tripHeadSign = this.trip && (this.trip.hasOwnProperty('headSign')) ? this.trip['headSign'] : null;
        this.tripDirection = this.trip && (this.trip.hasOwnProperty('direction')) ? this.trip['direction'] : 0;
        this.tripRoute = this.trip && (this.trip.hasOwnProperty('route')) ? this.trip['route'] : null;

        // Vehicle speed
        this.speed = props.speed || 0;
    }
}

/**
 * Public Transportation application.
 * Consuming OpenData Iași Portal.
 *
 * @extends {DataSet}
 * @suppress {misplacedTypeAnnotation}
 */
class PublicTransportation extends DataSet {

    /**
     * Dataset application constructor.
     * @constructor
     */
    constructor() {
        super();

        /**
         * Colors mapping
         * @type {{0: string[], 11: string[], 1: string[], 13: string[], 3: string[], 5: string[], 6: string[], 7: string[], 8: string[], 9: string[]}}
         */
        this.routes = {
            0: ['#a2238e', '#fff'],
            1: ['#ec008c', '#fff'],
            3: ['#00a650', '#fff'],
            5: ['#e77817', '#fff'],
            6: ['#f9c0c1', '#222'],
            7: ['#2e3092', '#fff'],
            8: ['#d2e288', '#222'],
            9: ['#4ea391', '#fff'],
            11: ['#f05b72', '#fff'],
            13: ['#00adef', '#222'],
        };

        /**
         * API resource for fetching public transportation data.
         * @type {string}
         */
        this.dataSet = 'dc2a-cd0a-477f-95f3-1107';

        /**
         * Selected marker
         * @type {null}
         */
        this.selectedMarker = null;

        /**
         * API resource for fetching trips.
         * @type {string}
         */
        this.dataSetTrips = 'dc2a-cd0a-477f-95f3-1107/52cf25d5c64d1f700b8867cee05112525698';

        /**
         * Vehicle trips.
         * @type {*[]}
         */
        this.vehicleTrips = [];

        /**
         * API resource for fetching routes.
         * @type {string}
         */
        this.dataSetRoutes = 'https://iasidigital.idealweb.ro/data/publicTransportation/routes.json';

        /**
         * Vehicle routes.
         * @type {*[]}
         */
        this.vehicleRoutes = [];
    }

    /**
     * Initialize app.
     */
    init() {

        // Fetch trips
        this.getTripsData();

        // Fetch routes
        this.getRoutesData();

        // Refresh data every 1 minute
        this.setWatcher(60000, () => {
            this.getData();
        });

        // Refresh trips data every 2 minutes
        setInterval(() => {
            this.getTripsData();
        }, 120000);
    }

    /**
     * Fetch data from API.
     * @param callback Callback method
     * @returns {boolean}
     */
    getData(callback = null) {
        return PublicTransportation.fetch(this.dataSet, (json) => {
            this.data = json;
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Fetch trips data from API.
     * @param callback Callback method
     * @returns {boolean}
     */
    getTripsData(callback = null) {
        return PublicTransportation.fetch(this.dataSetTrips, (json) => {
            json.forEach((trip) => {
                this.vehicleTrips[trip.trip_id] = {
                    route: trip.route_id,
                    trip: trip.trip_id,
                    headSign: trip.trip_headsign,
                    direction: trip.direction_id,
                    shape: trip.shape_id
                };
            });
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Fetch trips data from static.
     * @param callback Callback method
     * @returns {boolean}
     */
    getRoutesData(callback = null) {
        return CityApp.getSetData({
            url: this.dataSetRoutes,
            callback: (json) => {
                json.forEach((route) => {
                    this.vehicleRoutes[route.route_id] = {
                        name: route.route_short_name,
                        long: route.route_long_name,
                        type: route.route_type,
                        color: route.route_color
                    };
                });
                if (callback) {
                    callback();
                }
            }
        });
    }

    /**
     * Prepare markers structure.
     * @param callback Callback method
     */
    render(callback = null) {

        // Trips data missing, fetch data and try again
        if (Object.keys(this.vehicleTrips).length === 0) {
            this.getTripsData();
        }

        // Data missing, fetch data and try again
        if (!this.hasData()) {
            this.getData(() => {
                this.render();
            });
        } else {
            this.data.forEach((entry) => {

                // Create a new Vehicle instance
                const vehicle = new Vehicle(entry, this.vehicleRoutes, this.vehicleTrips);

                // Validate vehicle
                if (vehicle.latitude && vehicle.longitude && vehicle.routeId && vehicle.tripId && vehicle.routeName && vehicle.lastUpdateFriendly < 60) {

                    if (this.markers[vehicle.id]) {

                        // Update vehicle position
                        this.markers[vehicle.id]._ref.position = {lat: parseFloat(entry.latitude), lng: parseFloat(entry.longitude)};

                        // Show marker if hidden
                        if (!this.markers[vehicle.id].isVisible && this.markers[vehicle.id]._ref) {
                            this.markers[vehicle.id]._ref.setMap(CityApp.data.map._ref);
                            this.markers[vehicle.id].isVisible = true;
                        }

                    } else {

                        // Get route colors
                        let [backgroundColor, textColor] = this.routes[vehicle.routeNumber] ?
                            this.routes[vehicle.routeNumber] : this.routes[0];

                        // Custom label for marker
                        const label = document.createElement('div');
                        label.innerText = vehicle.routeNumber;

                        // Custom marker
                        const pin = new google.maps.marker.PinElement({
                            glyphColor: textColor,
                            background: backgroundColor,
                            borderColor: backgroundColor,
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
                            type: vehicle.routeType,
                            route: vehicle.routeNumber,
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
                                title: vehicle.routeName,
                                titleLabel: this.markers[vehicle.id].route,
                                titleLabelClass: [`route`, `route-${this.markers[vehicle.id].route}`],
                                content: `<ul><li><strong>${CityApp.config.labels['transportation.direction']}: ${vehicle.tripHeadSign}</strong></li><li title="${vehicle.lastUpdate}">${CityApp.config.labels['transportation.lastUpdate']}: ${CityApp.config.labels['transportation.tkTimeAgo'].replace('{{TIME}}', vehicle.lastUpdateFriendly)}</li><li>${CityApp.config.labels['transportation.identifier']}: ${vehicle.label}</li><li>${CityApp.config.labels['transportation.speed']}: ${CityApp.config.labels['transportation.tkSpeed'].replace('{{SPEED}}', vehicle.speed)}</li></ul>`,
                                onClose: () => {
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
    CityApp.data.sets.publicTransportation = new PublicTransportation();
})();