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
 * Public parking map rendering.
 *
 * DataSet fields with default values:
 *  app: null,
 *  watcher: null,
 *  loaded: false,
 *  visible: false,
 *  hasData: false,
 *  updated: null,
 *  data: {},
 *  markers: [],
 *  selectedMarker: null
 */
const publicParking = (() => {

    /**
     * UpPark parking mapping.
     * @type {{"88": string, "89": string, "90": string, "91": string, "92": string, "82": string, "93": string, "83": string, "94": string, "84": string, "85": string, "86": string, "87": string}}
     */
    const parkingMapping = {
        82: 'Moldova',
        83: 'Mitoc',
        84: 'Primăria Iași',
        85: 'Prefectura Iași',
        86: 'Primăverii',
        87: 'Podu Roșu',
        88: 'Teatru',
        89: 'Victoria',
        90: 'Hala Centrală',
        91: 'Independenței',
        92: 'Golia',
        93: 'Casa Studenților',
        94: 'Anastasie Panu'
    };

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
                value: '64dc-92f1-4b56-9071-1313/22d1082403b780c66b2687f43de783a10c16'
            },
            callback: (json) => {
                app.dataSets.publicParking.data.places = json;
                app.dataSets.publicParking.updated = Date.now();

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
        if (app.dataSets.publicParking.watcher !== null) {
            clearInterval(app.dataSets.publicParking.watcher);
            app.dataSets.publicParking.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.publicParking.watcher = setInterval(() => {

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

        // Refresh data every 3 minutes
        setWatcher(180000, () => {
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
        // Run marker updated rendering (1.5 minutes)
        setWatcher(90000, () => {
            getData(() => {
                render();
            });
        });

        // Mark dataSet visible
        app.dataSets.publicParking.visible = true;
    }

    /**
     * Hide markers.
     */
    function hide() {

        // Return watcher to default value (3 minutes)
        setWatcher(180000, () => {
            getData();
        });

        // Clear pins
        Object.values(app.dataSets.publicParking.markers).forEach((pin) => {
            if (pin.ref) {
                pin.ref.setMap(null);
            }
        });

        // Clean
        app.dataSets.publicParking.markers = [];

        // Mark dataSet hidden
        app.dataSets.publicParking.visible = false;

        // Reset any existing direction service query
        app.events.fire('clearDirectionService');
    }

    /**
     * Render dataSet values.
     */
    function render() {

        // Render parking spots
        if (app.dataSets.publicParking.data.places === undefined) {

            getData(() => {
                render();
            });
        } else {

            // Render parking places
            app.dataSets.publicParking.data.places.forEach((entry) => {

                if (app.dataSets.publicParking.markers[entry.sensorId] === undefined) {
                    app.dataSets.publicParking.markers[entry.sensorId] = {
                        id: entry.sensorId,
                        parking: entry.parkingId,
                        state: entry.stare,
                        ref: new google.maps.Marker({
                            position: {lat: parseFloat(entry.latitude), lng: parseFloat(entry.longitude)},
                            map: app.map.ref,
                            title: entry.numar.toString(),
                            optimized: true,
                            icon: {
                                url: `${app.cdn}pin/public-parking/${entry.stare}.png`,
                                size: new google.maps.Size(22, 35),
                                origin: new google.maps.Point(0, 0),
                                anchor: new google.maps.Point(11, 35),
                                scaledSize: new google.maps.Size(22, 35)
                            }
                        }),
                        lastUpdate: Date.now(),
                        visible: true,
                        popup: `<div id="mapPopup"><header><span class="label parking parking-${entry.stare} ic-mr-10">P</span><h5>${parseInt(entry.stare) === 1 ? 'Liber' : parseInt(entry.stare) === 2 ? 'Ocupat' : 'Rezervat'}</h5></header><main><ul><li><strong>Număr loc parcare</strong>: ${entry.numar}</li><li><strong>Parcare</strong>: ${parkingMapping[entry.parkingId]}</li></ul>${parseInt(entry.stare) === 1 ? `<nav><button class="btn btn-render-direction" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}">Afișează rută <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav>` : ''}</main></div>`
                    };

                    app.dataSets.publicParking.markers[entry.sensorId].ref.addListener('click', () => {

                        // MapPopup visible? Close it.
                        if (app.map.popup) {
                            app.map.popup.close();
                            app.dataSets.publicParking.selectedMarker = null;

                            // Reset any direction service query
                            app.events.fire('clearDirectionService');
                        }

                        // Save selected marker
                        app.dataSets.publicParking.selectedMarker = app.dataSets.publicParking.markers[entry.sensorId].ref;

                        // Create InfoWindow
                        app.map.popup = new google.maps.InfoWindow({
                            content: app.dataSets.publicParking.markers[entry.sensorId]['popup']
                        });

                        // Open popup
                        app.map.popup.open(
                            app.map.ref,
                            app.dataSets.publicParking.selectedMarker
                        );

                        google.maps.event.addListener(app.map.popup, 'domready', () => {
                            const showRouteButton = document.querySelector('.btn-render-direction');
                            if (showRouteButton) {
                                showRouteButton.addEventListener('click', (e) => {

                                    // Get parking place location
                                    let parkingPlaceLat = parseFloat(showRouteButton.getAttribute('data-lat')) || 0,
                                        parkingPlaceLng = parseFloat(showRouteButton.getAttribute('data-lng')) || 0;

                                    // Validate if myLocation has data
                                    try {

                                        if (app.map.direction.service === null) {
                                            app.events.fire('initiateDirectionService');
                                        }

                                        // Validate user location
                                        if (app.me.location.lat === 0 || app.me.location.lng === 0 && app.config.messages['route.error.unableToDetermine']) {
                                            app.notify(app.config.messages['route.error.unableToDetermine'], 'error', 10);
                                        }

                                        if (parkingPlaceLat === 0 || parkingPlaceLng === 0 && app.config.messages['parking.error.unableToDetermineLocation']) {
                                            app.notify(app.config.messages['parking.error.unableToDetermineLocation'], 'error', 10);
                                        }

                                        app.map.direction.service.route({
                                            origin: new google.maps.LatLng(app.me.location.lat, app.me.location.lng),
                                            destination: new google.maps.LatLng(parkingPlaceLat, parkingPlaceLng),
                                            travelMode: 'DRIVING'
                                        }, function (res, status) {
                                            if (status === 'OK') {
                                                app.map.direction.renderer.setDirections(res);
                                            }
                                        });
                                    } catch (err) {
                                        app.notify(err, 'error', 10);
                                    }
                                });
                            }
                        });
                    });

                } else {

                    // Update data
                    app.dataSets.publicParking.markers[entry.sensorId]['state'] = entry.stare;
                    app.dataSets.publicParking.markers[entry.sensorId]['lastUpdate'] = Date.now();
                    app.dataSets.publicParking.markers[entry.sensorId]['popup'] = `<div id="mapPopup"><header><span class="label parking parking-${entry.stare} ic-mr-10">P</span><h5>${parseInt(entry.stare) === 1 ? 'Liber' : parseInt(entry.stare) === 2 ? 'Ocupat' : 'Rezervat'}</h5></header><main><ul><li><strong>Număr loc parcare</strong>: ${entry.numar}</li><li><strong>Parcare</strong>: ${parkingMapping[entry.parkingId]}</li></ul>${parseInt(entry.stare) === 1 ? `<nav><button class="btn btn-render-direction" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}">Afișează rută <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav>` : ''}</main></div>`
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
    app.dataSets.publicParking.app = publicParking;

})();