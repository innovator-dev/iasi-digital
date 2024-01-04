/**
 * Iași Digital
 * A data-driven perspective of the city.
 *
 * @author Innovator Dev <hello@innovator.dev>
 * @link https://oras.digital
 * @link https://iasi.digital
 *
 * @copyright (c) Iasi Digital [https://iasi.digital]
 */

'use strict';

/**
 * Waste collection map rendering.
 */
const wasteCollection = (() => {

    /**
     * Data Set url.
     * @type {string}
     */
    const url = 'https://opendata.oras.digital/api/proxy/';

    /**
     * Perform fetch request to API.
     * @param callback Fetch callback method
     * @returns {boolean}
     */
    function fetch(callback = null) {

        app.api(`${url}`, 'POST', {
            action: 'fetch',
            type: 'api',
            value: '544f-2a7a-490a-ac5c-0f79'
        }).then((response) => {
            if (!response.ok) {
                return false;
            }

            return response.json();
        }).then((json) => {
            app.dataSets.wasteCollection.data.vehicles = json;
            app.dataSets.wasteCollection.updated = Date.now();

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
        if (app.dataSets.wasteCollection.watcher !== null) {
            clearInterval(app.dataSets.wasteCollection.watcher);
            app.dataSets.wasteCollection.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.wasteCollection.watcher = setInterval(() => {
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

        setWatcher(120000, () => {
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
        app.dataSets.wasteCollection.visible = true;
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
        Object.values(app.dataSets.wasteCollection.markers).forEach((pin) => {
            if (pin.ref) {
                pin.ref.setMap(null);
            }
        });

        // Clean
        app.dataSets.wasteCollection.markers = [];

        // Mark dataSet hidden
        app.dataSets.wasteCollection.visible = false;
    }

    /**
     * Render dataSet values.
     */
    function render() {

        if (app.dataSets.wasteCollection.data.vehicles === undefined) {

            fetch(() => {
                render();
            });
        } else {

            if (app.dataSets.wasteCollection.data.vehicles.length > 0) {
                app.dataSets.wasteCollection.data.vehicles.forEach((entry) => {

                    // Calculate time since last update
                    let timeSinceLastUpdate = app.dateDiff(entry.LastRecordDT);

                    if (entry.LastLatitude && entry.LastLongitude) {
                        if (app.dataSets.wasteCollection.markers[entry.VehicleId]) {

                            app.dataSets.wasteCollection.markers[entry.VehicleId]['ref']
                                .setCenter(new google.maps.LatLng(entry.LastLatitude, entry.LastLongitude));

                            app.dataSets.airQuality.markers[entry.VehicleId]['lastUpdate'] = entry.LastRecordDT;

                            app.dataSets.airQuality.markers[entry.id]['popup'] =
                                `<div id="mapPopup"><header><h5>${entry.PlateNumber}</h5></header><main><ul><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li></ul></main></div>`;
                        } else {

                            app.dataSets.wasteCollection.markers[entry.VehicleId] = {
                                id: entry.VehicleId,
                                ref: new google.maps.Marker({
                                    position: {lat: parseFloat(entry.LastLatitude), lng: parseFloat(entry.LastLongitude)},
                                    map: app.map.ref,
                                    title: entry.PlateNumber,
                                    optimized: true,
                                    icon: {
                                        url: `${app.cdn}pin/waste-collection/vehicle.png`,
                                        size: new google.maps.Size(28, 44),
                                        origin: new google.maps.Point(0, 0),
                                        anchor: new google.maps.Point(0, 22),
                                        scaledSize: new google.maps.Size(28, 44)
                                    }
                                }),
                                lastUpdate: entry.LastRecordDT,
                                visible: true,
                                popup: `<div id="mapPopup"><header><h5>${entry.PlateNumber}</h5></header><main><ul><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li></ul></main></div>`
                            };

                            if (app.dataSets.wasteCollection.markers[entry.VehicleId].ref !== null) {
                                app.dataSets.wasteCollection.markers[entry.VehicleId].ref.addListener('click', () => {

                                    // MapPopup visible? Close it.
                                    if (app.map.popup !== null) {
                                        app.map.popup.close();
                                        app.dataSets.wasteCollection.selectedMarker = null;
                                    }

                                    // Save selected marker
                                    app.dataSets.wasteCollection.selectedMarker = app.dataSets.wasteCollection.markers[entry.VehicleId].ref;

                                    // Create InfoWindow
                                    app.map.popup = new google.maps.InfoWindow({
                                        content: app.dataSets.wasteCollection.markers[entry.VehicleId].popup
                                    });

                                    // Open popup
                                    app.map.popup.open(
                                        app.map.ref,
                                        app.dataSets.wasteCollection.selectedMarker
                                    );
                                });
                            }
                        }
                    }
                });
            }
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
    app.dataSets.wasteCollection.app = wasteCollection;

})();