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
 * Public Parking application.
 * Consuming OpenData Iași Portal.
 */
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
    static clusterImage = 'PHN2ZyBmaWxsPSIjNGNhY2Y2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIj4KICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgb3BhY2l0eT0iMSIgcj0iNzAiPjwvY2lyY2xlPgogICAgICAgICAgICAgICAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiBvcGFjaXR5PSIuNyIgcj0iOTAiPjwvY2lyY2xlPgogICAgICAgICAgICAgICAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiBvcGFjaXR5PSIuMyIgcj0iMTEwIj48L2NpcmNsZT4KICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9IjEyMCIgY3k9IjEyMCIgb3BhY2l0eT0iLjIiIHI9IjEzMCI+PC9jaXJjbGU+CiAgICAgICAgICAgICAgICA8L3N2Zz4=';

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

                // Pin label
                const label = document.createElement('div');
                label.innerText = 'P';

                // Custom marker
                const pin = new google.maps.marker.PinElement({
                    glyphColor: '#fff',
                    background: parseInt(parking.stare) === 2 ? '#f64c4c' : '#4cacf6',
                    borderColor: parseInt(parking.stare) === 2 ? '#e83636' : '#3893d9',
                    glyph: label
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
                            title: this.markers[parking.sensorId].state === 1 ? CityApp.config.labels['parking.parkingFree'] : CityApp.config.labels['parking.parkingOccupied'],
                            titleLabel: `P`,
                            titleLabelClass: [`parking`, `parking-${this.markers[parking.sensorId].state}`],
                            content: `<ul><li>${CityApp.config.labels['parking.name']}: ${PublicParking.parkingMapping[this.markers[parking.sensorId].parkingId]}</li><li>${CityApp.config.labels['parking.number']}: ${this.markers[parking.sensorId].number}</li></ul><nav><a href="https://www.waze.com/ul?ll=${parseFloat(parking.latitude)}%2C${parseFloat(parking.longitude)}&navigate=yes&zoom=17" target="_blank" class="btn btn-default btn-sm"><span class="ic-mr-5" data-icon="&#xe023;"></span> ${CityApp.config.labels['parking.deepLinkWaze']}</a><a href="https://www.google.com/maps/dir/?api=1&travelmode=driving&dir_action=navigate&destination=${parseFloat(parking.latitude)}%2C${parseFloat(parking.longitude)}" target="_blank" class="btn btn-default btn-sm"><span class="ic-mr-5" data-icon="&#xe02a;"></span> ${CityApp.config.labels['parking.deepLinkMaps']}</a></nav>`
                        });

                        // Show InfoWindow
                        CityApp.mapUtils('openPopup', {ref: this.markers[parking.sensorId]._ref});
                    });
                }
            });

            // Metrics
            this.metrics.parkingFree = this.data.filter((parking) => parking.stare === 1).length;
            this.metrics.parkingOccupied = this.data.length - this.metrics.parkingFree;
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
                    markers: PublicParking.clusterMarkers,
                    renderer: {
                        render: ({count, position}) =>
                            new google.maps.Marker({
                                label: {text: String(count), color: "#fff", fontSize: "13px", fontWeight: "600"},
                                icon: {
                                    url: `data:image/svg+xml;base64,${PublicParking.clusterImage}`,
                                    scaledSize: new google.maps.Size(46, 46),
                                },
                                position,
                                // adjust zIndex to be above other markers
                                zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
                            })
                    }
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
            this.getData();
        });

        // Clear cluster
        if (PublicParking.cluster) {
            PublicParking.cluster.clearMarkers();
            PublicParking.cluster = null;
        }

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
    CityApp.data.sets.publicParking = new PublicParking();
})();