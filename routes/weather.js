"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var http = require("http");
var https = require("https");
var SunCalc = require("suncalc");
var moment = require("moment-timezone");
var geoTZ = require("geo-tz");
var ManualAdjustmentMethod_1 = require("./adjustmentMethods/ManualAdjustmentMethod");
var ZimmermanAdjustmentMethod_1 = require("./adjustmentMethods/ZimmermanAdjustmentMethod");
var RainDelayAdjustmentMethod_1 = require("./adjustmentMethods/RainDelayAdjustmentMethod");
var WateringScaleCache_1 = require("../WateringScaleCache");
var WEATHER_PROVIDER = new (require("./weatherProviders/" + (process.env.WEATHER_PROVIDER || "OWM"))["default"])();
var PWS_WEATHER_PROVIDER = new (require("./weatherProviders/" + (process.env.PWS_WEATHER_PROVIDER || "WUnderground"))["default"])();
// Define regex filters to match against location
var filters = {
    gps: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
    pws: /^(?:pws|icao|zmw):/,
    url: /^https?:\/\/([\w\.-]+)(:\d+)?(\/.*)?$/,
    time: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})/,
    timezone: /^()()()()()()([+-])(\d{2})(\d{2})/
};
/** AdjustmentMethods mapped to their numeric IDs. */
var ADJUSTMENT_METHOD = {
    0: ManualAdjustmentMethod_1["default"],
    1: ZimmermanAdjustmentMethod_1["default"],
    2: RainDelayAdjustmentMethod_1["default"]
};
var cache = new WateringScaleCache_1["default"]();
/**
 * Resolves a location description to geographic coordinates.
 * @param location A partial zip/city/country or a coordinate pair.
 * @return A promise that will be resolved with the coordinates of the best match for the specified location, or
 * rejected with an error message if unable to resolve the location.
 */
function resolveCoordinates(location) {
    return __awaiter(this, void 0, void 0, function () {
        var split, url, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!location) {
                        throw "No location specified";
                    }
                    if (!filters.pws.test(location)) return [3 /*break*/, 1];
                    throw "PWS ID must be specified in the pws parameter.";
                case 1:
                    if (!filters.gps.test(location)) return [3 /*break*/, 2];
                    split = location.split(",");
                    return [2 /*return*/, [parseFloat(split[0]), parseFloat(split[1])]];
                case 2:
                    url = "http://autocomplete.wunderground.com/aq?h=0&query=" +
                        encodeURIComponent(location);
                    data = void 0;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, httpJSONRequest(url)];
                case 4:
                    data = _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _a.sent();
                    // If the request fails, indicate no data was found.
                    throw "An API error occurred while attempting to resolve location";
                case 6:
                    // Check if the data is valid
                    if (typeof data.RESULTS === "object" && data.RESULTS.length && data.RESULTS[0].tz !== "MISSING") {
                        // If it is, reply with an array containing the GPS coordinates
                        return [2 /*return*/, [parseFloat(data.RESULTS[0].lat), parseFloat(data.RESULTS[0].lon)]];
                    }
                    else {
                        // Otherwise, indicate no data was found
                        throw "No match found for specified location";
                    }
                    _a.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Makes an HTTP/HTTPS GET request to the specified URL and parses the JSON response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with parsed response body if the request succeeds, or will be rejected
 * with an error if the request or JSON parsing fails. This error may contain information about the HTTP request or,
 * response including API keys and other sensitive information.
 */
function httpJSONRequest(url) {
    return __awaiter(this, void 0, void 0, function () {
        var data, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, httpRequest(url)];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, JSON.parse(data)];
                case 2:
                    err_2 = _a.sent();
                    // Reject the promise if there was an error making the request or parsing the JSON.
                    throw err_2;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.httpJSONRequest = httpJSONRequest;
/**
 * Calculates timezone and sunrise/sunset for the specified coordinates.
 * @param coordinates The coordinates to use to calculate time data.
 * @return The TimeData for the specified coordinates.
 */
function getTimeData(coordinates) {
    var timezone = moment().tz(geoTZ(coordinates[0], coordinates[1])[0]).utcOffset();
    var tzOffset = getTimezone(timezone, true);
    // Calculate sunrise and sunset since Weather Underground does not provide it
    var sunData = SunCalc.getTimes(new Date(), coordinates[0], coordinates[1]);
    sunData.sunrise.setUTCMinutes(sunData.sunrise.getUTCMinutes() + tzOffset);
    sunData.sunset.setUTCMinutes(sunData.sunset.getUTCMinutes() + tzOffset);
    return {
        timezone: timezone,
        sunrise: (sunData.sunrise.getUTCHours() * 60 + sunData.sunrise.getUTCMinutes()),
        sunset: (sunData.sunset.getUTCHours() * 60 + sunData.sunset.getUTCMinutes())
    };
}
/**
 * Checks if the weather data meets any of the restrictions set by OpenSprinkler. Restrictions prevent any watering
 * from occurring and are similar to 0% watering level. Known restrictions are:
 *
 * - California watering restriction prevents watering if precipitation over two days is greater than 0.1" over the past
 * 48 hours.
 * @param adjustmentValue The adjustment value, which indicates which restrictions should be checked.
 * @param weather Watering data to use to determine if any restrictions apply.
 * @return A boolean indicating if the watering level should be set to 0% due to a restriction.
 */
function checkWeatherRestriction(adjustmentValue, weather) {
    var californiaRestriction = (adjustmentValue >> 7) & 1;
    if (californiaRestriction) {
        // TODO depending on which WeatherProvider is used, this might be checking if rain is forecasted in th next 24
        // 	hours rather than checking if it has rained in the past 48 hours.
        // If the California watering restriction is in use then prevent watering
        // if more then 0.1" of rain has accumulated in the past 48 hours
        if (weather.precip > 0.1) {
            return true;
        }
    }
    return false;
}
exports.getWeatherData = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var location, key, coordinates, err_3, timeData, weatherData, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    location = getParameter(req.query.loc), key = getParameter(req.query.dskey);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, resolveCoordinates(location)];
                case 2:
                    coordinates = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    res.send("Error: Unable to resolve location (" + err_3 + ")");
                    return [2 /*return*/];
                case 4:
                    timeData = getTimeData(coordinates);
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, WEATHER_PROVIDER.getWeatherData(coordinates, key)];
                case 6:
                    weatherData = _a.sent();
                    return [3 /*break*/, 8];
                case 7:
                    err_4 = _a.sent();
                    res.send("Error: " + err_4);
                    return [2 /*return*/];
                case 8:
                    res.json(__assign({}, timeData, weatherData, { location: coordinates }));
                    return [2 /*return*/];
            }
        });
    });
};
// API Handler when using the weatherX.py where X represents the
// adjustment method which is encoded to also carry the watering
// restriction and therefore must be decoded
exports.getWateringData = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var adjustmentMethod, checkRestrictions, adjustmentOptionsString, location, key, outputFormat, remoteAddress, adjustmentOptions, coordinates, err_5, timeData, pws, idMatch, pwsId, keyMatch, apiKey, weatherProvider, data, cachedScale, adjustmentMethodResponse, err_6, wateringData, err_7, formatted, key_1, value;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    adjustmentMethod = ADJUSTMENT_METHOD[req.params[0] & ~(1 << 7)], checkRestrictions = ((req.params[0] >> 7) & 1) > 0, adjustmentOptionsString = getParameter(req.query.wto), location = getParameter(req.query.loc), key = getParameter(req.query.dskey), outputFormat = getParameter(req.query.format), remoteAddress = getParameter(req.headers["x-forwarded-for"]) || req.connection.remoteAddress;
                    // X-Forwarded-For header may contain more than one IP address and therefore
                    // the string is split against a comma and the first value is selected
                    remoteAddress = remoteAddress.split(",")[0];
                    // Parse weather adjustment options
                    try {
                        // Parse data that may be encoded
                        adjustmentOptionsString = decodeURIComponent(adjustmentOptionsString.replace(/\\x/g, "%"));
                        // Reconstruct JSON string from deformed controller output
                        adjustmentOptions = JSON.parse("{" + adjustmentOptionsString + "}");
                    }
                    catch (err) {
                        // If the JSON is not valid then abort the claculation
                        res.send("Error: Unable to parse options (" + err + ")");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, resolveCoordinates(location)];
                case 2:
                    coordinates = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_5 = _a.sent();
                    res.send("Error: Unable to resolve location (" + err_5 + ")");
                    return [2 /*return*/];
                case 4:
                    timeData = getTimeData(coordinates);
                    pws = undefined;
                    if (adjustmentOptions.pws && adjustmentOptions.key) {
                        idMatch = adjustmentOptions.pws.match(/^[a-zA-Z\d]+$/);
                        pwsId = idMatch ? idMatch[0] : undefined;
                        keyMatch = adjustmentOptions.key.match(/^[a-f\d]{32}$/);
                        apiKey = keyMatch ? keyMatch[0] : undefined;
                        // Make sure that the PWS ID and API key look valid.
                        if (!pwsId) {
                            res.send("Error: PWS ID does not appear to be valid.");
                            return [2 /*return*/];
                        }
                        if (!apiKey) {
                            res.send("Error: PWS API key does not appear to be valid.");
                            return [2 /*return*/];
                        }
                        pws = { id: pwsId, apiKey: apiKey };
                    }
                    weatherProvider = pws ? PWS_WEATHER_PROVIDER : WEATHER_PROVIDER;
                    data = {
                        scale: undefined,
                        rd: undefined,
                        tz: getTimezone(timeData.timezone, undefined),
                        sunrise: timeData.sunrise,
                        sunset: timeData.sunset,
                        eip: ipToInt(remoteAddress),
                        rawData: undefined,
                        error: undefined
                    };
                    if (weatherProvider.shouldCacheWateringScale()) {
                        cachedScale = cache.getWateringScale(req.params[0], coordinates, pws, adjustmentOptions);
                    }
                    if (!cachedScale) return [3 /*break*/, 5];
                    // Use the cached data if it exists.
                    data.scale = cachedScale.scale;
                    data.rawData = cachedScale.rawData;
                    data.rd = cachedScale.rainDelay;
                    return [3 /*break*/, 15];
                case 5:
                    adjustmentMethodResponse = void 0;
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, adjustmentMethod.calculateWateringScale(adjustmentOptions, coordinates, weatherProvider, pws)];
                case 7:
                    adjustmentMethodResponse = _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    err_6 = _a.sent();
                    if (typeof err_6 != "string") {
                        /* If an error occurs under expected circumstances (e.g. required optional fields from a weather API are
                        missing), an AdjustmentOption must throw a string. If a non-string error is caught, it is likely an Error
                        thrown by the JS engine due to unexpected circumstances. The user should not be shown the error message
                        since it may contain sensitive information. */
                        res.send("Error: an unexpected error occurred.");
                        console.error("An unexpected error occurred for " + req.url + ": ", err_6);
                    }
                    else {
                        res.send("Error: " + err_6);
                    }
                    return [2 /*return*/];
                case 9:
                    data.scale = adjustmentMethodResponse.scale;
                    data.error = adjustmentMethodResponse.errorMessage;
                    data.rd = adjustmentMethodResponse.rainDelay;
                    data.rawData = adjustmentMethodResponse.rawData;
                    if (!checkRestrictions) return [3 /*break*/, 14];
                    wateringData = adjustmentMethodResponse.wateringData;
                    if (!(checkRestrictions && !wateringData)) return [3 /*break*/, 13];
                    _a.label = 10;
                case 10:
                    _a.trys.push([10, 12, , 13]);
                    return [4 /*yield*/, weatherProvider.getWateringData(coordinates)];
                case 11:
                    wateringData = _a.sent();
                    return [3 /*break*/, 13];
                case 12:
                    err_7 = _a.sent();
                    res.send("Error: " + err_7);
                    return [2 /*return*/];
                case 13:
                    // Check for any user-set restrictions and change the scale to 0 if the criteria is met
                    if (checkWeatherRestriction(req.params[0], wateringData)) {
                        data.scale = 0;
                    }
                    _a.label = 14;
                case 14:
                    // Cache the watering scale if caching is enabled and no error occurred.
                    if (weatherProvider.shouldCacheWateringScale() && !data.error) {
                        cache.storeWateringScale(req.params[0], coordinates, pws, adjustmentOptions, {
                            scale: data.scale,
                            rawData: data.rawData,
                            rainDelay: data.rd
                        });
                    }
                    _a.label = 15;
                case 15:
                    // Return the response to the client in the requested format
                    if (outputFormat === "json") {
                        res.json(data);
                    }
                    else {
                        formatted = "";
                        for (key_1 in data) {
                            // Skip inherited properties.
                            if (!data.hasOwnProperty(key_1)) {
                                continue;
                            }
                            value = data[key_1];
                            switch (typeof value) {
                                case "undefined":
                                    // Skip undefined properties.
                                    continue;
                                case "object":
                                    // Convert objects to JSON.
                                    value = JSON.stringify(value);
                                // Fallthrough.
                                case "string":
                                    /* URL encode strings. Since the OS firmware uses a primitive version of query string parsing and
                                    decoding, only some characters need to be escaped and only spaces ("+" or "%20") will be decoded. */
                                    value = value.replace(/ /g, "+").replace(/\n/g, "\\n").replace(/&/g, "AMPERSAND");
                                    break;
                            }
                            formatted += "&" + key_1 + "=" + value;
                        }
                        res.send(formatted);
                    }
                    return [2 /*return*/];
            }
        });
    });
};
/**
 * Makes an HTTP/HTTPS GET request to the specified URL and returns the response body.
 * @param url The URL to fetch.
 * @return A Promise that will be resolved the with response body if the request succeeds, or will be rejected with an
 * error if the request fails or returns a non-200 status code. This error may contain information about the HTTP
 * request or, response including API keys and other sensitive information.
 */
function httpRequest(url) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var splitUrl = url.match(filters.url);
                    var isHttps = url.startsWith("https");
                    var options = {
                        host: splitUrl[1],
                        port: splitUrl[2] || (isHttps ? 443 : 80),
                        path: splitUrl[3]
                    };
                    (isHttps ? https : http).get(options, function (response) {
                        if (response.statusCode !== 200) {
                            reject("Received " + response.statusCode + " status code for URL '" + url + "'.");
                            return;
                        }
                        var data = "";
                        // Reassemble the data as it comes in
                        response.on("data", function (chunk) {
                            data += chunk;
                        });
                        // Once the data is completely received, resolve the promise
                        response.on("end", function () {
                            resolve(data);
                        });
                    }).on("error", function (err) {
                        // If the HTTP request fails, reject the promise
                        reject(err);
                    });
                })];
        });
    });
}
/**
 * Checks if the specified object contains numeric values for each of the specified keys.
 * @param keys A list of keys to validate exist on the specified object.
 * @param obj The object to check.
 * @return A boolean indicating if the object has numeric values for all of the specified keys.
 */
function validateValues(keys, obj) {
    var key;
    // Return false if the object is null/undefined.
    if (!obj) {
        return false;
    }
    for (key in keys) {
        if (!keys.hasOwnProperty(key)) {
            continue;
        }
        key = keys[key];
        if (!obj.hasOwnProperty(key) || typeof obj[key] !== "number" || isNaN(obj[key]) || obj[key] === null || obj[key] === -999) {
            return false;
        }
    }
    return true;
}
exports.validateValues = validateValues;
/**
 * Converts a timezone to an offset in minutes or OpenSprinkler encoded format.
 * @param time A time string formatted in ISO-8601 or just the timezone.
 * @param useMinutes Indicates if the returned value should be in minutes of the OpenSprinkler encoded format.
 * @return The offset of the specified timezone in either minutes or OpenSprinkler encoded format (depending on the
 * value of useMinutes).
 */
function getTimezone(time, useMinutes) {
    if (useMinutes === void 0) { useMinutes = false; }
    var hour, minute;
    if (typeof time === "number") {
        hour = Math.floor(time / 60);
        minute = time % 60;
    }
    else {
        // Match the provided time string against a regex for parsing
        var splitTime = time.match(filters.time) || time.match(filters.timezone);
        hour = parseInt(splitTime[7] + splitTime[8]);
        minute = parseInt(splitTime[9]);
    }
    if (useMinutes) {
        return (hour * 60) + minute;
    }
    else {
        // Convert the timezone into the OpenSprinkler encoded format
        minute = (minute / 15 >> 0) / 4;
        hour = hour + (hour >= 0 ? minute : -minute);
        return ((hour + 12) * 4) >> 0;
    }
}
/**
 * Converts an IP address string to an integer.
 * @param ip The string representation of the IP address.
 * @return The integer representation of the IP address.
 */
function ipToInt(ip) {
    var split = ip.split(".");
    return ((((((+split[0]) * 256) + (+split[1])) * 256) + (+split[2])) * 256) + (+split[3]);
}
/**
 * Returns a single value for a header/query parameter. If passed a single string, the same string will be returned. If
 * an array of strings is passed, the first value will be returned. If this value is null/undefined, an empty string
 * will be returned instead.
 * @param parameter An array of parameters or a single parameter value.
 * @return The first element in the array of parameter or the single parameter provided.
 */
function getParameter(parameter) {
    if (Array.isArray(parameter)) {
        parameter = parameter[0];
    }
    // Return an empty string if the parameter is undefined.
    return parameter || "";
}
