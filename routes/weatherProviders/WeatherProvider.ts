import { GeoCoordinates, PWS, WeatherData, ZimmermanWateringData } from "../../types";
import { EToData } from "../adjustmentMethods/EToAdjustmentMethod";

export class WeatherProvider {
	/**
	 * Retrieves weather data necessary for Zimmerman watering level calculations.
	 * @param coordinates The coordinates to retrieve the watering data for.
	 * @param key Optional key to be used for the endpoint API provided with Weather API request
	 * @param pws The PWS to retrieve the weather from, or undefined if a PWS should not be used. If the implementation
	 * of this method does not have PWS support, this parameter may be ignored and coordinates may be used instead.
	 * @return A Promise that will be resolved with the ZimmermanWateringData if it is successfully retrieved,
	 * or rejected with an error message if an error occurs while retrieving the ZimmermanWateringData or the WeatherProvider
	 * does not support this method.
	 */
	getWateringData( coordinates: GeoCoordinates, key?: String, pws?: PWS ): Promise< ZimmermanWateringData > {
		throw "Selected WeatherProvider does not support getWateringData";
	}

	/**
	 * Retrieves the current weather data for usage in the mobile app.
	 * @param coordinates The coordinates to retrieve the weather for
	 * @param key Optional key to be used for the endpoint API provided with Weather API request
	 * @return A Promise that will be resolved with the WeatherData if it is successfully retrieved,
	 * or rejected with an error message if an error occurs while retrieving the WeatherData or the WeatherProvider does
	 * not support this method.
	 */
	getWeatherData( coordinates : GeoCoordinates, key: String  ): Promise< WeatherData > {
		throw "Selected WeatherProvider does not support getWeatherData";
	}

	/**
	 * Retrieves the data necessary for calculating potential ETo.
	 * @param coordinates The coordinates to retrieve the data for.
	 * @return A Promise that will be resolved with the EToData if it is successfully retrieved,
	 * or rejected with an error message if an error occurs while retrieving the EToData or the WeatherProvider does
	 * not support this method.
	 */
	getEToData( coordinates: GeoCoordinates ): Promise< EToData > {
		throw "Selected WeatherProvider does not support getEToData";
	};

	/**
	 * Returns a boolean indicating if watering scales calculated using data from this WeatherProvider should be cached
	 * until the end of the day in timezone the data was for.
	 * @return a boolean indicating if watering scales calculated using data from this WeatherProvider should be cached.
	 */
	shouldCacheWateringScale(): boolean {
		return false;
	}
}
