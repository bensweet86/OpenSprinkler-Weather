import { GeoCoordinates, WateringData, WeatherData } from "../../types";
import { httpJSONRequest } from "../weather";
import { WeatherProvider } from "./WeatherProvider";

export default class OWMWeatherProvider extends WeatherProvider {

	public async getWateringData( coordinates: GeoCoordinates ): Promise< WateringData > {
		const OWM_API_KEY = process.env.OWM_API_KEY,
			forecastUrl = "http://api.openweathermap.org/data/2.5/forecast?appid=" + OWM_API_KEY + "&units=imperial&lat=" + coordinates[ 0 ] + "&lon=" + coordinates[ 1 ];

		// Perform the HTTP request to retrieve the weather data
		let forecast;
		try {
			forecast = await httpJSONRequest( forecastUrl );
		} catch ( err ) {
			console.error( "Error retrieving weather information from OWM:", err );
			throw "An error occurred while retrieving weather information from OWM."
		}

		// Indicate watering data could not be retrieved if the forecast data is incomplete.
		if ( !forecast || !forecast.list ) {
			throw "Necessary field(s) were missing from weather information returned by OWM.";
		}

		let totalTemp = 0,
			totalHumidity = 0,
			totalPrecip = 0;

		const periods = Math.min( forecast.list.length, 8 );
		for ( let index = 0; index < periods; index++ ) {
			totalTemp += parseFloat( forecast.list[ index ].main.temp );
			totalHumidity += parseInt( forecast.list[ index ].main.humidity );
			totalPrecip += ( forecast.list[ index ].rain ? parseFloat( forecast.list[ index ].rain[ "3h" ] || 0 ) : 0 );
		}

		return {
			weatherProvider: "OWM",
			temp: totalTemp / periods,
			humidity: totalHumidity / periods,
			minTemp: null,
			maxTemp: null,
			yesterdayPrecip: null,
			currentPrecip: null,
			forecastPrecip: null,
			precip: totalPrecip / 25.4,
			raining: ( forecast.list[ 0 ].rain ? ( parseFloat( forecast.list[ 0 ].rain[ "3h" ] || 0 ) > 0 ) : false )
		};
	}

	public async getWeatherData( coordinates: GeoCoordinates ): Promise< WeatherData > {
		const OWM_API_KEY = process.env.OWM_API_KEY,
			currentUrl = "http://api.openweathermap.org/data/2.5/weather?appid=" + OWM_API_KEY + "&units=imperial&lat=" + coordinates[ 0 ] + "&lon=" + coordinates[ 1 ],
			forecastDailyUrl = "http://api.openweathermap.org/data/2.5/forecast/daily?appid=" + OWM_API_KEY + "&units=imperial&lat=" + coordinates[ 0 ] + "&lon=" + coordinates[ 1 ];

		let current, forecast;
		try {
			current = await httpJSONRequest( currentUrl );
			forecast = await httpJSONRequest( forecastDailyUrl );
		} catch ( err ) {
			console.error( "Error retrieving weather information from OWM:", err );
			throw "An error occurred while retrieving weather information from OWM."
		}

		// Indicate watering data could not be retrieved if the forecast data is incomplete.
		if ( !current || !current.main || !current.wind || !current.weather || !forecast || !forecast.list ) {
			throw "Necessary field(s) were missing from weather information returned by OWM.";
		}

		const weather: WeatherData = {
			weatherProvider: "OWM",
			temp: parseInt( current.main.temp ),
			humidity: parseInt( current.main.humidity ),
			wind: parseInt( current.wind.speed ),
			description: current.weather[ 0 ].description,
			icon: current.weather[ 0 ].icon,
			region: forecast.city.country,
			city: forecast.city.name,
			minTemp: parseInt( forecast.list[ 0 ].temp.min ),
			maxTemp: parseInt( forecast.list[ 0 ].temp.max ),
			yesterdayPrecip: null,
			currentPrecip: null,
			forecastPrecip: null,
			precip: ( forecast.list[ 0 ].rain ? parseFloat( forecast.list[ 0 ].rain || 0 ) : 0 ) / 25.4,
			forecast: []
		};

		for ( let index = 0; index < forecast.list.length; index++ ) {
			weather.forecast.push( {
				temp_min: parseInt( forecast.list[ index ].temp.min ),
				temp_max: parseInt( forecast.list[ index ].temp.max ),
				date: parseInt( forecast.list[ index ].dt ),
				precip: null,
				icon: forecast.list[ index ].weather[ 0 ].icon,
				description: forecast.list[ index ].weather[ 0 ].description
			} );
		}

		return weather;
	}
}
