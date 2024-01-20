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
 */
const publicParking = (() => {

    /**
     * Data Set url.
     * @type {string}
     */
    const url = 'https://opendata.oras.digital/api/proxy/';

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
     * Perform fetch request to API, vehicles endpoint.
     * @param callback Fetch callback method
     * @returns {boolean}
     */
    function fetch(callback = null) {

        app.api(`${url}`, 'POST', {
            action: 'fetch',
            type: 'api',
            value: '64dc-92f1-4b56-9071-1313/22d1082403b780c66b2687f43de783a10c16'
        }).then((response) => {
            if (!response.ok) {
                return false;
            }

            return response.json();
        }).then((json) => {
            app.dataSets.publicParking.data.places = json;
            app.dataSets.publicParking.updated = Date.now();

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
        if (app.dataSets.publicParking.watcher !== null) {
            clearInterval(app.dataSets.publicParking.watcher);
            app.dataSets.publicParking.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.publicParking.watcher = setInterval(() => {
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

        // Refresh data every 2 minutes
        // Disable refresh watcher at init
        // setWatcher(120000, () => {
        //    fetch();
        // });
    }

    /**
     * Show markers on map.
     */
    function show() {

        // Render pins
        render();

        // Setup watcher
        // Run marker rendering
        setWatcher(60000, () => {
            fetch(() => {
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

        // Return watcher to default value (2 minutes)
        setWatcher(120000, () => {
            fetch();
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

        // Reset any direction service query
        app.events.fire('clearDirectionService');
    }

    /**
     * Render dataSet values.
     */
    function render() {

        // Render parking spots
        if (app.dataSets.publicParking.data.places === undefined) {

            fetch(() => {
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
                                size: new google.maps.Size(28, 44),
                                origin: new google.maps.Point(0, 0),
                                anchor: new google.maps.Point(0, 22),
                                scaledSize: new google.maps.Size(28, 44)
                            }
                        }),
                        lastUpdate: Date.now(),
                        visible: true,
                        popup: `<div id="mapPopup"><header><span class="label parking parking-${entry.stare} ic-mr-10">P</span><h5>${parseInt(entry.stare) === 1 ? 'Liber' : parseInt(entry.stare) === 2 ? 'Ocupat' : 'Rezervat'}</h5></header><main><ul><li><strong>Număr loc parcare</strong>: ${entry.numar}</li><li><strong>Parcare</strong>: ${parkingMapping[entry.parkingId]}</li></ul><nav><button class="btn btn-render-direction" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}">Afișează rută <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav></main></div>`
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
                                    if (app.me.location.lat === 0 || app.me.location.lng === 0) {
                                        throw `Nu a putut fi determinată poziția. Pentru a putea afișa traseul, este necesară activarea locației.`;
                                    }

                                    if (parkingPlaceLat === 0 || parkingPlaceLng === 0) {
                                        throw `Nu a putut fi determinată poziția locului de parcare.`;
                                    }

                                    app.map.direction.service.route({
                                        origin: new google.maps.LatLng(app.me.location.lat, app.me.location.lng),
                                        destination: new google.maps.LatLng(parkingPlaceLat, parkingPlaceLng),
                                        travelMode: 'DRIVING'
                                    }, function (res, status) {
                                        if (status === 'OK') {
                                            console.log(res);
                                            app.map.direction.renderer.setDirections(res);
                                        }
                                    });
                                } catch (err) {
                                    app.notify(err, 'error', 10);
                                }
                            });
                        });
                    });

                } else {

                    // Update data
                    app.dataSets.publicParking.markers[entry.sensorId]['state'] = entry.stare;
                    app.dataSets.publicParking.markers[entry.sensorId]['lastUpdate'] = Date.now();
                    app.dataSets.publicParking.markers[entry.sensorId]['popup'] = `<div id="mapPopup"><header><span class="label parking parking-${entry.stare} ic-mr-10">P</span><h5>${parseInt(entry.stare) === 1 ? 'Liber' : parseInt(entry.stare) === 2 ? 'Ocupat' : 'Rezervat'}</h5></header><main><ul><li><strong>Număr loc parcare</strong>: ${entry.numar}</li><li><strong>Parcare</strong>: ${parkingMapping[entry.parkingId]}</li></ul><nav><button class="btn  btn-render-direction" data-lat="${parseFloat(entry.latitude)}" data-lng="${parseFloat(entry.longitude)}">Afișează rută <span data-icon="&#xe018;" class="ic-ml-5"></span></button></nav></main></div>`
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
    app.dataSets.publicParking.app = publicParking;

})();