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
 * Waste collection map rendering.
 */
const wasteCollection = (() => {

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
                value: '544f-2a7a-490a-ac5c-0f79'
            },
            callback: (json) => {
                app.dataSets.wasteCollection.data.vehicles = json;
                app.dataSets.wasteCollection.updated = Date.now();

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
        if (app.dataSets.wasteCollection.watcher !== null) {
            clearInterval(app.dataSets.wasteCollection.watcher);
            app.dataSets.wasteCollection.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.wasteCollection.watcher = setInterval(() => {

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

        // Marker deprecated on February 2024
        const {AdvancedMarkerElement} = google.maps.importLibrary("marker");

        // Refresh data every 2 minutes
        setWatcher(120000, () => {
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
        // Run marker updated rendering (30 seconds)
        setWatcher(30000, () => {
            getData(() => {
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
        setWatcher(120000, () => {
            getData();
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

            getData(() => {
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
                                .position = {lat: entry.LastLatitude, lng: entry.LastLongitude};

                            app.dataSets.airQuality.markers[entry.VehicleId]['lastUpdate'] = entry.LastRecordDT;

                            app.dataSets.airQuality.markers[entry.id]['popup'] =
                                `<div id="mapPopup"><header><h5>${entry.PlateNumber}</h5></header><main><ul><li><strong>Ultima actualizare</strong>: acum ${timeSinceLastUpdate} minute</li></ul></main></div>`;
                        } else {

                            // Create icon
                            let icon = document.createElement('img');
                            icon.src = `${app.cdn}pin/waste-collection/vehicle.png`;
                            icon.width = 22;
                            icon.height = 35;

                            app.dataSets.wasteCollection.markers[entry.VehicleId] = {
                                id: entry.VehicleId,
                                ref: new google.maps.marker.AdvancedMarkerElement({
                                    position: {lat: parseFloat(entry.LastLatitude), lng: parseFloat(entry.LastLongitude)},
                                    map: app.map.ref,
                                    title: entry.PlateNumber,
                                    content: icon
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
    app.dataSets.wasteCollection.app = wasteCollection;

})();