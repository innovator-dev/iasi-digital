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
 * @type {{dateDiff: ((function(*, boolean=): (number|null))|*), route: (function(): {}), me: {app: null, watcher: null, visible: boolean, updated: null}, dataSets: {}, api: (function(string, string=, string=, Object=): Promise<Response>), cdn: string, map: {loaded: boolean, ref: null, popup: null, controls: {}, mapCenter: {lng: number, lat: number}}, render: render, events: Observer}}
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
     * @type {{loaded: boolean, ref: null, popup: null, controls: {}, mapCenter: {lng: number, lat: number}}}
     */
    const map = {
        // Map configuration
        ref: null,
        mapCenter: {lat: 47.1553424, lng: 27.585645},
        myLocation: {lat: 0, lng: 0},
        loaded: false,
        popup: null,

        // Map controls
        controls: {}
    };

    /**
     * My Location.
     * @type {{app: null, watcher: null, visible: boolean, updated: null}}
     */
    const my = {
        app: null,
        watcher: null,
        visible: false,
        updated: null
    };

    /**
     * CDN url.
     * @type {string}
     */
    const cdn = 'https://iasi.digital/assets/';

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
     * Render page components.
     */
    function render() {

        // Render map controls
        events.add('mapRenderControls', () => {

            // Render controls
            const mapControls = document.querySelector('.mapControls');
            if (mapControls && map.loaded) {

                // Create center map control
                const centerMapControlContainer = document.createElement('div');
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
                    }
                });

                // Append to container
                centerMapControlContainer.appendChild(centerMapControl);

                // Create my location control
                const myLocationControlContainer = document.createElement('div');
                const myLocationControl = document.createElement('button');
                myLocationControl.setAttribute('data-state', 'hideLocation');
                myLocationControl.classList.add('mapCustomControl', 'separator');
                myLocationControl.innerHTML = `<span data-icon="&#xe015;"></span>`;
                myLocationControl.title = `Afișează/Ascunde locația mea`;
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

                            // Show my location
                            my.watcher = navigator.geolocation.watchPosition((position) => {

                                // Get coordinates
                                const lat = position.coords.latitude,
                                    lng = position.coords.longitude;

                                // Store coordinates
                                map.myLocation.lat = lat;
                                map.myLocation.lng = lng;

                                if (my.app === null) {
                                    my.app = new google.maps.Marker({
                                        position: {lat: parseFloat(lat), lng: parseFloat(lng)},
                                        map: app.map.ref,
                                        title: 'Locația mea',
                                        icon: {
                                            url: `${cdn}pin/me.png`,
                                            size: new google.maps.Size(28, 44),
                                            origin: new google.maps.Point(0, 0),
                                            anchor: new google.maps.Point(0, 22),
                                            scaledSize: new google.maps.Size(28, 44)
                                        }
                                    });

                                    my.app.setMap(map.ref);
                                }

                                // Update position
                                my.app.setPosition(new google.maps.LatLng(lat, lng));
                                my.lastUpdate = new Date().getTime();
                                my.visible = true;

                                map.ref.panTo(new google.maps.LatLng(
                                    lat, lng
                                ));

                            }, () => {

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
                                my.lastUpdate = null;
                                my.visible = false;

                                // Reset my location
                                map.myLocation.lat = 0;
                                map.myLocation.lng = 0;

                                // Show warning...
                                // ToDo
                            }, {enableHighAccuracy: true, timeout: 5000});
                        } else {
                            myLocationControl.setAttribute('data-state', 'hideLocation');
                            myLocationControl.classList.remove('selected');

                            // Hide my location
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
                            my.lastUpdate = null;
                            my.visible = false;

                            // Reset my location
                            map.myLocation.lat = 0;
                            map.myLocation.lng = 0;
                        }

                    } else {

                        // Hide location and disable button
                        myLocationControl.setAttribute('data-state', 'hideLocation');
                        myLocationControl.classList.remove('selected');
                        myLocationControl.setAttribute('disabled', 'disabled');
                    }
                });

                // Append to container
                myLocationControlContainer.appendChild(myLocationControl);

                // Position custom button
                map.ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerMapControlContainer);
                map.ref.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(myLocationControlContainer);

                // Populate map controls
                map.controls = {
                    spinner: mapControls.querySelector('h3 .spinner'),

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
                                if (dataSets[dataAttr.set].app.fetch()) {
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
        events.add('renderMap', () => {
            const mapDiv = document.querySelector('#map');
            if (mapDiv) {

                // Get dataset
                const mapAttr = mapDiv.dataset;
                if (mapAttr.bind) {
                    // Decode URL
                    const mapUrl = JSON.parse(atob(mapAttr.bind));

                    // Load map
                    load(mapUrl.url, () => {
                        map.ref = new google.maps.Map(mapDiv, {
                            center: map.mapCenter,
                            zoom: 14,
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                            styles: [
                                {
                                    "featureType": "administrative",
                                    "elementType": "labels.text.fill",
                                    "stylers": [
                                        {
                                            "color": "#444444"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "landscape",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "color": "#f2f2f2"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "poi",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "visibility": "on"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "poi.business",
                                    "elementType": "geometry.fill",
                                    "stylers": [
                                        {
                                            "visibility": "off"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "road",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "saturation": -100
                                        },
                                        {
                                            "lightness": 45
                                        }
                                    ]
                                },
                                {
                                    "featureType": "road.highway",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "visibility": "simplified"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "road.arterial",
                                    "elementType": "labels.icon",
                                    "stylers": [
                                        {
                                            "visibility": "on"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "transit",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "visibility": "on"
                                        }
                                    ]
                                },
                                {
                                    "featureType": "water",
                                    "elementType": "all",
                                    "stylers": [
                                        {
                                            "color": "#b4d4e1"
                                        },
                                        {
                                            "visibility": "on"
                                        }
                                    ]
                                }
                            ]
                        });

                        google.maps.event.addListenerOnce(map.ref, 'tilesloaded', () => {

                            // Mark map as loaded
                            map.loaded = true;

                            // Show map controls
                            events.fire('mapRenderControls');
                        });
                    });
                }
            }
        });

        // Trigger map loading
        events.fire('renderMap');
    }

    return {

        /**
         * App CDN.
         */
        cdn: cdn,

        // Observer
        events: events,

        // Map
        map: map,

        // My location
        me: my,

        // DataSets
        dataSets: dataSets,

        // Date difference
        dateDiff: dateDiff,

        // API call
        api: apiCall,

        // Route path
        route: getRoutePath,

        // Render page
        render: render

    };

})();

/**
 * Initialize app.
 */
(() => {

    app.render();

})();