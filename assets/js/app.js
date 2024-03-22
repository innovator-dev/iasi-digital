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
 * Iași Digital app.
 * @type {{dateDiff: ((function(*, boolean=): (number|null))|*), route: (function(): {}), me: {app: null, watcher: null, visible: boolean, updated: null}, dataSets: {}, api: (function(string, string=, string=, Object=): Promise<Response>), cdn: string, map: {loaded: boolean, ref: null, popup: null, controls: {}, mapCenter: {lng: number, lat: number}}, render: render, events: Observer, notify: notification}}
 */
const app = (() => {

    /**
     * Observer.
     * @type {Observer}
     */
    const events = new Observer();

    /**
     * DataSets.
     * @type {{}}
     */
    const dataSets = {};

    /**
     * Map rendering.
     * @type {{loaded: boolean, ref: null, popup: null, controls: {}, mapCenter: {lng: number, lat: number}, direction: {loaded: boolean, renderer: null, service: null}}}
     */
    const map = {
        // Map configuration
        ref: null,
        mapCenter: {lat: 47.1553424, lng: 27.585645},
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
    };

    /**
     * My location.
     * @type {{app: null, watcher: null, visible: boolean, location: {lng: number, lat: number}, persistent: boolean, updated: null}}
     */
    const my = {
        app: null,
        watcher: null,
        visible: false,
        updated: null,
        location: {
            lat: 0,
            lng: 0
        },
        persistent: false
    };

    /**
     * CDN url.
     * @type {string}
     */
    const cdn = 'https://iasi.digital/assets/';

    /**
     * Application configuration.
     * @type {{}}
     */
    let configuration = {};

    /**
     * Calculate date difference between given date and current and returns difference in minutes.
     * @param date Date to compare with current timestamp
     * @param utc (Optional) Flag to calculate date difference in UTC
     * @returns {number|null}
     */
    function dateDiff(date, utc = false) {

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
     * Call API endpoint.
     *
     * @param {string} url string
     * @param {string} method string
     * @param {string} body string
     * @param {Object} headers Object
     * @return {Promise<Response>}
     */
    async function apiCall(url, method = 'GET', body = '', headers = {}) {

        // Default headers
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Prepare API call
        const apiCall = {
            method: method,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: Object.assign(defaultHeaders, headers),
            body: body ? JSON.stringify(body) : ''
        };

        // POST request?
        if (method === 'GET' || method === 'HEAD') {
            delete apiCall.body;
        }

        return await fetch(url, apiCall);
    }

    /**
     * Load external JavaScript module.
     *
     * @param path URL path of JavaScript module
     * @param callback Callback function
     * @param args Callback function arguments
     */
    function load(path, callback, args) {

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
     * Get route path.
     * @return {{}}
     */
    function getRoutePath() {
        const map = ['route', 'method', 'query'],
            path = window.location.pathname,
            hash = window.location.hash,
            route = {};

        // Populate path data
        if (path) {
            let tokens = path.replace(/^\/?|\/?$/g, '').split('/');
            if (tokens.length > 0) {

                for (let i = 0; i < map.length; i++) {
                    route[map[i]] = tokens[i];
                }
            }
        }

        // Populate hash
        if (hash) {
            route['hash'] = hash.substring(1);
        }

        return route;
    }

    /**
     * Trigger notification rendering.
     *
     * @param message Notification message
     * @param type (Optional) Notification type (error, info, success, warning)
     * @param autoHide (Optional) Auto hide notification after given seconds
     * @param floating (Optional) Render notification positioned bottom left of the window
     */
    function notification(message, type = 'error', autoHide = 0, floating = true) {

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
     * Perform fetch request to API.
     * @param args Fetch arguments
     * @returns {boolean}
     *
     * Arguments:
     *  url: API url
     *  method: (Optional) HTTP method. If method value is missing, GET is considered default
     *  postFields: (Optional) POST fields if HTTP method is a POST request
     *  callback: (Optional) Callback method
     */
    function getData(args) {
        try {

            // Validate arguments
            if (!args.url && app.config.messages['apiCall.error.missingUrl']) {
                notification(app.config.messages['apiCall.error.missingUrl'], 'error', 10);
            }

            // Perform API call
            app.api(args.url, args.method || 'GET', args.postFields || {})
                .then((response) => {
                    if (!response.ok) {
                        return false;
                    }

                    return response.json();
                })
                .then((json) => {

                    // Callback
                    if (args.callback !== null) {
                        args.callback(json);
                    }
                })
                .catch(err => {
                    return false;
                });

            return true;

        } catch (err) {
            notification(err, 'error', 10);
        }
    }

    /**
     * Render Google Maps.
     */
    function renderMap() {
        events.add('renderMap', () => {

            // Render map
            const mapDiv = document.querySelector('#map');
            if (mapDiv && app.config.map) {
                // Load map
                load(app.config.map, () => {

                    map.ref = new google.maps.Map(mapDiv, {
                        center: map.mapCenter,
                        zoom: 14,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                        mapId: '4c67bc89ba82ae84'
                    });

                    google.maps.event.addListenerOnce(map.ref, 'tilesloaded', () => {

                        // Mark map as loaded
                        map.loaded = true;

                        // Show map controls
                        events.fire('mapRenderControls');

                        // Load Advanced Marker Element, classic marker is deprecated from February 2024
                        const {AdvancedMarkerElement, PinElement} = google.maps.importLibrary("marker");
                    });
                });
            }
        });

        // Trigger map loading
        events.fire('renderMap');
    }

    /**
     * Render page components.
     */
    function render() {

        // Initiate direction service
        events.add('initiateDirectionService', () => {
            if (map.loaded) {

                // Initiate map direction service
                if (map.direction.service === null) {
                    map.direction.service = new google.maps.DirectionsService();
                }

                // Initiate map direction renderer
                if (map.direction.renderer === null) {
                    map.direction.renderer = new google.maps.DirectionsRenderer();
                    map.direction.renderer.setMap(map.ref);
                }

                map.direction.loaded = true;
            }
        });

        // Clear direction service
        events.add('clearDirectionService', () => {

            // Direction service is initiated
            if (map.direction.service !== null) {
                map.direction.service = null;
            }

            // Direction renderer is initiated
            if (map.direction.renderer !== null) {
                map.direction.renderer.setMap(null);
                map.direction.renderer = null;
            }

            map.direction.loaded = false;
        });

        // Initiate show my location
        events.add('showMyLocation', () => {

            // Initiate direction service
            events.fire('initiateDirectionService');
        });

        // Initiate hide my location
        events.add('hideMyLocation', () => {

            // Clear direction service
            events.fire('clearDirectionService');

            // Clear marker
            if (my.app !== null) {
                my.app.setMap(null);
                my.app = null;
            }

            // Clear watch
            if (my.watcher !== null) {
                navigator.geolocation.clearWatch(my.watcher);
                my.watcher = null;
            }

            // Clear data
            my.updated = null;
            my.visible = false;

            // Reset my location
            my.location.lat = 0;
            my.location.lng = 0;
        });

        // Render map controls
        events.add('mapRenderControls', () => {

            // Render controls
            const mapControls = document.querySelector('.mapControls');
            if (mapControls && map.loaded) {

                // Create center map control
                const centerMapControlContainer = document.createElement('div');
                centerMapControlContainer.classList.add('mapControlsContainer');

                const centerMapControl = document.createElement('button');
                centerMapControl.classList.add('mapCustomControl');
                centerMapControl.innerHTML = `<span data-icon="&#xe013;"></span>`;
                centerMapControl.title = `Centrează harta pe Municipiul Iași`;
                centerMapControl.type = 'button';

                centerMapControl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (map.mapCenter.lat > 0 && map.mapCenter.lng > 0) {
                        // Center map
                        map.ref.panTo(new google.maps.LatLng(
                            map.mapCenter.lat,
                            map.mapCenter.lng
                        ));

                        // Zoom
                        map.ref.setZoom(14);
                    }
                });

                // Append to container
                centerMapControlContainer.appendChild(centerMapControl);

                // Create my location control
                const myLocationControlContainer = document.createElement('div');
                myLocationControlContainer.classList.add('mapControlsContainer');

                const myLocationPersistentControl = document.createElement('button');
                myLocationPersistentControl.setAttribute('data-state', 'disabled');
                myLocationPersistentControl.classList.add('mapCustomControl', 'separator', 'hide');
                myLocationPersistentControl.innerHTML = `<span data-icon="&#xe015;"></span>`;
                myLocationPersistentControl.title = 'Activează/Dezactivează localizarea persistentă'
                myLocationPersistentControl.type = 'button';

                myLocationPersistentControl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (myLocationPersistentControl.getAttribute('data-state') === 'disabled') {
                        myLocationPersistentControl.setAttribute('data-state', 'enabled');
                        myLocationPersistentControl.classList.add('selected');
                        my.persistent = true;
                    } else {
                        myLocationPersistentControl.setAttribute('data-state', 'disabled');
                        myLocationPersistentControl.classList.remove('selected');
                        my.persistent = false;
                    }
                });

                const myLocationControl = document.createElement('button');
                myLocationControl.setAttribute('data-state', 'hideLocation');
                myLocationControl.classList.add('mapCustomControl', 'separator');
                myLocationControl.innerHTML = `<span data-icon="&#xe016;"></span>`;
                myLocationControl.title = `Afișează/Ascunde locația mea pe hartă`;
                myLocationControl.type = 'button';

                myLocationControl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Check if geoLocation is available
                    if (navigator.geolocation) {

                        // Location hidden, show location
                        if (myLocationControl.getAttribute('data-state') === 'hideLocation') {
                            myLocationControl.setAttribute('data-state', 'showLocation');
                            myLocationControl.classList.add('selected');

                            // Show persistent location control
                            myLocationPersistentControl.classList.remove('hide');

                            // Show my location
                            events.fire('showMyLocation');

                            // Show my location
                            my.watcher = navigator.geolocation.watchPosition((position) => {

                                // Get coordinates
                                const lat = position.coords.latitude,
                                    lng = position.coords.longitude;

                                // Store coordinates
                                my.location.lat = lat;
                                my.location.lng = lng;

                                // Custom marker
                                const pin = new google.maps.marker.PinElement({
                                    glyphColor: '#fff',
                                    background: '#31496d',
                                    borderColor: '#31496d'
                                });

                                if (my.app === null) {
                                    my.app = new google.maps.marker.AdvancedMarkerElement({
                                        position: {lat: parseFloat(lat), lng: parseFloat(lng)},
                                        map: app.map.ref,
                                        title: 'Locația mea',
                                        content: pin.element
                                    });

                                    my.app.setMap(map.ref);
                                }

                                // Update position
                                my.app.position = {lat: lat, lng: lng};
                                my.updated = new Date().getTime();
                                my.visible = true;

                                if (my.persistent === true) {
                                    map.ref.panTo(new google.maps.LatLng(lat, lng));
                                }

                            }, () => {

                                try {

                                    // Hide my location
                                    events.fire('hideMyLocation');

                                    // Show warning that location could not be determined
                                    if (app.config.messages['location.error.unableToDetermine']) {
                                        notification(app.config.messages['location.error.unableToDetermine'], 'info', 10);
                                    }

                                } catch (err) {
                                    notification(err, 'error', 10);

                                    myLocationControl.setAttribute('data-state', 'hideLocation');
                                    myLocationControl.classList.remove('selected');
                                    myLocationControl.setAttribute('disabled', 'disabled');

                                    // Disable persistent location control
                                    myLocationPersistentControl.classList.remove('selected');
                                    myLocationPersistentControl.classList.add('hide');
                                    myLocationPersistentControl.setAttribute('data-state', 'disabled');

                                    // Disable persistent flag
                                    my.persistent = false;
                                }

                            }, {enableHighAccuracy: true, timeout: 5000});

                        } else {
                            myLocationControl.setAttribute('data-state', 'hideLocation');
                            myLocationControl.classList.remove('selected');

                            // Disable persistent location control
                            myLocationPersistentControl.classList.remove('selected');
                            myLocationPersistentControl.classList.add('hide');
                            myLocationPersistentControl.setAttribute('data-state', 'disabled');

                            // Disable persistent flag
                            my.persistent = false;

                            // Hide my location
                            events.fire('hideMyLocation');
                        }

                    } else {

                        // Hide location and disable button
                        myLocationControl.setAttribute('data-state', 'hideLocation');
                        myLocationControl.classList.remove('selected');

                        // Hide persistent location control
                        myLocationPersistentControl.classList.add('hide');
                    }
                });

                // Append to container
                myLocationControlContainer.appendChild(myLocationPersistentControl);
                myLocationControlContainer.appendChild(myLocationControl);

                // Position custom button
                map.ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerMapControlContainer);
                map.ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(myLocationControlContainer);

                // Populate map controls
                map.controls = {
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
                         * @type {{app: null, watcher: null, loaded: boolean, visible: boolean, data: {}, hasData: boolean, selectedMarker: null, markers: *[], updated: null}}
                         */
                        dataSets[dataAttr.set] = {
                            app: null,
                            watcher: null,
                            loaded: false,
                            visible: false,
                            hasData: false,
                            updated: null,
                            data: {},
                            markers: [],
                            selectedMarker: null
                        };

                        // Load dataSet app
                        if (dataAttr.source) {
                            load(dataAttr.source, () => {

                                // Mark dataSet as loaded
                                dataSets[dataAttr.set].loaded = true;

                                // DataSet has data
                                if (dataSets[dataAttr.set].app.getData()) {
                                    dataSets[dataAttr.set].hasData = true;
                                    dataSets[dataAttr.set].app.init();
                                } else {
                                    // Disable controller
                                    map.controls[dataAttr.set].setAttribute('disabled', 'disabled');
                                }
                            });

                            // Enable
                            toggle.addEventListener('click', () => {
                                map.controls.spinner.classList.remove('hide');

                                // Get input state
                                const toggleChecked = map.controls[dataAttr.set].checked;
                                if (toggleChecked) {
                                    // Show pins
                                    dataSets[dataAttr.set].app.show();
                                } else {
                                    // Hide pins and reset watcher
                                    dataSets[dataAttr.set].app.hide();
                                }

                                map.controls.spinner.classList.add('hide');
                            });
                        }

                        // Traffic layer
                        if (dataAttr.set === 'trafficLayer') {

                            // Enable
                            toggle.addEventListener('click', () => {
                                map.controls.spinner.classList.remove('hide');

                                // Get input state
                                const toggleChecked = map.controls[dataAttr.set].checked;
                                if (toggleChecked) {
                                    // Show traffic layer
                                    dataSets[dataAttr.set].app = new google.maps.TrafficLayer();
                                    dataSets[dataAttr.set].app.setMap(map.ref);
                                    dataSets[dataAttr.set].visible = true;
                                } else {
                                    // Hide traffic layer
                                    dataSets[dataAttr.set].visible = false;
                                    dataSets[dataAttr.set].app.setMap(null);
                                    dataSets[dataAttr.set].app = null;
                                }

                                map.controls.spinner.classList.add('hide');
                            });
                        }
                    }
                });

            }
        });

        // Render map
        renderMap();
    }

    return {

        // Application CDN
        cdn: cdn,

        // Application configuration
        config: configuration,

        // Observer
        events: events,

        // Map configuration
        map: map,

        // My location object configuration
        me: my,

        // DataSets
        dataSets: dataSets,

        // Date difference
        dateDiff: dateDiff,

        // API call
        api: apiCall,

        // Load external library
        inc: load,

        // Fetch API
        fetch: getData,

        // Route path
        route: getRoutePath,

        // Notification
        notify: notification,

        // Render page
        render: render
    };

})();

/**
 * Initialize app.
 */
(() => {

    // Bind configuration
    const page = document.querySelector('body.page');
    const pageConfig = page.dataset;
    if (pageConfig.bind) {
        // Decode URL and store configuration
        app.config = JSON.parse(atob(pageConfig.bind));
    }

    // Fetch configuration
    // Perform API call
    app.api('config.json')
        .then((response) => {
            if (!response.ok) {
                return false;
            }

            return response.json();
        })
        .then((json) => {
            // Decode URL and store configuration
            app.config = Object.assign(app.config, json);
        })
        .catch(err => {
        });

    app.render();

})();