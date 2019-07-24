"use strict";
exports.__esModule = true;
var NodeCache = require("node-cache");
var moment = require("moment-timezone");
var geoTZ = require("geo-tz");
var WateringScaleCache = /** @class */ (function () {
    function WateringScaleCache() {
        this.cache = new NodeCache();
    }
    /**
     * Stores the results of a watering scale calculation. The scale will be cached until the end of the day in the local
     * timezone of the specified coordinates. If a scale has already been cached for the specified calculation parameters,
     * this method will have no effect.
     * @param adjustmentMethodId The ID of the AdjustmentMethod used to calculate this watering scale. This value should
     * have the appropriate bits set for any restrictions that were used.
     * @param coordinates The coordinates the watering scale was calculated for.
     * @param pws The PWS used to calculate the watering scale, or undefined if one was not used.
     * @param adjustmentOptions Any user-specified adjustment options that were used when calculating the watering scale.
     * @param wateringScale The results of the watering scale calculation.
     */
    WateringScaleCache.prototype.storeWateringScale = function (adjustmentMethodId, coordinates, pws, adjustmentOptions, wateringScale) {
        // The end of the day in the controller's timezone.
        var expirationDate = moment().tz(geoTZ(coordinates[0], coordinates[1])[0]).endOf("day");
        var ttl = (expirationDate.unix() - moment().unix());
        var key = this.makeKey(adjustmentMethodId, coordinates, pws, adjustmentOptions);
        this.cache.set(key, wateringScale, ttl);
    };
    /**
     * Retrieves a cached scale that was previously calculated with the given parameters.
     * @param adjustmentMethodId The ID of the AdjustmentMethod used to calculate this watering scale. This value should
     * have the appropriate bits set for any restrictions that were used.
     * @param coordinates The coordinates the watering scale was calculated for.
     * @param pws The PWS used to calculate the watering scale, or undefined if one was not used.
     * @param adjustmentOptions Any user-specified adjustment options that were used when calculating the watering scale.
     * @return The cached result of the watering scale calculation, or undefined if no values were cached.
     */
    WateringScaleCache.prototype.getWateringScale = function (adjustmentMethodId, coordinates, pws, adjustmentOptions) {
        var key = this.makeKey(adjustmentMethodId, coordinates, pws, adjustmentOptions);
        return this.cache.get(key);
    };
    WateringScaleCache.prototype.makeKey = function (adjustmentMethodId, coordinates, pws, adjustmentOptions) {
        return adjustmentMethodId + "#" + coordinates.join(",") + "#" + (pws ? pws.id : "") + "#" + JSON.stringify(adjustmentOptions);
    };
    return WateringScaleCache;
}());
exports["default"] = WateringScaleCache;
