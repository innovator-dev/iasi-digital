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
 * Air Quality sensor resource.
 */
class Sensor {

    /**
     * Air Quality sensor constructor.
     */
    constructor(props) {

        // Sensor identification
        this.id = props.id || 0;
        this.lastUpdate = props.timelast || null;
        this.lastUpdateFriendly = CityApp.dateDiff(new Date(this.lastUpdate * 1000).toISOString(), true);

        // Sensor position
        this.latitude = props.latitude;
        this.longitude = props.longitude;

        // Sensor data
        this.aqi = ('aqi' in props) ? props.aqi : 0;
        this.pm1 = ('last_pm1' in props) ? props.last_pm1 : 0;
        this.pm10 = ('last_pm10' in props) ? props.last_pm10 : 0;
        this.pm25 = ('last_pm25' in props) ? props.last_pm25 : 0;
        this.temperature = ('last_temperature' in props) ? props.last_temperature : 0;
        this.ch2o = ('last_ch2o' in props) ? props.last_ch2o : 0;
        this.co2 = ('last_co2' in props) ? props.last_co2 : 0;
        this.noise = ('last_noise' in props) ? props.last_noise : 0;
        this.humidity = ('last_humidity' in props) ? props.last_humidity : 0;
        this.o3 = ('last_o3' in props) ? props.last_o3 : 0;
        this.voc = ('last_voc' in props) ? props.last_voc : 0;

        // Avg
        this.avgPm1 = ('avg_pm1' in props) ? props.avg_pm1 : 0;
        this.avgPm10 = ('avg_pm10' in props) ? props.avg_pm10 : 0;
        this.avgPm25 = ('avg_pm25' in props) ? props.avg_pm25 : 0;
        this.avgTemperature = ('avg_temperature' in props) ? props.avg_temperature : 0;
        this.avgCh2o = ('avg_ch2o' in props) ? props.avg_ch2o : 0;
        this.avgCo2 = ('avg_co2' in props) ? props.avg_co2 : 0;
        this.avgNoise = ('avg_noise' in props) ? props.avg_noise : 0;
        this.avgHumidity = ('avg_humidity' in props) ? props.avg_humidity : 0;
        this.avgO3 = ('avg_o3' in props) ? props.avg_o3 : 0;
        this.avgVoc = ('avg_voc' in props) ? props.avg_voc : 0;
    }

    /**
     * Calculate air quality index (AQI).
     * @param concentration
     * @returns {{css: string, color: string, heading: string, aqi: string, description: string}|{css: string, color: string, heading: *, aqi: string, description: *}}
     */
    static getAQI(concentration) {

        if (concentration >= 0 && concentration <= 12) {
            return {
                color: '#00e400',
                heading: CityApp.config.messages['airQuality.title.healthy'],
                description: CityApp.config.messages['airQuality.message.healthy'],
                aqi: '0 - 12',
                css: 'good'
            };
        } else if (concentration > 12 && concentration <= 35) {
            return {
                color: '#ffff00',
                heading: CityApp.config.messages['airQuality.title.moderate'],
                description: CityApp.config.messages['airQuality.message.moderate'],
                aqi: '12 - 35',
                css: 'moderate'
            };
        } else if (concentration > 35 && concentration <= 55) {
            return {
                color: '#ff7d00',
                heading: CityApp.config.messages['airQuality.title.sensitive'],
                description: CityApp.config.messages['airQuality.message.sensitive'],
                aqi: '35 - 55',
                css: 'unhealthy-sensitive'
            };
        } else if (concentration > 55 && concentration <= 150) {
            return {
                color: '#fe0000',
                heading: CityApp.config.messages['airQuality.title.unhealthy'],
                description: CityApp.config.messages['airQuality.message.unhealthy'],
                aqi: '55 - 150',
                css: 'unhealthy'
            };
        } else if (concentration > 150 && concentration <= 250) {
            return {
                color: '#99004c',
                heading: CityApp.config.messages['airQuality.title.veryUnhealthy'],
                description: CityApp.config.messages['airQuality.message.veryUnhealthy'],
                aqi: '150 - 250',
                css: 'very-unhealthy'
            };
        } else if (concentration > 250 && concentration <= 500) {
            return {
                color: '#7e0022',
                heading: CityApp.config.messages['airQuality.title.hazardous'],
                description: CityApp.config.messages['airQuality.message.hazardous'],
                aqi: '250 - 500',
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
}

/**
 * Air Quality application.
 * Consuming OpenData Iași Portal.
 */
class AirQuality extends DataSet {

    /**
     * DataSet API handler.
     * @type {string}
     */
    static dataSet = 'cf3f-2309-44d1-8e0c-1137';

    /**
     * AQI scale.
     * @type {{pm25: number[], pm10: number[]}}
     */
    static aqiScale = {
        pm25: [0, 12, 35.5, 55.5, 150.5, 250.5, 350.5, 500.5],
        pm10: [0, 55, 155, 255, 355, 425, 505, 605]
    };

    /**
     * AQI range.
     * @type {{pm25: number[], pm10: number[]}}
     */
    static aqiRange = {
        pm25: [0, 50, 100, 150, 200, 300, 400, 500],
        pm10: [0, 50, 100, 150, 200, 300, 400, 500]
    };

    /**
     * Initialize app.
     */
    init() {

        // Refresh data every 5 minute
        AirQuality.setWatcher(300000, () => {
            this.getData();
        });
    }

    /**
     * Fetch data from API.
     * @param callback Callback method
     * @returns {boolean}
     */
    getData(callback = null) {
        return AirQuality.fetch(AirQuality.dataSet, (json) => {
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
            this.data.forEach((entry) => {

                // Create a new sensor instance
                const sensor = new Sensor(entry);

                // Validate sensor data
                if (sensor.latitude && sensor.longitude && sensor.lastUpdateFriendly < 1440 && entry.city === 'Iasi') {

                    // Get AQI
                    const aqi = Sensor.getAQI(sensor.avgPm25);

                    if (this.markers[sensor.id]) {

                        // Show marker if hidden
                        if (!this.markers[sensor.id].isVisible && this.markers[sensor.id]._ref) {
                            this.markers[sensor.id]._ref.setMap(CityApp.data.map._ref);
                            this.markers[sensor.id].isVisible = true;
                        }

                        // Update center
                        this.markers[sensor.id]._ref.setCenter(new google.maps.LatLng(sensor.latitude, sensor.longitude));

                    } else {

                        // Markers
                        this.markers[sensor.id] = {
                            id: sensor.id,
                            _ref: new google.maps.Circle({
                                strokeColor: aqi.color,
                                strokeOpacity: .3,
                                strokeWeight: 1,
                                fillColor: aqi.color,
                                fillOpacity: .4,
                                map: CityApp.data.map._ref,
                                center: {lat: parseFloat(sensor.latitude), lng: parseFloat(sensor.longitude)},
                                radius: 150
                            }),
                            isVisible: true
                        };

                        // Open popup
                        this.markers[sensor.id]._ref.addListener('click', () => {

                            // Close InfoWindow
                            CityApp.mapUtils('closePopup');

                            // Create InfoWindow
                            CityApp.mapUtils('createPopup', {
                                title: aqi.heading,
                                titleLabel: sensor.avgPm25,
                                titleLabelClass: [`aqi`, `aqi-${aqi.css}`],
                                content: `<p>${aqi.description}</p><h6>${CityApp.config.labels['airQuality.sensorValues']}</h6><ul><li>${CityApp.config.labels['airQuality.pm1']}: ${sensor.avgPm1} µg/m³</li><li>${CityApp.config.labels['airQuality.pm25']}: ${sensor.avgPm25} µg/m³</li><li>${CityApp.config.labels['airQuality.pm10']}: ${sensor.avgPm10} µg/m³</li><li>${CityApp.config.labels['airQuality.temperature']}: ${sensor.avgTemperature}<span data-icon="&#xe00c;"></span></li></ul><h6>${CityApp.config.labels['airQuality.lastUpdate']}</h6><p>${new Date(sensor.lastUpdate * 1000).toLocaleString('ro-RO', {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric"
                                })}</p>`,
                                position: this.markers[sensor.id]._ref.getCenter()
                            });

                            // Show InfoWindow
                            CityApp.mapUtils('openPopup', {ref: this.markers[sensor.id]._ref});
                        });
                    }
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

            // Mark markers as visible
            this.isVisible = true;
        }

        // Callback
        if (callback) {
            callback();
        }
    }

    /**
     * Hide markers from the map.
     * @param callback Callback method
     */
    hide(callback = null) {

        // Clear markers
        Object.values(this.markers).forEach((pin) => {
            if (pin._ref) {
                pin._ref.setMap(null);
                pin.isVisible = false;
            }
        });

        // Set application is not visible
        this.isVisible = false;

        // Clear update watcher
        AirQuality.clearWatcher();

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
    CityApp.data.sets.airQuality = new AirQuality();
})();