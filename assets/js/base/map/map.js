/**
 * Iași Digital
 * A data-driven perspective of the city.
 *
 * @author Innovator Dev <hello@innovator.dev>
 * @link https://iasi.digital
 * @link https://oras.digital
 *
 * @copyright (c) 2024. Iasi Digital [https://iasi.digital]
 */

'use strict';

/**
 * Observer pattern implementation.
 */
class Observer {

    /**
     * Creates a new Observer instance.
     */
    constructor() {
        this.items = [];
    }

    /**
     * Adds a new observer item.
     *
     * @param name Item name
     * @param callback Item callback function
     */
    add(name, callback) {

        // Create space for observer item name
        if (!this.items[name]) {
            this.items[name] = {name: name, callback: []};
        }

        // Push callback
        this.items[name].callback.push(callback);
    }

    /**
     * Fire all items' callback.
     */
    fireAll() {
        for (let item in this.items) {
            this.fire(item);
        }
    }

    /**
     * Clear all existing callbacks for given name.
     */
    clearAll(name) {
        this.items[name] = {name: name, callback: []};
    }

    /**
     * Fire item callback.
     *
     * @param name
     */
    fire(name) {
        if (this.items[name]) {
            for (let callback in this.items[name].callback) {
                this.items[name].callback[callback]();
            }
        }
    }
}

/**
 * City application.
 *
 * @package base\map
 * @version 1.0
 */
class CityApp {

    /**
     * Creates a new instance of CityApp.
     */
    static initialize() {

        // Bind configuration
        this.config = {};
        this.bindConfig();

        // Bind data
        this.data = {

            // Map configuration
            map: {
                _ref: null,
                center: {
                    lat: 47.1553424,
                    lng: 27.585645
                },
                loaded: false,
                popup: null,

                // Map controls
                controls: {},

                // Direction service
                direction: {
                    loaded: false,
                    service: null,
                    renderer: null
                }
            },

            // DataSets
            dataSets: {}
        };

        // Load map
        this.renderMap();
    }

    /**
     * Call API endpoint.
     *
     * @param {string} url string
     * @param {string} method string
     * @param {string} body string
     * @param {Object} headers Object
     * @return {Promise<Response>}
     */
    static async api(url, method = 'GET', body = '', headers = {}) {

        // Default headers
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Prepare API request
        const request = {
            method: method,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: Object.assign(defaultHeaders, headers),
            body: body ? JSON.stringify(body) : ''
        };

        // POST request?
        if (method === 'GET' || method === 'HEAD') {
            delete request.body;
        }

        return await fetch(url, request);
    }

    /**
     * Load external JavaScript module.
     *
     * @param path URL path of JavaScript module
     * @param callback Callback function
     * @param args Callback function arguments
     */
    static load(path, callback, args) {

        let elements = document.getElementsByTagName('script')[0],
            scr = document.createElement('script');

        if (callback !== undefined && callback !== null) {

            // IE
            scr.onreadystatechange = () => {
                if (scr.readyState === 'loaded' || scr.readyState === 'complete') {
                    scr.onreadystatechange = null;
                    callback(args);
                }
            };

            // Modern browsers
            scr.onload = () => {
                callback(args);
            };
        }

        // Set attributes
        scr.setAttribute('src', path);
        scr.setAttribute('defer', '');

        // Attach script to parent node
        elements.parentNode.appendChild(scr);
    }

    /**
     * Bind application configuration from `config.json`.
     * @return void
     */
    static async bindConfig() {

        const page = document.querySelector('body.page');
        const pageConfig = page.dataset;
        if (pageConfig.bind) {
            // Decode URL and store configuration
            this.config = Object.assign(this.config, JSON.parse(atob(pageConfig.bind)));
        }

        CityApp.api(`config.json`).then((response) => {
            if (!response.ok) {
                return false;
            }
            return response.json();
        }).then((json) => {
            this.config = Object.assign(this.config, json);
        }).catch((err) => {
            console.error(err);
        });
    }

    /**
     * Trigger notification rendering.
     *
     * @param message Notification message
     * @param type (Optional) Notification type (error, info, success, warning)
     * @param autoHide (Optional) Auto hide notification after given seconds
     * @param floating (Optional) Render notification positioned bottom left of the window
     */
    static notification(message, type = 'error', autoHide = 0, floating = true) {

        // Validate container
        const container = document.querySelector('.notification-floating-placeholder');
        if (container) {

            // Check if there are other notifications visible
            const activeNotifiers = container.querySelectorAll('.notification');

            // Prepare notification
            const notification = document.createElement('p');
            notification.classList.add('notification', 'notification-sm');

            // Clear existing class types
            notification.classList.remove('error', 'success', 'info', 'warning');

            // Add type
            notification.classList.add(type);

            // Add message
            notification.innerHTML = message;

            // Floating
            if (floating) {
                notification.classList.add('notification-floating', 'notification-animation');

                // If existing notification, move upper
                if (activeNotifiers.length > 0) {
                    notification.style.bottom = `${(activeNotifiers.length * 45) + 20}px`;
                }
            } else {

                // If existing notification, close it
                if (activeNotifiers.length > 0) {
                    container.innerHTML = '';
                }
            }

            // Append child
            container.appendChild(notification);

            // Auto hide message
            if (autoHide > 0) {

                // Hide notification after seconds
                setTimeout(() => {
                    notification.classList.remove('notification', 'notification-sm', 'notification-inline', 'notification-animation', 'notification-floating', 'error', 'success', 'info', 'warning');
                    notification.innerHTML = '';

                    // Remove child
                    notification.parentNode.removeChild(notification);
                }, (autoHide * 1000));
            }
        }
    }

    /**
     * Calculate date difference between given date and current and returns difference in minutes.
     * @param date Date to compare with current timestamp
     * @param utc (Optional) Flag to calculate date difference in UTC
     * @returns {number|null}
     */
    static dateDiff(date, utc = false) {

        // Normalize date to local time
        let b = date.split(/\D/);

        // Get current date/time in UTC
        let currentDate = new Date();

        // UTC date?
        if (utc) {
            currentDate = new Date(currentDate.getTime() + currentDate.getTimezoneOffset() * 60000)
        }

        // Parsed date
        let parsedDate = new Date(b[0], b[1] - 1, b[2], b[3], b[4], b[5]);

        if (isNaN(currentDate) || isNaN(parsedDate)) {
            return null;
        }

        // Calculate date difference
        const difference = Math.abs(currentDate.getTime() - parsedDate.getTime());
        return Math.floor(difference / 1000 / 60);
    }

    /**
     * Perform fetch request to API.
     * @param props Fetch arguments
     * @returns {boolean}
     *
     * Arguments:
     *  url: API url
     *  method: (Optional) HTTP method. If method value is missing, GET is considered default
     *  postFields: (Optional) POST fields if HTTP method is a POST request
     *  callback: (Optional) Callback method
     */
    static getSetData(props) {
        try {

            // Validate properties
            if (!props.url && this.config.messages['apiCall.error.missingUrl']) {
                throw this.config.messages['apiCall.error.missingUrl'];
            }

            // Perform API call
            this.api(props.url, props.method || 'GET', props.postFields || {})
                .then((response) => {
                    if (!response.ok) {
                        return false;
                    }

                    return response.json();
                })
                .then((json) => {

                    // Callback
                    if (props.callback !== null) {
                        props.callback(json);
                    }
                })
                .catch(err => {
                    return false;
                });

            return true;

        } catch (err) {
            this.notification(err, 'error', 10);
        }
    }

    /**
     * Load Google Map JS and render
     */
    static renderMap() {

        // Container
        const container = document.querySelector('#map');
        if (container && this.config.map) {

            // Load map
            this.load(this.config.map, () => {
                this.data.map._ref = new google.maps.Map(container, {
                    center: this.data.map.center,
                    zoom: 14,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    mapId: '4c67bc89ba82ae84'
                });

                google.maps.event.addListenerOnce(this.data.map._ref, 'tilesloaded', () => {

                    // Mark map as loaded
                    this.data.map.loaded = true;

                    // Load Advanced Marker Element, classic marker is deprecated from February 2024
                    const {AdvancedMarkerElement, PinElement} = google.maps.importLibrary("marker");

                    // Load map controls
                    this.renderMapControls();
                });
            });
        }
    }

    /**
     * Load map controls.
     */
    static renderMapControls() {

        // Controls container
        const mapControls = document.querySelector('.mapControls');
        if (mapControls && this.data.map.loaded) {

            // Create center map control
            const centerMapControlContainer = document.createElement('div');
            centerMapControlContainer.classList.add('mapControlsContainer');

            const centerMapControl = document.createElement('button');
            centerMapControl.classList.add('mapCustomControl');
            centerMapControl.innerHTML = `<span data-icon="&#xe013;"></span>`;
            centerMapControl.title = this.config.labels.centerOnCity;
            centerMapControl.type = 'button';

            centerMapControl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.data.map.center.lat > 0 && this.data.map.center.lng > 0) {
                    // Center map
                    this.data.map._ref.panTo(new google.maps.LatLng(
                        this.data.map.center.lat,
                        this.data.map.center.lng
                    ));

                    // Zoom
                    this.data.map._ref.setZoom(14);
                }
            });

            // Append to container
            centerMapControlContainer.appendChild(centerMapControl);

            // Position custom button
            this.data.map._ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerMapControlContainer);

            // Populate map controls
            this.data.map.controls = {
                spinner: mapControls.querySelector('h2 .spinner'),

                // Mobility
                publicTransportation: mapControls.querySelector('input[type=checkbox][name="toggle.mobility.publicTransportation"]'),
                publicParking: mapControls.querySelector('input[type=checkbox][name="toggle.mobility.publicParking"]'),
                trafficLayer: mapControls.querySelector('input[type=checkbox][name="toggle.mobility.trafficLayer"]'),

                // Environment
                airQuality: mapControls.querySelector('input[type=checkbox][name="toggle.environment.airQuality"]'),
                wasteCollection: mapControls.querySelector('input[type=checkbox][name="toggle.environment.wasteCollection"]')
            };

            // Show map controls panel
            mapControls.classList.remove('hide');

            // Populate map controls
            const dataSetToggle = mapControls.querySelectorAll('.btn-toggle');
            dataSetToggle.forEach((toggle) => {

                // Fetch data attributes (is associated with a dataSet)
                const dataAttr = toggle.dataset;
                if (dataAttr.set) {

                    /**
                     * DataSet schema.
                     * @type {{app: null, watcher: null, loaded: boolean, args: {}, visible: boolean, data: {}, hasData: boolean, selectedMarker: null, markers: *[], updated: null}}
                     */
                    this.data.dataSets[dataAttr.set] = {

                        // Application
                        app: {
                            _ref: null,
                            watcher: null,
                            loaded: false,
                            visible: false
                        },

                        // Data
                        data: {},
                        dataUpdated: null,

                        // Markers
                        markers: [],
                        selectedMarker: null,

                        // Additional properties
                        props: {},

                        /**
                         * Query dataSet API and get data.
                         * @param filter API filter
                         * @param cb Callback
                         * @returns {boolean}
                         */
                        getData(filter, cb) {

                            // Fetch dataSet data
                            return CityApp.getSetData({
                                url: CityApp.config.url,
                                method: 'POST',
                                postFields: {
                                    action: 'fetch',
                                    type: 'api',
                                    value: filter
                                },
                                callback: cb
                            });
                        },

                        /**
                         * Set dataSet update watcher.
                         * @param time Time in milliseconds for watcher to run
                         * @param callback Callback to execute
                         */
                        setWatcher(time, callback) {

                            // Watcher already active
                            if (this.app.watcher !== null) {
                                clearInterval(this.app.watcher);
                                this.app.watcher = null;
                            }

                            // Setup default watcher
                            // Run marker rendering
                            this.app.watcher = setInterval(() => {

                                // Execute callback
                                if (callback !== null) {
                                    callback();
                                }
                            }, time);
                        }
                    };

                    // Load dataSet app
                    if (dataAttr.source) {
                        this.load(dataAttr.source, () => {

                            // Mark dataSet as loaded
                            this.data.dataSets[dataAttr.set].app.loaded = true;

                            // DataSet has data
                            if (this.data.dataSets[dataAttr.set].app._ref.getData()) {
                                this.data.dataSets[dataAttr.set].hasData = true;
                                this.data.dataSets[dataAttr.set].app._ref.init();
                            } else {
                                // Disable controller
                                this.data.map.controls[dataAttr.set].setAttribute('disabled', 'disabled');
                            }
                        });

                        // Enable
                        toggle.addEventListener('click', () => {
                            this.data.map.controls.spinner.classList.remove('hide');

                            // Get input state
                            const toggleChecked = this.data.map.controls[dataAttr.set].checked;
                            if (toggleChecked) {
                                // Show pins
                                this.data.dataSets[dataAttr.set].app._ref.show();
                            } else {
                                // Hide pins and reset watcher
                                this.data.dataSets[dataAttr.set].app._ref.hide();
                            }

                            this.data.map.controls.spinner.classList.add('hide');
                        });
                    }

                    // Traffic layer
                    if (dataAttr.set === 'trafficLayer') {

                        // Enable
                        toggle.addEventListener('click', () => {
                            this.data.map.controls.spinner.classList.remove('hide');

                            // Get input state
                            const toggleChecked = this.data.map.controls[dataAttr.set].checked;
                            if (toggleChecked) {
                                // Show traffic layer
                                this.data.dataSets[dataAttr.set].app._ref = new google.maps.TrafficLayer();
                                this.data.dataSets[dataAttr.set].app._ref.setMap(this.data.map._ref);
                                this.data.dataSets[dataAttr.set].visible = true;
                            } else {
                                // Hide traffic layer
                                this.data.dataSets[dataAttr.set].visible = false;
                                this.data.dataSets[dataAttr.set].app._ref.setMap(null);
                                this.data.dataSets[dataAttr.set].app._ref = null;
                            }

                            this.data.map.controls.spinner.classList.add('hide');
                        });
                    }
                }
            });
        }
    }
}

/**
 * Initialize app.
 */
(() => {

    // Initialize app
    CityApp.initialize();
    window.CityApp = CityApp;


})();