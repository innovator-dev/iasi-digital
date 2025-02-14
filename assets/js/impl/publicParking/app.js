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

class PublicParking extends DataSet {

    /**
     * UpPark parking mapping.
     * @type {{"88": string, "89": string, "90": string, "91": string, "92": string, "82": string, "93": string, "83": string, "94": string, "84": string, "85": string, "86": string, "87": string}}
     */
    static parkingMapping = {
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
     * DataSet API handler.
     * @type {string}
     */
    static dataSetFilter = '64dc-92f1-4b56-9071-1313/22d1082403b780c66b2687f43de783a10c16';

    /**
     * MarkerCluster
     * @link https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js
     */
    static cluster = null;
    static clusterMarkers = [];

    /**
     * Selected marker.
     */
    static selectedMarker = null;

    /**
     * Initialize app.
     */
    init() {

        // Refresh data every 5 minute
        PublicParking.setWatcher(300000, () => {
            this.getData();
        });

        // Load markerCluster library
        CityApp.load(`https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js`);
    }

    /**
     * Fetch data from API.
     * @param callback Callback method
     * @returns {boolean}
     */
    getData(callback = null) {
        return PublicParking.fetch(PublicParking.dataSetFilter, (json) => {
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
            this.data.forEach((parking) => {

                // Custom marker
                const pin = new google.maps.marker.PinElement({
                    glyphColor: '#fff',
                    background: parseInt(parking.stare) === 2 ? '#f64c4c' : '#4cacf6',
                    borderColor: parseInt(parking.stare) === 2 ? '#e83636' : '#3893d9',
                    glyph: 'P'
                });

                if (this.markers[parking.sensorId]) {

                    // Update parking spot data
                    if (this.markers[parking.sensorId]['state'] !== parking.stare) {
                        this.markers[parking.sensorId]['_ref']['content'] = pin.element;
                        this.markers[parking.sensorId]['state'] = entry.stare;
                        this.markers[parking.sensorId]['dateUpdated'] = Date.now();
                    }
                } else {

                    // Marker
                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        position: {lat: parseFloat(parking.latitude), lng: parseFloat(parking.longitude)},
                        // map: CityApp.data.map._ref,
                        title: parking.numar.toString(),
                        content: pin.element
                    });

                    this.markers[parking.sensorId] = {
                        id: parking.sensorId,
                        parkingId: parking.parkingId,
                        number: parking.numar,
                        state: parking.stare,
                        _ref: marker,
                        dateUpdated: Date.now(),
                        isVisible: false
                    };

                    // Add marker
                    PublicParking.clusterMarkers.push(marker);

                    // Open popup
                    this.markers[parking.sensorId]._ref.addListener('click', () => {
                        PublicParking.selectedMarker = this.markers[parking.sensorId]._ref;

                        // Show InfoWindow
                        CityApp.mapUtils('closePopup');

                        // Create InfoWindow
                        CityApp.mapUtils('createPopup', {
                            title: this.markers[parking.sensorId].state === 1 ? CityApp.config.labels.parkingFree : CityApp.config.labels.parkingOccupied,
                            titleLabel: `P`,
                            titleLabelClass: [`parking`, `parking-${this.markers[parking.sensorId].state}`],
                            content: `<ul><li>Parcare: ${PublicParking.parkingMapping[this.markers[parking.sensorId].parkingId]}</li><li>Număr loc parcare: ${this.markers[parking.sensorId].number}</li></ul>`
                        });

                        // Show InfoWindow
                        CityApp.mapUtils('openPopup', {ref: this.markers[parking.sensorId]._ref});
                    });
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

            // Show MarkerCluster
            if (markerClusterer !== undefined && markerClusterer.MarkerClusterer !== undefined && PublicParking.cluster === null) {
                PublicParking.cluster = new markerClusterer.MarkerClusterer({
                    map: CityApp.data.map._ref,
                    markers: PublicParking.clusterMarkers
                });
            }

            // Setup watcher
            // Run marker updated rendering (3 minutes)
            PublicParking.setWatcher(180000, () => {
                this.getData(() => {
                    this.render();
                });
            });

            // Mark markers as visible
            this.isVisible = true;

            // Callback
            if (callback) {
                callback();
            }
        }
    }

    /**
     * Hide markers from the map.
     * @param callback Callback method
     */
    hide(callback = null) {

        this.isVisible = false;

        // Return watcher to default value
        PublicParking.setWatcher(300000, () => {
            this.getData(() => {
                this.render();
            });
        });

        // Clear cluster
        if (PublicParking.cluster) {
            PublicParking.cluster.clearMarkers();
            PublicParking.cluster = null;
        }
    }
}

/**
 * Initialize app.
 */
(() => {
    CityApp.data.sets.publicParking = new PublicParking();
})();