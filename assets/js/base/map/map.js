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
 * DataSet resource.
 */
class DataSet {

    /**
     * DataSet constructor.
     */
    constructor() {

        // Configuration and state variables
        this._ref = null;
        this.watcher = null;
        this.isVisible = false;

        // Data
        this.data = {};

        // Markers
        this.markers = [];

        // Props
        this.props = {};

        // Metrics
        this.metrics = {}
    }

    /**
     * Query dataSet API and get data.
     * @param filter API filter
     * @param cb Callback
     * @returns {boolean}
     */
    static fetch(filter, cb) {

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
    }

    /**
     * Set dataSet update watcher.
     * @param time Time in milliseconds for watcher to run
     * @param callback Callback to execute
     */
    static setWatcher(time, callback) {

        // Watcher already active
        this.clearWatcher();

        // Setup default watcher
        // Run marker rendering
        this.watcher = setInterval(() => {

            // Execute callback
            if (callback !== null) {
                callback();
            }
        }, time);
    }

    /**
     * Clears dataSet update watcher.
     */
    static clearWatcher() {

        if (this.watcher !== null) {
            clearInterval(this.watcher);
            this.watcher = null;
        }
    }

    /**
     * Init data set consumer application.
     */
    init() {
    }

    /**
     * Show data set on the map.
     * @param callback Callback method
     */
    show(callback = null) {
    }

    /**
     * Hide data set.
     * @param callback Callback method
     */
    hide(callback = null) {
    }

    /**
     * Render data set on the map.
     * @param callback Callback method
     */
    render(callback = null) {
    }

    /**
     * Check if current dataset has data.
     * @returns {boolean}
     */
    hasData() {
        return Object.keys(this.data).length > 0;
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
    static init() {

        // Events container
        this.events = new Observer();

        // Bind configuration
        this.config = {};
        this.bindConfig();

        // Data
        this.data = {

            // Map
            map: {

                // Map reference
                _ref: null,

                // Initial position
                center: {
                    lat: 47.1553424,
                    lng: 27.585645
                },

                isLoaded: false,
                popup: null,

                // Controls
                controls: {}
            },

            // Data sets
            sets: {},

            // Services
            services: {},

            // User
            user: {

                // Map reference
                _ref: null,

                // Watcher
                watcher: null,

                // Location
                coordinates: {
                    lat: 0,
                    lng: 0
                },

                isPersistent: false,
                isVisible: false,

                // Extra proprieties
                props: {}
            }
        };

        // Load map
        this.loadMap();
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
                .catch(() => {
                    return false;
                });

        } catch (err) {
            this.notification(err, 'error', 10);
        }

        return true;
    }

    /**
     * Perform map related actions.
     *
     * @param action Map action
     * @param props Action properties
     */
    static mapUtils(action, props = {}) {

        // Create popup infoWindow
        if (action === 'createPopup') {
            if (!'title' in props || !'content' in props) {
                throw new SyntaxError('Syntax error while performing <createPopup>.');
            }

            CityApp.data.map.popup = new google.maps.InfoWindow({
                content: `<div id="mapPopup"><main>${props.content}</main></div>`
            });

            // Create title
            const titleDom = document.createElement('h5');
            if ('titleLabel' in props) {
                const titleLabel = document.createElement('span');
                titleLabel.classList.add('label', 'ic-mr-10');
                titleLabel.innerText = props.titleLabel;

                // Additional CSS classes
                if ('titleLabelClass' in props) {
                    titleLabel.classList.add(...props.titleLabelClass);
                }

                // Icon
                if ('titleLabelIcon' in props) {
                    titleLabel.setAttribute('data-icon', props.titleLabelIcon);
                }

                titleDom.appendChild(titleLabel);
            }
            const titleDomSpan = document.createElement('span');
            titleDomSpan.innerText = props.title;
            titleDom.appendChild(titleDomSpan);
            CityApp.data.map.popup.setHeaderContent(titleDom);

            // Set position
            if ('position' in props) {
                CityApp.data.map.popup.setPosition(props.position);
            }

            // Attach close event
            if ('onClose' in props) {
                google.maps.event.addListener(CityApp.data.map.popup, 'close', props.onClose);
            }

            if ('onCloseClick' in props) {
                google.maps.event.addListener(CityApp.data.map.popup, 'closeclick', props.onCloseClick);
            }
        }

        // Open popup infoWindow
        else if (action === 'openPopup') {
            if (!'ref' in props) {
                throw new SyntaxError('Syntax error while performing <openPopup>.');
            }

            // Open popup
            if (CityApp.data.map.popup !== null) {
                CityApp.data.map.popup.open(
                    CityApp.data.map._ref,
                    props.ref
                );
            }
        }

        // Close popup infoWindow
        else if (action === 'closePopup') {
            // Close already opened popup
            if (CityApp.data.map.popup) {
                CityApp.data.map.popup.close();
            }
        }
    }

    /**
     * Initiate Google Maps loading.
     */
    static loadMap() {

        // Container
        const container = document.querySelector('#map');
        if (container && this.config.map) {

            // Load map
            this.load(this.config.map);
        }
    }

    /**
     * Render Google Map JS and render
     */
    static renderMap() {

        // Container
        const container = document.querySelector('#map');
        if (container && this.config.map) {

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
                this.data.map.isLoaded = true;

                // Load Advanced Marker Element, classic marker is deprecated from February 2024
                const {AdvancedMarkerElement, PinElement} = google.maps.importLibrary('marker');

                // Load spherical namespace, methods to calculate distances
                const {spherical} = google.maps.importLibrary('geometry');

                // Load map controls
                this.renderMapControls();
            });
        }
    }

    /**
     * Load map controls.
     */
    static renderMapControls() {

        // Hide my location
        this.events.add('hideMyLocation', () => {

            // Reset user position on the map
            if (this.data.user._ref !== null) {
                this.data.user._ref.setMap(null);
                this.data.user._ref = null;
            }

            // Clear user watcher
            if (this.data.user.watcher !== null) {
                navigator.geolocation.clearWatch(this.data.user.watcher);
                this.data.user.watcher = null;
            }

            // Clear user data
            this.data.user.isVisible = false;
            this.data.user.isPersistent = false;

            // Reset coordinates
            this.data.user.coordinates.lat = 0;
            this.data.user.coordinates.lng = 0;
        });

        // Controls container
        const mapControls = document.querySelector('.mapControls');
        if (mapControls && this.data.map.isLoaded) {

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

            // Create my location map control
            const myLocationMapControlContainer = document.createElement('div');
            myLocationMapControlContainer.classList.add('mapControlsContainer');

            const myLocationMapControl = document.createElement('button');
            myLocationMapControl.setAttribute('data-state', 'hideLocation');
            myLocationMapControl.classList.add('mapCustomControl', 'separator');
            myLocationMapControl.innerHTML = `<span data-icon="&#xe018;"></span>`;
            myLocationMapControl.title = this.config.labels.showMyLocation;
            myLocationMapControl.type = 'button';

            const myLocationMapPersistentControl = document.createElement('button');
            myLocationMapPersistentControl.setAttribute('data-state', 'hidePersistent');
            myLocationMapPersistentControl.classList.add('mapCustomControl', 'separator', 'hide');
            myLocationMapPersistentControl.innerHTML = `<span data-icon="&#xe015;"></span>`;
            myLocationMapPersistentControl.title = this.config.labels.showMyLocationPersistent;
            myLocationMapPersistentControl.type = 'button';

            myLocationMapPersistentControl.addEventListener('click', () => {

                if (myLocationMapPersistentControl.getAttribute('data-state') === 'hidePersistent') {
                    myLocationMapPersistentControl.setAttribute('data-state', 'showPersistent');
                    myLocationMapPersistentControl.classList.add('selected');

                    // Mark location as persistent
                    this.data.user.isPersistent = true;

                    // Enable watcher
                    this.data.user.watcher = navigator.geolocation.watchPosition((position) => {

                        // Get coordinates
                        this.data.user.coordinates.lat = position.coords.latitude;
                        this.data.user.coordinates.lng = position.coords.longitude;

                        this.data.map._ref.panTo(
                            new google.maps.LatLng(this.data.user.coordinates.lat, this.data.user.coordinates.lng));

                        // Update pin location
                        this.data.user._ref.position = {
                            lat: parseFloat(this.data.user.coordinates.lat),
                            lng: parseFloat(this.data.user.coordinates.lng)
                        };

                    }, () => {
                    }, {enableHighAccuracy: true, timeout: 5000});

                } else {
                    myLocationMapPersistentControl.setAttribute('data-state', 'hidePersistent');
                    myLocationMapPersistentControl.classList.remove('selected');

                    // Mark as persistent
                    this.data.user.isPersistent = false;

                    // Clear user watcher
                    if (this.data.user.watcher !== null) {
                        navigator.geolocation.clearWatch(this.data.user.watcher);
                        this.data.user.watcher = null;
                    }
                }
            });

            myLocationMapControl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Check if geoLocation is available
                if (navigator.geolocation) {

                    // Location hidden, show location
                    if (myLocationMapControl.getAttribute('data-state') === 'hideLocation') {
                        myLocationMapControl.setAttribute('data-state', 'showLocation');
                        myLocationMapControl.classList.add('selected');

                        // Show my location real time
                        myLocationMapPersistentControl.classList.remove('hide');

                        navigator.geolocation.getCurrentPosition((position) => {

                            // Get coordinates
                            this.data.user.coordinates.lat = position.coords.latitude;
                            this.data.user.coordinates.lng = position.coords.longitude;

                            // Show pin
                            if (this.data.user.props.pin === undefined) {
                                this.data.user.props.pin = new google.maps.marker.PinElement({
                                    glyphColor: '#fff',
                                    background: '#31496d',
                                    borderColor: '#31496d'
                                });
                            }

                            if (this.data.user._ref === null) {
                                this.data.user._ref = new google.maps.marker.AdvancedMarkerElement({
                                    position: {
                                        lat: parseFloat(this.data.user.coordinates.lat),
                                        lng: parseFloat(this.data.user.coordinates.lng)
                                    },
                                    map: this.data.map._ref,
                                    title: this.config.labels.myLocation,
                                    content: this.data.user.props.pin.element
                                });

                                // Associate user position with the map
                                this.data.user._ref.setMap(this.data.map._ref);
                            }

                            // Mark user as visible
                            this.data.user.isVisible = true;

                            // Move to user position
                            this.data.map._ref.panTo(
                                new google.maps.LatLng(this.data.user.coordinates.lat, this.data.user.coordinates.lng));

                            // Create InfoWindow
                            CityApp.mapUtils('createPopup', {
                                title: this.config.labels.myLocation,
                                // titleIcon: `&#xe016;`,
                                titleLabel: '',
                                titleLabelIcon: `\u{e016}`,
                                content: `<ul><li>Latitudine: ${this.data.user.coordinates.lat}</li><li>Longitudine: ${this.data.user.coordinates.lng}</li></ul>`,
                                onClose: () => {
                                    this.data.user._ref.content.classList.remove('pin-bounce');
                                }
                            });

                            // Open popup
                            this.data.user._ref.addListener('click', () => {
                                CityApp.mapUtils('openPopup', {ref: this.data.user._ref});
                                this.data.user._ref.content.classList.add('pin-bounce');
                            });

                        }, () => {

                            try {

                                // Hide my location
                                this.events.fire('hideMyLocation');

                                // Show warning that location could not be determined
                                if (app.config.messages['location.error.unableToDetermine']) {
                                    this.notification(app.config.messages['location.error.unableToDetermine'], 'info', 10);
                                }
                            } catch (e) {

                                this.notification(e, 'error', 10);

                                // Hide persistent location
                                myLocationMapPersistentControl.setAttribute('data-state', 'hidePersistent');
                                myLocationMapPersistentControl.setAttribute('disabled', 'disabled');
                                myLocationMapPersistentControl.classList.remove('selected');
                                myLocationMapPersistentControl.classList.add('hide');

                                myLocationMapControl.setAttribute('data-state', 'hideLocation');
                                myLocationMapControl.setAttribute('disabled', 'disabled');
                                myLocationMapControl.classList.remove('selected');

                                // Disable persistent flag
                                this.data.user.isPersistent = false;
                            }

                        }, {enableHighAccuracy: true, timeout: 5000});

                    } else {

                        // ShowLocation state
                        myLocationMapControl.setAttribute('data-state', 'hideLocation');
                        myLocationMapControl.classList.remove('selected');

                        // Hide my location real time
                        myLocationMapPersistentControl.setAttribute('data-state', 'hidePersistent');
                        myLocationMapPersistentControl.classList.remove('selected');
                        myLocationMapPersistentControl.classList.add('hide');

                        // Trigger
                        this.events.fire('hideMyLocation');
                    }

                } else {

                    // Hide persistent location
                    myLocationMapPersistentControl.setAttribute('data-state', 'hidePersistent');
                    myLocationMapPersistentControl.setAttribute('disabled', 'disabled');
                    myLocationMapPersistentControl.classList.remove('selected');
                    myLocationMapPersistentControl.classList.add('hide');

                    // GeoLocation not available
                    myLocationMapControl.setAttribute('data-state', 'hideLocation');
                    myLocationMapControl.setAttribute('disabled', 'disabled');
                    myLocationMapControl.classList.remove('selected');

                    // Trigger
                    this.events.fire('hideMyLocation');
                }
            });

            // Append to container
            myLocationMapControlContainer.appendChild(myLocationMapPersistentControl);
            myLocationMapControlContainer.appendChild(myLocationMapControl);

            // Position custom button
            this.data.map._ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(myLocationMapControlContainer);

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
                     * @type {{app: null, watcher: null, setWatcher(*, *): void, init(), data: {}, hasData: boolean, show(), isLoaded: boolean, props: {}, hide(), _ref: null, metrics: {visible: number}, render(), getData(*, *): boolean}}
                     */
                    this.data.sets[dataAttr.set] = new DataSet();

                    // Traffic layer
                    if (dataAttr.set === 'trafficLayer') {

                        // Enable
                        toggle.addEventListener('click', () => {
                            this.data.map.controls.spinner.classList.remove('hide');

                            // Get input state
                            const toggleChecked = this.data.map.controls[dataAttr.set].checked;
                            if (toggleChecked) {
                                // Show traffic layer
                                this.data.sets[dataAttr.set]._ref = new google.maps.TrafficLayer();
                                this.data.sets[dataAttr.set]._ref.setMap(this.data.map._ref);
                                this.data.sets[dataAttr.set].isVisible = true;
                            } else {
                                // Hide traffic layer
                                this.data.sets[dataAttr.set]._ref.setMap(null);
                                this.data.sets[dataAttr.set]._ref = null;
                                this.data.sets[dataAttr.set].isVisible = false;
                            }

                            this.data.map.controls.spinner.classList.add('hide');
                        });
                    }

                    // Load dataSet app
                    else if (dataAttr.source) {
                        this.load(dataAttr.source, () => {

                            // Application loaded
                            this.data.sets[dataAttr.set].init();

                            // Fetch data
                            this.data.sets[dataAttr.set].getData(() => {
                                if (!this.data.sets[dataAttr.set].hasData()) {

                                    // Disable controller
                                    this.data.map.controls[dataAttr.set].setAttribute('disabled', 'disabled');
                                }
                            });
                        });

                        // Enable
                        toggle.addEventListener('click', () => {
                            this.data.map.controls.spinner.classList.remove('hide');

                            // Get input state
                            const toggleChecked = this.data.map.controls[dataAttr.set].checked;
                            if (toggleChecked) {
                                // Show pins
                                this.data.sets[dataAttr.set].show();
                            } else {
                                // Hide pins and reset watcher
                                this.data.sets[dataAttr.set].hide();
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
    CityApp.init();
    window.CityApp = CityApp;

})();