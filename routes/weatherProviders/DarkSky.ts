import * as moment from "moment-timezone";

import { GeoCoordinates, WateringData, WeatherData } from "../../types";
import { httpJSONRequest } from "../weather";
import { WeatherProvider } from "./WeatherProvider";

export default class DarkSkyWeatherProvider extends WeatherProvider {

	public async getWateringData( coordinates: GeoCoordinates, key: String ): Promise< WateringData > {
		// The Unix timestamp of 24 hours ago.
		const yesterdayTimestamp: number = moment().subtract( 1, "day" ).unix();
		const todayTimestamp: number = moment().unix();

		const DARKSKY_API_KEY = key || process.env.DARKSKY_API_KEY,
			forecastUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] }?exclude=minutely,alerts,flags`,
			yesterdayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ yesterdayTimestamp }?exclude=currently,minutely,daily,alerts,flags`,
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

		if ( !todayData.hourly || !todayData.hourly.data || !yesterdayData.hourly || !yesterdayData.hourly.data ) {
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

		/* The number of hourly forecasts to use from today's data. This will only include elements that contain historic
			data (not forecast data). */
		// Find the first element that contains forecast data.
		const todayElements = Math.min( maxCount, todayData.hourly.data.findIndex( ( data ) => data.time > todayTimestamp - 60 * 60 ) );

		/* Take as much data as possible from the first elements of today's data and take the remaining required data from
			the remaining data from the last elements of yesterday's data. */
		const samples = [
			...yesterdayData.hourly.data.slice( todayElements - 24 ),
			...todayData.hourly.data.slice( 0, todayElements )
		];

		// Fail if not enough data is available.
		if ( samples.length !== maxCount ) {
			throw "Insufficient data was returned by Dark Sky.";
		}

		const totals = { temp: 0, humidity: 0, precip: 0 };
		for ( const sample of samples ) {
			totals.temp += sample.temperature;
			totals.humidity += sample.humidity;
			totals.precip += sample.precipIntensity
		}

		return {
			weatherProvider: "DarkSky",
			temp: totals.temp / 24,
			humidity: parseFloat( yesterdayData.daily.data[0].humidity ) * 100,
			minTemp: parseInt( yesterdayData.daily.data[0].temperatureLow ),  //Takes logic of high during the day,
			maxTemp: parseInt( yesterdayData.daily.data[0].temperatureHigh ), //low during the night based on DN logic
			yesterdayPrecip: yesterdayPrecip,
			currentPrecip: currentPrecip,
			forecastPrecip: parseFloat( forecastData.daily.data[0].precipIntensity ) * 24,
			precip: ( currentPrecip > 0 ? currentPrecip : 0) + ( yesterdayPrecip > 0 ? yesterdayPrecip : 0),
			raining: ( forecastData.currently.icon = "rain" ? true : false)
		};
	}

	public async getWeatherData( coordinates: GeoCoordinates, key: String ): Promise< WeatherData > {
		// The Unix timestamp of 24 hours ago.
		const yesterdayTimestamp: number = moment().subtract( 1, "day" ).unix();
		const todayTimestamp: number = moment().unix();
		
		const DARKSKY_API_KEY = key || process.env.DARKSKY_API_KEY,
			forecastUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] }?exclude=minutely,alerts,flags`,
			yesterdayUrl = `https://api.darksky.net/forecast/${ DARKSKY_API_KEY }/${ coordinates[ 0 ] },${ coordinates[ 1 ] },${ yesterdayTimestamp }?exclude=currently,minutely,daily,alerts,flags`,
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
}
