import { GeoCoordinates, PWS, WeatherData, ZimmermanWateringData } from "../../types";
import { WeatherProvider } from "./WeatherProvider";
import { httpJSONRequest } from "../weather";
import { CodedError, ErrorCode } from "../../errors";

export default class WUnderground extends WeatherProvider {

	async getWateringData( coordinates: GeoCoordinates, key?: String, pws?: PWS ): Promise< ZimmermanWateringData > {
		if ( !pws ) {
			throw new CodedError( ErrorCode.NoPwsProvided );
		}

		const url = `https://api.weather.com/v2/pws/observations/hourly/7day?stationId=${ pws.id }&format=json&units=e&apiKey=${ pws.apiKey }`;
		let data;
		try {
			data = await httpJSONRequest( url );
		} catch ( err ) {
			console.error( "Error retrieving weather information from WUnderground:", err );
			throw new CodedError( ErrorCode.WeatherApiError );
		}

		// Take the 24 most recent observations.
		const samples = data.observations.slice( -24 );

		// Fail if not enough data is available.
		if ( samples.length !== 24 ) {
			throw new CodedError( ErrorCode.InsufficientWeatherData );
		}

		const totals = { temp: 0, humidity: 0, precip: 0 };
		for ( const sample of samples ) {
			totals.temp += sample.imperial.tempAvg;
			totals.humidity += sample.humidityAvg;
			totals.precip += sample.imperial.precipRate;
		}

		return {
			weatherProvider: "WUnderground",
			temp: totals.temp / samples.length,
			humidity: totals.humidity / samples.length,
			minTemp: undefined,
			maxTemp: undefined,
			yesterdayPrecip: undefined,
			currentPrecip: undefined,
			forecastPrecip: undefined,
			precip: totals.precip,
			raining: samples[ samples.length - 1 ].imperial.precipRate > 0
		}
	}
}
