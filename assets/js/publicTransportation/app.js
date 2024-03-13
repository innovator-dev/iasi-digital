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
            url: shapes,
            callback: (json) => {
                app.dataSets.publicTransportation.data.shapes = {};

                // Parse results
                json.forEach((shape) => {

                    if (!app.dataSets.publicTransportation.data.shapes[shape.shape_id]) {
                        app.dataSets.publicTransportation.data.shapes[shape.shape_id] = [];
                    }

                    app.dataSets.publicTransportation.data.shapes[shape.shape_id].push({
                        lat: shape.shape_pt_lat,
                        lng: shape.shape_pt_lon,
                    });
                });
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

        // Fetch trips
        populateTrips();

        // Populate routes
        populateRoutes();

        // Populate shapes
        // populateShapes();

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

            // Register hide route details on location disabled
            app.events.add('hideMyLocation', () => {
                hideRouteData();
            });

            // Parse public transportation
            app.dataSets.publicTransportation.data.vehicles.forEach((entry) => {

                // Calculate time since last update
                let timeSinceLastUpdate = app.dateDiff(entry.timestamp, true);

                // Validate entry
                if (entry.latitude && entry.longitude && entry.route_id && entry.trip_id && app.dataSets.publicTransportation.data.routes[entry.route_id] && app.dataSets.publicTransportation.data.trips[entry.trip_id] && timeSinceLastUpdate < 60) {

                    // Get matching route for current vehicle
                    let vehicleRoute = app.dataSets.publicTransportation.data.routes[entry.route_id].name.trim(),
                        vehicleRouteLong = app.dataSets.publicTransportation.data.routes[entry.route_id].long.trim(),
                        vehicleType = app.dataSets.publicTransportation.data.routes[entry.route_id].type,
                        vehicleTripHeadSign = app.dataSets.publicTransportation.data.trips[entry.trip_id].headSign.trim(),
                        vehicleDirection = app.dataSets.publicTransportation.data.trips[entry.trip_id].direction;

                    if (app.dataSets.publicTransportation.markers[entry.label]) {

                        app.dataSets.publicTransportation.markers[entry.label]['ref']
                            .position = {lat: entry.latitude, lng: entry.longitude};

                        app.dataSets.publicTransportation.markers[entry.label]['lastUpdate'] = entry.timestamp;

                        app.dataSets.publicTransportation.markers[entry.label]['popup'] =
                            `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="map-label route route-${vehicleRoute} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Direcție</strong>: ${vehicleTripHeadSign}</li><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul><nav><button class="btn btn-render-eta" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}" data-route="${vehicleTripHeadSign}" data-route-id="${vehicleRoute}">Afișează estimare <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav></main></div>`;

                        // Update route details (if selectedMarker)
                        if (app.dataSets.publicTransportation.selectedMarker.label && app.dataSets.publicTransportation.selectedMarker.label === entry.label) {

                            // Validate if myLocation has data
                            try {

                                if (app.map.direction.service === null) {
                                    app.events.fire('initiateDirectionService');
                                }

                                // Validate user location
                                if (app.me.location.lat === 0 || app.me.location.lng === 0 && app.config.messages['route.error.unableToDetermine']) {
                                    app.notify(app.config.messages['route.error.unableToDetermine'], 'error', 10);
                                }

                                app.map.direction.service.route({
                                    origin: new google.maps.LatLng(app.me.location.lat, app.me.location.lng),
                                    destination: new google.maps.LatLng(parseFloat(entry.latitude), parseFloat(entry.longitude)),
                                    travelMode: 'DRIVING'
                                }, function (res, status) {
                                    if (status === 'OK') {

                                        // Fetch distance and time of arrival estimate
                                        if (res.routes[0].legs[0]) {

                                            let distance = res.routes[0].legs[0].distance.text;
                                            let duration = res.routes[0].legs[0].duration.text;

                                            // Update map route details
                                            showRouteData(distance, duration, vehicleTripHeadSign, vehicleRoute);
                                        }

                                        app.map.direction.renderer.setDirections(res);
                                    }
                                });
                            } catch (err) {
                                app.notify(err, 'error', 10);

                                // Hide route data
                                hideRouteData();
                            }
                        }

                    } else {

                        // Create icon
                        let icon = document.createElement('img');
                        icon.src = `${app.cdn}pin/public-transportation/${vehicleRoute !== null ? `${vehicleRoute}.png` : `${vehicleType === 0 ? 'tram' : 'bus'}.png`}`;
                        icon.width = 22;
                        icon.height = 35;

                        app.dataSets.publicTransportation.markers[entry.label] = {
                            id: entry.label,
                            type: vehicleType,
                            route: vehicleRoute,
                            ref: new google.maps.marker.AdvancedMarkerElement({
                                map: app.map.ref,
                                position: {lat: parseFloat(entry.latitude), lng: parseFloat(entry.longitude)},
                                title: entry.route_id.toString(),
                                content: icon
                            }),
                            lastUpdate: entry.timestamp,
                            visible: true,
                            popup: `<div id="mapPopup"><header>${vehicleRoute !== null ? `<span class="map-label route route-${vehicleRoute} ic-mr-10">${vehicleRoute}</span>` : ''}<h5>${vehicleRouteLong}</h5></header><main><ul><li><strong>Direcție</strong>: ${vehicleTripHeadSign}</li><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li><li><strong>Cod identificare</strong>: ${entry.label}</li><li><strong>Viteză</strong>: ${entry.speed} km/h</li></ul><nav><button class="btn btn-render-eta" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}" data-route="${vehicleTripHeadSign}" data-route-id="${vehicleRoute}">Afișează estimare <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav></main></div>`
                        };

                        app.dataSets.publicTransportation.markers[entry.label].ref.addListener('click', () => {

                            // MapPopup visible? Close it.
                            if (app.map.popup) {
                                app.map.popup.close();
                                app.dataSets.publicTransportation.selectedMarker = null;
                            }

                            // Save selected marker
                            app.dataSets.publicTransportation.selectedMarker = {
                                ref: app.dataSets.publicTransportation.markers[entry.label].ref,
                                label: entry.label
                            };

                            // Create InfoWindow
                            app.map.popup = new google.maps.InfoWindow({
                                content: app.dataSets.publicTransportation.markers[entry.label]['popup']
                            });

                            // Open popup
                            app.map.popup.open(
                                app.map.ref,
                                app.dataSets.publicTransportation.selectedMarker.ref
                            );

                            google.maps.event.addListener(app.map.popup, 'closeclick', () => {
                                app.dataSets.publicTransportation.selectedMarker = null;
                                app.map.popup = null;

                                // Hide route details
                                hideRouteData();
                            });

                            google.maps.event.addListener(app.map.popup, 'domready', () => {

                                // Show estimation
                                const showEstimationButton = document.querySelector('.btn-render-eta');
                                if (showEstimationButton) {

                                    // Get vehicle location
                                    let vehicleLat = parseFloat(showEstimationButton.getAttribute('data-lat')) || 0,
                                        vehicleLng = parseFloat(showEstimationButton.getAttribute('data-lng')) || 0,
                                        vehicleRoute = showEstimationButton.getAttribute('data-route'),
                                        vehicleRouteId = showEstimationButton.getAttribute('data-route-id');

                                    if (vehicleLat > 0 && vehicleLng > 0 && vehicleRoute && vehicleRouteId) {

                                        showEstimationButton.addEventListener('click', (e) => {

                                            // Validate if myLocation has data
                                            try {

                                                if (app.map.direction.service === null) {
                                                    app.events.fire('initiateDirectionService');
                                                }

                                                // Validate user location
                                                if (app.me.location.lat === 0 || app.me.location.lng === 0 && app.config.messages['route.error.unableToDetermine']) {
                                                    app.notify(app.config.messages['route.error.unableToDetermine'], 'error', 10);
                                                }

                                                app.map.direction.service.route({
                                                    origin: new google.maps.LatLng(app.me.location.lat, app.me.location.lng),
                                                    destination: new google.maps.LatLng(vehicleLat, vehicleLng),
                                                    travelMode: 'DRIVING'
                                                }, function (res, status) {
                                                    if (status === 'OK') {

                                                        // Fetch distance and time of arrival estimate
                                                        if (res.routes[0].legs[0]) {

                                                            let distance = res.routes[0].legs[0].distance.text;
                                                            let duration = res.routes[0].legs[0].duration.text;

                                                            // Update map route details
                                                            showRouteData(distance, duration, vehicleRoute, vehicleRouteId);
                                                        }

                                                        app.map.direction.renderer.setDirections(res);
                                                    }
                                                });
                                            } catch (err) {
                                                app.notify(err, 'error', 10);

                                                // Hide route details
                                                hideRouteData();
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    }
                }
            });
        }
    }

    /**
     * Show route data container and populate route details.
     * @param distance Route distance
     * @param duration Route estimation duration
     * @param route Route name
     * @param routeId Route Id
     */
    function showRouteData(distance, duration, route, routeId) {

        // Route details container
        const mapRouteDetails = document.querySelector('.mapControlsVehicle');
        if (mapRouteDetails) {

            const routeDistance = mapRouteDetails.querySelector('.route-distance'),
                routeEstimate = mapRouteDetails.querySelector('.route-estimate'),
                routeDetails = mapRouteDetails.querySelector('p'),
                hideButton = mapRouteDetails.querySelector('button.btn-hide');

            if (hideButton) {
                hideButton.addEventListener('click', hideRouteData);
            }

            // Update map route details
            routeDistance.innerHTML = `${distance}`;
            routeEstimate.innerHTML = `${duration}`;
            routeDetails.innerHTML = `<span class="map-label route route-${routeId} ic-mr-5">${routeId}</span> ${route}`

            mapRouteDetails.classList.remove('hide');
        }
    }

    /**
     * Hide route data container.
     */
    function hideRouteData() {

        // Route details container
        const mapRouteDetails = document.querySelector('.mapControlsVehicle'),
            hideButton = mapRouteDetails.querySelector('button.btn-hide');

        // Remove event listener
        if (hideButton) {
            hideButton.removeEventListener('click', hideRouteData);
        }

        // Hide infoWindow (if open)
        if (app.map.popup) {
            app.map.popup.close();
        }

        // Clear direction service
        app.events.fire('clearDirectionService');

        // Hide map controls
        document.querySelector('.mapControlsVehicle').classList.add('hide');

        // Clear selected marker
        app.dataSets.publicTransportation.selectedMarker = null;
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