import * as moment from "moment-timezone";

import { GeoCoordinates, WeatherData, ZimmermanWateringData } from "../../types";
import { httpJSONRequest } from "../weather";
import { WeatherProvider } from "./WeatherProvider";
import { approximateSolarRadiation, CloudCoverInfo, EToData } from "../adjustmentMethods/EToAdjustmentMethod";
import { CodedError, ErrorCode } from "../../errors";

export default class DarkSkyWeatherProvider extends WeatherProvider {

	private readonly API_KEY: string;

	/* Disabled to support API Key from WebUI
	public constructor() {
		super();
		this.API_KEY = process.env.DARKSKY_API_KEY;
		if (!this.API_KEY) {
			throw "DARKSKY_API_KEY environment variable is not defined.";
		}
	}*/

	public async getWateringData( coordinates: GeoCoordinates, pws?: undefined, key?: String ): Promise< ZimmermanWateringData > {
		// The Unix timestamp of 24 hours ago.
		const yesterdayTimestamp: number = moment().subtract( 1, "day" ).unix();
		const todayTimestamp: number = moment().unix();

		const DARKSKY_API_KEY = key || process.env.DARKSKY_API_KEY,
			forecastUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] }?exclude=minutely,alerts,flags`,
			yesterdayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ yesterdayTimestamp }?exclude=currently,minutely,alerts,flags`,
			todayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ todayTimestamp }?exclude=currently,minutely,daily,alerts,flags`;

		let yesterdayData, todayData, forecastData;
		try {
			yesterdayData = await httpJSONRequest( yesterdayUrl );
			todayData = await httpJSONRequest( todayUrl );
			forecastData = await httpJSONRequest( forecastUrl );
		} catch ( err ) {
			console.error( "Error retrieving weather information from Dark Sky:", err );
			throw new CodedError( ErrorCode.WeatherApiError );
		}

		if ( !todayData || !todayData.hourly || !todayData.hourly.data || !yesterdayData || !yesterdayData.hourly || !yesterdayData.hourly.data || !yesterdayData.daily || !yesterdayData.daily.data || !forecastData || !forecastData.currently || !forecastData.daily || !forecastData.daily.data) {
			throw new CodedError( ErrorCode.MissingWeatherField );
		}

		var currentPrecip:number = 0,
			yesterdayPrecip:number = 0,
			maxCount:number = 24,
			index: number;

		for ( index = 0; index < maxCount; index++ ) {

			// Only use current day rainfall data for the hourly readings prior to the current hour
			if ( todayData.hourly.data[index].time <= ( forecastData.currently.time - 3600 ) ) {
				currentPrecip += parseFloat( todayData.hourly.data[index].precipIntensity );
			}

		}

		for ( index = 0; index < maxCount; index++ ) {
			yesterdayPrecip += parseFloat( yesterdayData.hourly.data[index].precipIntensity );
		}

		const samples = [
			...yesterdayData.hourly.data
		];

		// Fail if not enough data is available.
		// There will only be 23 samples on the day that daylight saving time begins.
		if ( samples.length !== maxCount && samples.length !== maxCount-1 ) {
			throw new CodedError( ErrorCode.InsufficientWeatherData );
		}

		const totals = { temp: 0, humidity: 0, precip: 0 };
		for ( const sample of samples ) {
			/*
			 * If temperature or humidity is missing from a sample, the total will become NaN. This is intended since
			 * calculateWateringScale will treat NaN as a missing value and temperature/humidity can't be accurately
			 * calculated when data is missing from some samples (since they follow diurnal cycles and will be
			 * significantly skewed if data is missing for several consecutive hours).
			 */
			totals.temp += sample.temperature;
			totals.humidity += sample.humidity;
			// This field may be missing from the response if it is snowing.
			totals.precip += sample.precipIntensity || 0;
		}

		return {
			weatherProvider: "DarkSky",
			temp: totals.temp / samples.length,
			humidity: parseFloat( yesterdayData.daily.data[0].humidity ) * 100,
			minTemp: parseFloat( yesterdayData.daily.data[0].temperatureLow ),  //Takes logic of high during the day,
			maxTemp: parseFloat( yesterdayData.daily.data[0].temperatureHigh ), //low during the night based on DN logic
			yesterdayPrecip: yesterdayPrecip,
			currentPrecip: currentPrecip,
			forecastPrecip: parseFloat( forecastData.daily.data[0].precipIntensity ) * 24,
			precip: ( currentPrecip > 0 ? currentPrecip : 0) + ( yesterdayPrecip > 0 ? yesterdayPrecip : 0),
			raining: ( forecastData.currently.icon == "rain" ? true : false)
		};
	}

	public async getWeatherData( coordinates: GeoCoordinates, key?: String ): Promise< WeatherData > {
		// The Unix timestamp of 24 hours ago.
		const yesterdayTimestamp: number = moment().subtract( 1, "day" ).unix();
		const todayTimestamp: number = moment().unix();

		const DARKSKY_API_KEY = key || process.env.DARKSKY_API_KEY,
			forecastUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] }?exclude=minutely,alerts,flags`,
			yesterdayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ yesterdayTimestamp }?exclude=currently,minutely,alerts,flags`,
			todayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ todayTimestamp }?exclude=currently,minutely,daily,alerts,flags`;

		let yesterdayData, todayData, forecastData;
		try {
			yesterdayData = await httpJSONRequest( yesterdayUrl );
			todayData = await httpJSONRequest( todayUrl );
			forecastData = await httpJSONRequest( forecastUrl );
		} catch ( err ) {
			console.error( "Error retrieving weather information from Dark Sky:", err );
			throw "An error occurred while retrieving weather information from Dark Sky."
		}

		if ( !todayData || !todayData.hourly || !todayData.hourly.data || !yesterdayData || !yesterdayData.hourly || !yesterdayData.hourly.data || !yesterdayData.daily || !yesterdayData.daily.data || !forecastData || !forecastData.currently || !forecastData.daily || !forecastData.daily.data ) {
			throw "Necessary field(s) were missing from weather information returned by Dark Sky.";
		}

		var currentPrecip:number = 0,
			yesterdayPrecip:number = 0,
			maxCount:number = 24,
			index: number;

		for ( index = 0; index < maxCount; index++ ) {

			// Only use current day rainfall data for the hourly readings prior to the current hour
			if ( todayData.hourly.data[index].time <= ( forecastData.currently.time - 3600 ) ) {
				currentPrecip += parseFloat( todayData.hourly.data[index].precipIntensity );
			}

		}

		for ( index = 0; index < maxCount; index++ ) {
			yesterdayPrecip += parseFloat( yesterdayData.hourly.data[index].precipIntensity );
		}

		const weather: WeatherData = {
			weatherProvider: "DarkSky",
			temp: parseInt( forecastData.currently.temperature ),
			humidity: ( yesterdayData.daily.data[0].humidity ) * 100,
			wind: parseInt( yesterdayData.daily.data[0].windSpeed ),
			description: forecastData.currently.summary || "",
			icon: forecastData.currently.icon || "clear-day",
			region: "",
			city: "",
			minTemp: parseInt( yesterdayData.daily.data[0].temperatureLow ),  //Takes logic of high during the day,
			maxTemp: parseInt( yesterdayData.daily.data[0].temperatureHigh ), //low during the night based on DN logic
			yesterdayPrecip: yesterdayPrecip,
			currentPrecip: currentPrecip,
			forecastPrecip: parseFloat( forecastData.daily.data[0].precipIntensity ) * 24,
			precip: ( currentPrecip > 0 ? currentPrecip : 0) + ( yesterdayPrecip > 0 ? yesterdayPrecip : 0),
			forecast: []
		};

		for ( let index = 0; index < forecastData.daily.data.length; index++ ) {
			weather.forecast.push( {
				temp_min: parseInt( forecastData.daily.data[ index ].temperatureLow ),
				temp_max: parseInt( forecastData.daily.data[ index ].temperatureHigh ),
				date: forecastData.daily.data[ index ].time,
				precip: parseFloat( forecastData.daily.data[ index ].precipIntensity ) * 24,
				icon: forecastData.daily.data[ index ].icon,
				description: forecastData.daily.data[ index ].summary
			} );
		}

		return weather;
	}

	public async getEToData( coordinates: GeoCoordinates, key?: String ): Promise< EToData > {
		// The Unix epoch seconds timestamp of 24 hours ago.
		const timestamp: number = moment().subtract( 1, "day" ).unix();

		const DARKSKY_API_KEY = key || process.env.DARKSKY_API_KEY,
			historicUrl = `https://api.darksky.net/forecast/${DARKSKY_API_KEY}/${coordinates[0]},${coordinates[1]},${timestamp}`;

		let historicData;
		try {
			historicData = await httpJSONRequest( historicUrl );
		} catch (err) {
			throw new CodedError( ErrorCode.WeatherApiError );
		}

		const cloudCoverInfo: CloudCoverInfo[] = historicData.hourly.data.map( ( hour ): CloudCoverInfo => {
			return {
				startTime: moment.unix( hour.time ),
				endTime: moment.unix( hour.time ).add( 1, "hours" ),
				cloudCover: hour.cloudCover
			};
		} );

		let minHumidity: number = undefined, maxHumidity: number = undefined;
		for ( const hour of historicData.hourly.data ) {
			// Skip hours where humidity measurement does not exist to prevent result from being NaN.
			if ( hour.humidity === undefined ) {
				continue;
			}

			// If minHumidity or maxHumidity is undefined, these comparisons will yield false.
			minHumidity = minHumidity < hour.humidity ? minHumidity : hour.humidity;
			maxHumidity = maxHumidity > hour.humidity ? maxHumidity : hour.humidity;
		}

		return {
			weatherProvider: "DarkSky",
			periodStartTime: historicData.hourly.data[ 0 ].time,
			minTemp: historicData.daily.data[ 0 ].temperatureMin,
			maxTemp: historicData.daily.data[ 0 ].temperatureMax,
			minHumidity: minHumidity * 100,
			maxHumidity: maxHumidity * 100,
			solarRadiation: approximateSolarRadiation( cloudCoverInfo, coordinates ),
			// Assume wind speed measurements are taken at 2 meters.
			windSpeed: historicData.daily.data[ 0 ].windSpeed,
			precip: ( historicData.daily.data[ 0 ].precipIntensity || 0 ) * 24
		};
	}

	public shouldCacheWateringScale(): boolean {
		return false;
	}

	private getOWMIconCode(icon: string) {
		switch(icon) {
			case "partly-cloudy-night":
				return "02n";
			case "partly-cloudy-day":
				return "02d";
			case "cloudy":
				return "03d";
			case "fog":
			case "wind":
				return "50d";
			case "sleet":
			case "snow":
				return "13d";
			case "rain":
				return "10d";
			case "clear-night":
				return "01n";
			case "clear-day":
			default:
				return "01d";
		}
	}
}
