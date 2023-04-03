/**
 * Iași Digital
 * A data-driven perspective of the city.
 *
 * @author Innovator Dev <hello@innovator.dev>
 * @link https://oras.digital
 * @link https://iasi.digital
 *
 * @copyright (c) 2023. Iasi Digital [https://iasi.digital]
 */

'use strict';

/**
 * Public transportation map rendering.
 */
const publicTransportation = (() => {

    /**
     * Data Set url.
     * @type {string}
     */
    const url = 'https://opendata.oras.digital/public-api/proxy/';

    /**
     * Perform fetch request to API, vehicles endpoint.
     * @param callback Fetch callback method
     * @returns {boolean}
     */
    function fetch(callback = null) {

        app.api(`${url}`, 'POST', {
            action: 'fetch',
            type: 'api',
            value: 'dc2a-cd0a-477f-95f3-1107'
        }).then((response) => {
            if (!response.ok) {
                return false;
            }

            return response.json();
        }).then((json) => {
            app.dataSets.publicTransportation.data.vehicles = json;
            app.dataSets.publicTransportation.updated = Date.now();

            // Callback
            if (callback !== null) {
                callback();
            }
        }).catch(err => {
            return false;
        });

        return true;
    }

    /**
     * Perform fetch request to API, routes endpoint.
     * @param callback Fetch callback method
     * @returns {boolean}
     */
    function populateRoutes(callback = null) {

        app.api(`${url}`, 'POST', {
            action: 'fetch',
            type: 'api',
            value: '74eb-a3f3-436b-aa5f-0c2a/816b8cdb6dc7997cbbe0cb9e1b2969727406'
        }).then((response) => {
            if (!response.ok) {
                return false;
            }

            return response.json();
        }).then((json) => {
            app.dataSets.publicTransportation.data.routes = {};

            json.forEach((route) => {
                app.dataSets.publicTransportation.data.routes[route.route_id] = {
                    name: route.route_short_name,
                    long: route.route_long_name,
                    type: route.route_type
                };
            });

            // Callback
            if (callback !== null) {
                callback();
            }
        }).catch(err => {
            return false;
        });

        return true;
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

        // Fetch routes
        populateRoutes();

        setWatcher(60000, () => {
            fetch();
        });
    }

    /**
     * Show markers on map.
     */
    function show() {

        // Render pins
        render();

        // Setup watcher
        // Run marker rendering
        setWatcher(20000, () => {
            fetch(() => {
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
            fetch();
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

        // Populate routes
        if (app.dataSets.publicTransportation.data.routes === undefined) {
            populateRoutes();
        }

        // Render vehicles
        if (app.dataSets.publicTransportation.data.vehicles === undefined) {

            fetch(() => {
                render();
            });
        } else {

            app.dataSets.publicTransportation.data.vehicles.forEach((entry) => {

                // Calculate time since last update
                let timeSinceLastUpdate = app.dateDiff(entry.timestamp);

                // Validate entry
                if (entry.latitude && entry.longitude && entry.route_id && app.dataSets.publicTransportation.data.routes[entry.route_id] !== undefined && timeSinceLastUpdate < 60) {

                    // Get matching route for current vehicle
                    let vehicleRoute = app.dataSets.publicTransportation.data.routes[entry.route_id].name,
                        vehicleRouteLong = app.dataSets.publicTransportation.data.routes[entry.route_id].long,
                        vehicleType = app.dataSets.publicTransportation.data.routes[entry.route_id].type;

                    if (app.dataSets.publicTransportation.markers[entry.label]) {

                        app.dataSets.publicTransportation.markers[entry.label]['ref']
                            .setPosition(new google.maps.LatLng(entry.latitude, entry.longitude));

                        app.dataSets.publicTransportation.markers[entry.label]['lastUpdate'] = entry.timestamp;

                        app.dataSets.publicTransportation.markers[entry.label]['popup'] =
                            `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="label route route-${parseInt(vehicleRoute) >= 18 ? 'bus' : `line-${vehicleRoute}`} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul></main></div>`
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
                                    url: `${app.cdn}pin/mobility/public-transportation/${vehicleRoute !== null ? `${vehicleRoute}.png` : `${vehicleType === 0 ? 'tram' : 'bus'}.png`}`,
                                    size: new google.maps.Size(28, 44),
                                    origin: new google.maps.Point(0, 0),
                                    anchor: new google.maps.Point(0, 44),
                                    scaledSize: new google.maps.Size(28, 44)
                                }
                            }),
                            lastUpdate: entry.timestamp,
                            visible: true,
                            popup: `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="label route route-${parseInt(vehicleRoute) >= 18 ? 'bus' : `line-${vehicleRoute}`} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Ultima actualizare</strong>: acum ${app.dateDiff(entry.timestamp)} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul></main></div>`
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
        fetch: fetch,

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