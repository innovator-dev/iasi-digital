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
 * Air quality sensors map rendering.
 */
const airQuality = (() => {

    /**
     * AQI scale.
     * @type {{pm25: number[], pm10: number[]}}
     */
    const aqiScale = {
        pm25: [0, 12, 35.5, 55.5, 150.5, 250.5, 350.5, 500.5],
        pm10: [0, 55, 155, 255, 355, 425, 505, 605]
    };

    /**
     * AQI range.
     * @type {{pm25: number[], pm10: number[]}}
     */
    const aqiRange = {
        pm25: [0, 50, 100, 150, 200, 300, 400, 500],
        pm10: [0, 50, 100, 150, 200, 300, 400, 500]
    };

    /**
     * Calculate AQI based on given concentration and pollutant.
     * @param concentration
     * @param pollutant
     * @returns {number|null}
     */
    function calculateAqi(concentration, pollutant) {
        if (aqiScale[pollutant] === undefined || aqiRange[pollutant] === undefined) {
            return null;
        }

        const range = aqiRange[pollutant];
        const scale = aqiScale[pollutant];

        for (let i = 0; i < scale.length - 1; i++) {
            if (concentration >= scale[i] && concentration < scale[i + 1]) {
                return Math.round(range[i] + (concentration - scale[i]) * (range[i + 1] - range[i]) / (scale[i + 1] - scale[i]));
            }
        }
    }

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
                value: 'cf3f-2309-44d1-8e0c-1137'
            },
            callback: (json) => {
                app.dataSets.airQuality.data.senzors = json;
                app.dataSets.airQuality.updated = Date.now();

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
        if (app.dataSets.airQuality.watcher !== null) {
            clearInterval(app.dataSets.airQuality.watcher);
            app.dataSets.airQuality.watcher = null;
        }

        // Setup default watcher
        // Run marker rendering
        app.dataSets.airQuality.watcher = setInterval(() => {

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
        // Run marker updated rendering (2 minutes)
        setWatcher(120000, () => {
            getData(() => {
                render();
            });
        });

        // Mark dataSet visible
        app.dataSets.airQuality.visible = true;
    }

    /**
     * Hide markers.
     */
    function hide() {

        // Return watcher to default value
        setWatcher(180000, () => {
            getData();
        });

        // Clear pins
        Object.values(app.dataSets.airQuality.markers).forEach((pin) => {
            if (pin.ref) {
                pin.ref.setMap(null);
            }
        });

        // Clean
        app.dataSets.airQuality.markers = [];

        // Mark dataSet hidden
        app.dataSets.airQuality.visible = false;
    }

    /**
     * Render dataSet values.
     */
    function render() {

        if (app.dataSets.airQuality.data.senzors === undefined) {

            getData(() => {
                render();
            });
        } else {

            if (app.dataSets.airQuality.data.senzors.length > 0) {
                app.dataSets.airQuality.data.senzors.forEach((entry) => {

                    if (entry.latitude && entry.longitude && entry.city === 'Iasi') {
                        if (app.dataSets.airQuality.markers[entry.id]) {

                            // Get AQI level representative color
                            let aqi = getAQI(entry.avg_pm25);

                            app.dataSets.airQuality.markers[entry.id]['ref']
                                .setCenter(new google.maps.LatLng(entry.latitude, entry.longitude));

                            app.dataSets.airQuality.markers[entry.id]['lastUpdate'] = entry.timelast;

                            app.dataSets.airQuality.markers[entry.id]['popup'] =
                                `<div id="mapPopup"><header>${entry.avg_pm25 !== null ? `<span class="label ic-mr-10 aqi aqi-${aqi.css}">${entry.avg_pm25}</span>` : ''}<h5>${aqi.heading}</h5></header><main><p>${aqi.description}</p><h6>Valori senzori:</h6><ul><li><strong>PM 1</strong>: ${entry.avg_pm1}</li><li><strong>PM 2.5</strong>: ${entry.avg_pm25}</li><li><strong>PM 10</strong>: ${entry.avg_pm10}</li></ul></main></div>`;
                        } else {

                            // Get AQI level representative color
                            let aqi = getAQI(entry.avg_pm25);

                            app.dataSets.airQuality.markers[entry.id] = {
                                id: entry.id,
                                aqi: aqi,
                                avg_temperature: entry.avg_temperature,
                                avg_pressure: entry.avg_pressure,
                                avg_humidity: entry.avg_humidity,
                                avg_co2: entry.avg_co2,
                                avg_ch2o: entry.avg_ch2o,
                                avg_o3: entry.avg_o3,
                                avg_pm1: entry.avg_pm1,
                                avg_pm25: entry.avg_pm25,
                                avg_pm10: entry.avg_pm10,
                                ref: entry.avg_pm25 ?
                                    new google.maps.Circle({
                                        strokeColor: aqi.color,
                                        strokeOpacity: .3,
                                        strokeWeight: 1,
                                        fillColor: aqi.color,
                                        fillOpacity: .4,
                                        map: app.map.ref,
                                        center: {lat: parseFloat(entry.latitude), lng: parseFloat(entry.longitude)},
                                        radius: 150
                                    }) : null,
                                lastUpdate: entry.timelast,
                                visible: true,
                                popup: `<div id="mapPopup"><header>${entry.avg_pm25 !== null ? `<span class="label ic-mr-10 aqi aqi-${aqi.css}">${entry.avg_pm25}</span>` : ''}<h5>${aqi.heading}</h5></header><main><p>${aqi.description}</p><h6>Valori senzori:</h6><ul><li><strong>PM 1</strong>: ${entry.avg_pm1}</li><li><strong>PM 2.5</strong>: ${entry.avg_pm25}</li><li><strong>PM 10</strong>: ${entry.avg_pm10}</li></ul></main></div>`
                            };

                            if (app.dataSets.airQuality.markers[entry.id].ref !== null) {
                                app.dataSets.airQuality.markers[entry.id].ref.addListener('click', () => {

                                    // MapPopup visible? Close it.
                                    if (app.map.popup !== null) {
                                        app.map.popup.close();
                                        app.dataSets.airQuality.selectedMarker = null;
                                    }

                                    // Save selected marker
                                    app.dataSets.airQuality.selectedMarker = app.dataSets.airQuality.markers[entry.id].ref;

                                    // Create InfoWindow
                                    app.map.popup = new google.maps.InfoWindow({
                                        content: app.dataSets.airQuality.markers[entry.id].popup
                                    });

                                    // Set center
                                    app.map.popup.setPosition(app.dataSets.airQuality.selectedMarker.getCenter());

                                    // Open popup
                                    app.map.popup.open(
                                        app.map.ref,
                                        app.dataSets.airQuality.selectedMarker
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
     * Get AQI range, summary and colors for a given concentration.
     *
     * @param concentration
     * @return {{css: string, color: string, aqi: string, description: string}}
     */
    function getAQI(concentration) {

        if (concentration >= 0 && concentration <= 50) {
            return {
                color: '#00e400',
                heading: app.config.messages['airQuality.title.healthy'],
                description: app.config.messages['airQuality.message.healthy'],
                aqi: '0 - 50',
                css: 'good'
            };
        } else if (concentration > 50 && concentration <= 100) {
            return {
                color: '#ffff00',
                heading: app.config.messages['airQuality.title.moderate'],
                description: app.config.messages['airQuality.message.moderate'],
                aqi: '51 - 100',
                css: 'moderate'
            };
        } else if (concentration > 100 && concentration <= 150) {
            return {
                color: '#ff7d00',
                heading: app.config.messages['airQuality.title.sensitive'],
                description: app.config.messages['airQuality.message.sensitive'],
                aqi: '101 - 150',
                css: 'unhealthy-sensitive'
            };
        } else if (concentration > 150 && concentration <= 200) {
            return {
                color: '#fe0000',
                heading: app.config.messages['airQuality.title.unhealthy'],
                description: app.config.messages['airQuality.message.unhealthy'],
                aqi: '151 - 200',
                css: 'unhealthy'
            };
        } else if (concentration > 200 && concentration <= 300) {
            return {
                color: '#99004c',
                heading: app.config.messages['airQuality.title.veryUnhealthy'],
                description: app.config.messages['airQuality.message.veryUnhealthy'],
                aqi: '201 - 300',
                css: 'very-unhealthy'
            };
        } else if (concentration > 400 && concentration <= 500) {
            return {
                color: '#7e0022',
                heading: app.config.messages['airQuality.title.hazardous'],
                description: app.config.messages['airQuality.message.hazardous'],
                aqi: '401 - 500',
                css: 'hazardous'
            };
        } else {
            return {
                color: 'transparent',
                heading: '',
                description: '',
                aqi: '',
                css: ''
            };
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
    app.dataSets.airQuality.app = airQuality;

})();