"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var WeatherProvider_1 = require("./WeatherProvider");
var weather_1 = require("../weather");
var WUnderground = /** @class */ (function (_super) {
    __extends(WUnderground, _super);
    function WUnderground() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WUnderground.prototype.getWateringData = function (coordinates, key, pws) {
        return __awaiter(this, void 0, void 0, function () {
            var url, data, err_1, samples, totals, _i, samples_1, sample;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!pws) {
                            throw "WUnderground WeatherProvider requires a PWS to be specified.";
                        }
                        url = "https://api.weather.com/v2/pws/observations/hourly/7day?stationId=" + pws.id + "&format=json&units=e&apiKey=" + pws.apiKey;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, weather_1.httpJSONRequest(url)];
                    case 2:
                        data = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.error("Error retrieving weather information from WUnderground:", err_1);
                        throw "An error occurred while retrieving weather information from WUnderground.";
                    case 4:
                        samples = data.observations.slice(-24);
                        // Fail if not enough data is available.
                        if (samples.length !== 24) {
                            throw "Insufficient data was returned by WUnderground.";
                        }
                        totals = { temp: 0, humidity: 0, precip: 0 };
                        for (_i = 0, samples_1 = samples; _i < samples_1.length; _i++) {
                            sample = samples_1[_i];
                            totals.temp += sample.imperial.tempAvg;
                            totals.humidity += sample.humidityAvg;
                            totals.precip += sample.imperial.precipRate;
                        }
                        return [2 /*return*/, {
                                weatherProvider: "WUnderground",
                                temp: totals.temp / samples.length,
                                humidity: totals.humidity / samples.length,
                                minTemp: undefined,
                                maxTemp: undefined,
                                yesterdayPrecip: undefined,
                                currentPrecip: undefined,
                                forecastPrecip: undefined,
                                precip: totals.precip,
                                raining: samples[samples.length - 1].imperial.precipRate > 0
                            }];
                }
            });
        });
    };
    return WUnderground;
}(WeatherProvider_1.WeatherProvider));
exports["default"] = WUnderground;
