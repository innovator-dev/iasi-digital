/**
 * Iași Digital
 * A data-driven perspective of the city.
 *
 * @author Innovator Dev <hello@innovator.dev>
 * @link https://iasi.digital
 * @link https://oras.digital
 *
 * @copyright (c) Iasi Digital [https://iasi.digital]
 */

'use strict';

/**
 * Public transportation map rendering.
 */
const publicTransportation = (() => {

    /**
     * Perform fetch request to API.
     * @param callback (Optional) Callback to be executed after data is retrieved.
     * @returns {boolean}
     */
    function getData(callback = null) {

        // Fetch data
        return app.fetch({
            url: app.config.url,
            method: 'POST',
            postFields: {
                action: 'fetch',
                type: 'api',
                value: 'dc2a-cd0a-477f-95f3-1107'
            },
            callback: (json) => {
                app.dataSets.publicTransportation.data.vehicles = json;
                app.dataSets.publicTransportation.updated = Date.now();

                // Execute callback
                if (callback) {
                    callback();
                }
            }
        });
    }

    /**
     * Perform fetch request to API, routes endpoint.
     * @returns {boolean}
     */
    function populateRoutes() {

        // Routes config
        const routes = `${app.cdn}js/publicTransportation/routes.json`;
        // const routes = `https://iasidigital.idealweb.ro/assets/js/publicTransportation/routes.json`;

        // Fetch routes
        return app.fetch({
            url: routes,
            callback: (json) => {
                app.dataSets.publicTransportation.data.routes = {};

                // Parse results
                json.forEach((route) => {
                    app.dataSets.publicTransportation.data.routes[route.route_id] = {
                        name: route.route_short_name,
                        long: route.route_long_name,
                        type: route.route_type,
                        color: route.route_color
                    };
                });
            }
        });
    }

    /**
     * Perform fetch request to SHAPES in order to highlight transportation route on the map.
     * @returns {boolean}
     */
    function populateShapes() {

        // Shapes config
        const shapes = `${app.cdn}js/publicTransportation/shapes.json`;
        // const shapes = `https://iasidigital.idealweb.ro/assets/js/publicTransportation/shapes.json`;

        // Fetch shapes
        return app.fetch({
            url: routes,
            callback: (json) => {
                app.dataSets.publicTransportation.data.shapes = {};

                // Parse results
                json.forEach((shape) => {
                    app.dataSets.publicTransportation.data.shapes[shape.shape_id] = {
                        lat: shape.shape_pt_lat,
                        long: shape.shape_pt_lon,
                        seq: shape.shape_pt_sequence
                    };
                });
            }
        });
    }

    /**
     * Perform fetch request to API, trips endpoint.
     * @param callback Fetch callback method
     * @returns {boolean}
     */
    function populateTrips(callback = null) {

        // Fetch data
        return app.fetch({
            url: app.config.url,
            method: 'POST',
            postFields: {
                action: 'fetch',
                type: 'api',
                value: 'dc2a-cd0a-477f-95f3-1107/52cf25d5c64d1f700b8867cee05112525698'
            },
            callback: (json) => {
                app.dataSets.publicTransportation.data.trips = {};

                json.forEach((trip) => {
                    app.dataSets.publicTransportation.data.trips[trip.trip_id] = {
                        route: trip.route_id,
                        trip: trip.trip_id,
                        headSign: trip.trip_headsign,
                        direction: trip.direction_id,
                        shape: trip.shape_id
                    };
                });

                // Execute callback
                if (callback) {
                    callback();
                }
            }
        });
    }

    /**
     * Set dataSet update watcher.
     * @param time Time in milliseconds for watcher to run
     * @param callback Callback to execute
     */
    function setWatcher(time, callback = null) {

        // Watcher already active
        if (app.dataSets.publicTransportation.watcher !== null) {
            clearInterval(app.dataSets.publicTransportation.watcher);
            app.dataSets.publicTransportation.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.publicTransportation.watcher = setInterval(() => {

            // Execute callback
            if (callback !== null) {
                callback();
            }
        }, time);
    }

    /**
     * Initialize app.
     * Update stored data every 60 seconds.
     */
    function init() {

        // Populate routes
        populateRoutes();

        // Populate shapes
        // populateShapes();

        // Fetch trips
        populateTrips();

        // Refresh data every 1 minute
        setWatcher(60000, () => {
            getData();
        });
    }

    /**
     * Show markers on map.
     */
    function show() {

        // Render pins
        render();

        // Setup watcher
        // Run marker updated rendering (20 seconds)
        setWatcher(20000, () => {
            getData(() => {
                render();
            });
        });

        // Mark dataSet visible
        app.dataSets.publicTransportation.visible = true;
    }

    /**
     * Hide markers.
     */
    function hide() {

        // Return watcher to default value
        setWatcher(60000, () => {
            getData();
        });

        // Clear pins
        Object.values(app.dataSets.publicTransportation.markers).forEach((pin) => {
            if (pin.ref) {
                pin.ref.setMap(null);
            }
        });

        // Clean
        app.dataSets.publicTransportation.markers = [];

        // Mark dataSet hidden
        app.dataSets.publicTransportation.visible = false;
    }

    /**
     * Render dataSet values.
     */
    function render() {

        // Populate trips
        if (app.dataSets.publicTransportation.data.trips === undefined) {
            populateTrips();

            // Update trips every 2 minutes
            setInterval(() => {
                populateTrips();
            }, 120000);
        }

        // Render vehicles
        if (app.dataSets.publicTransportation.data.vehicles === undefined) {
            getData(() => {
                render();
            });
        } else {

            app.dataSets.publicTransportation.data.vehicles.forEach((entry) => {

                // Calculate time since last update
                let timeSinceLastUpdate = app.dateDiff(entry.timestamp, true);

                // Validate entry
                if (entry.latitude && entry.longitude && entry.route_id && entry.trip_id && app.dataSets.publicTransportation.data.routes[entry.route_id] && app.dataSets.publicTransportation.data.trips[entry.trip_id] && timeSinceLastUpdate < 60) {

                    // Get matching route for current vehicle
                    let vehicleRoute = app.dataSets.publicTransportation.data.routes[entry.route_id].name.trim(),
                        vehicleRouteLong = app.dataSets.publicTransportation.data.routes[entry.route_id].long.trim(),
                        vehicleType = app.dataSets.publicTransportation.data.routes[entry.route_id].type,
                        vehicleTripHeadSign = app.dataSets.publicTransportation.data.trips[entry.trip_id].headSign.trim();

                    if (app.dataSets.publicTransportation.markers[entry.label]) {

                        app.dataSets.publicTransportation.markers[entry.label]['ref']
                            .setPosition(new google.maps.LatLng(entry.latitude, entry.longitude));

                        app.dataSets.publicTransportation.markers[entry.label]['lastUpdate'] = entry.timestamp;

                        app.dataSets.publicTransportation.markers[entry.label]['popup'] =
                            `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="label route route-${vehicleRoute} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Direcție</strong>: ${vehicleTripHeadSign}</li><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul></main></div>`;

                    } else {

                        app.dataSets.publicTransportation.markers[entry.label] = {
                            id: entry.label,
                            type: vehicleType,
                            route: vehicleRoute,
                            ref: new google.maps.Marker({
                                position: {lat: parseFloat(entry.latitude), lng: parseFloat(entry.longitude)},
                                map: app.map.ref,
                                title: entry.route_id.toString(),
                                optimized: true,
                                icon: {
                                    url: `${app.cdn}pin/public-transportation/${vehicleRoute !== null ? `${vehicleRoute}.png` : `${vehicleType === 0 ? 'tram' : 'bus'}.png`}`,
                                    size: new google.maps.Size(22, 35),
                                    origin: new google.maps.Point(0, 0),
                                    anchor: new google.maps.Point(11, 35),
                                    scaledSize: new google.maps.Size(22, 35)
                                }
                            }),
                            lastUpdate: entry.timestamp,
                            visible: true,
                            popup: `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="label route route-${vehicleRoute} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Direcție</strong>: ${vehicleTripHeadSign}</li><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul></main></div>`
                        };

                        app.dataSets.publicTransportation.markers[entry.label].ref.addListener('click', () => {

                            // MapPopup visible? Close it.
                            if (app.map.popup) {
                                app.map.popup.close();
                                app.dataSets.publicTransportation.selectedMarker = null;
                            }

                            // Save selected marker
                            app.dataSets.publicTransportation.selectedMarker = app.dataSets.publicTransportation.markers[entry.label].ref;

                            // Create InfoWindow
                            app.map.popup = new google.maps.InfoWindow({
                                content: app.dataSets.publicTransportation.markers[entry.label]['popup']
                            });

                            // Open popup
                            app.map.popup.open(
                                app.map.ref,
                                app.dataSets.publicTransportation.selectedMarker
                            );

                            google.maps.event.addListener(app.map.popup, 'closeclick', () => {
                                app.dataSets.publicTransportation.selectedMarker = null;
                                app.map.popup = null;
                            });

                            /*
                            google.maps.event.addListener(app.map.popup, 'domready', () => {
                                const showETAButton = document.querySelector('.btn-render-eta');
                                if (showETAButton) {
                                    showETAButton.addEventListener('click', (e) => {

                                        // Get parking place location
                                        let vehicleLat = parseFloat(showETAButton.getAttribute('data-lat')) || 0,
                                            vehicleLng = parseFloat(showETAButton.getAttribute('data-lng')) || 0;

                                        // Validate if myLocation has data
                                        try {

                                            if (app.map.direction.service === null) {
                                                app.events.fire('initiateDirectionService');
                                            }

                                            // Validate user location
                                            if (app.me.location.lat === 0 || app.me.location.lng === 0 && app.config.messages['route.error.unableToDetermine']) {
                                                app.notify(app.config.messages['route.error.unableToDetermine'], 'error', 10);
                                            }

                                            if (vehicleLat === 0 || vehicleLng === 0 && app.config.messages['parking.error.unableToDetermineLocation']) {
                                                app.notify(app.config.messages['parking.error.unableToDetermineLocation'], 'error', 10);
                                            }

                                            app.map.direction.service.route({
                                                origin: new google.maps.LatLng(app.me.location.lat, app.me.location.lng),
                                                destination: new google.maps.LatLng(vehicleLat, vehicleLng),
                                                travelMode: 'DRIVING'
                                            }, function (res, status) {
                                                if (status === 'OK') {
                                                    console.log(res);

                                                    // Fetch distance and time of arrival estimate
                                                    if (res.routes[0].legs[0]) {

                                                        let distance = res.routes[0].legs[0].distance.text;
                                                        let duration = res.routes[0].legs[0].duration.text;

                                                        // Show map box
                                                        app.map.box.querySelector('h2').innerText = `Estimare timp locație`;
                                                        app.map.box.querySelector('p').innerText = `Distanță până la locație: ${distance}`;
                                                        app.map.box.classList.remove('hide');
                                                    }
                                                }
                                            });
                                        } catch (err) {
                                            app.notify(err, 'error', 10);
                                        }
                                    });
                                }
                            });
                             */
                        });
                    }
                }
            });
        }
    }

    /**
     * Exposed methods.
     */
    return {

        // Initialize
        init: init,

        // Fetch
        getData: getData,

        // Show
        show: show,

        // Hide
        hide: hide
    };

})();

/**
 * Initialize app.
 */
(() => {

    // Populate app
    app.dataSets.publicTransportation.app = publicTransportation;

})();