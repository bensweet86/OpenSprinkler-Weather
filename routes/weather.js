var http		= require( "http" ),
	https		= require( "https" ),
	SunCalc		= require( "suncalc" ),
	moment		= require( "moment-timezone" ),
	geoTZ	 	= require( "geo-tz" ),

	// Define regex filters to match against location
	filters		= {
		gps: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
		pws: /^(?:pws|icao|zmw):/,
		url: /^https?:\/\/([\w\.-]+)(:\d+)?(\/.*)?$/,
		time: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2})(\d{2})/,
		timezone: /^()()()()()()([+-])(\d{2})(\d{2})/
	};
	
// If location does not match GPS or PWS/ICAO, then attempt to resolve
// location using Weather Underground autocomplete API
function resolveCoordinates( location, callback ) {

	// Generate URL for autocomplete request
	var url = "http://autocomplete.wunderground.com/aq?h=0&query=" +
		encodeURIComponent( location );

	httpRequest( url, function( data ) {

		// Parse the reply for JSON data
		data = JSON.parse( data );

		// Check if the data is valid
		if ( typeof data.RESULTS === "object" && data.RESULTS.length && data.RESULTS[ 0 ].tz !== "MISSING" ) {

			// If it is, reply with an array containing the GPS coordinates
			callback( [ data.RESULTS[ 0 ].lat, data.RESULTS[ 0 ].lon ], moment().tz( data.RESULTS[ 0 ].tz ).utcOffset() );
		} else {

			// Otherwise, indicate no data was found
			callback( false );
		}
	} );
}

function getDataHttp( url, callback ) {

	httpRequest( url, function( data ) {
		try {
			data = JSON.parse( data );
		} catch (err) {
			callback( {} );
			return;
		}
		callback( data );
		return;
	} );
}

function getDataHttps( url, callback ) {

	httpsRequest( url, function( data ) {
		try {
			data = JSON.parse( data );
		} catch (err) {
			callback( {} );
			return;
		}
		callback( data );
		return;
	} );
}

// Retrieve data from DarkSky for water level calculations
function getDSWateringData( location, darkSkyKey, callback ) {

	// Generate URL for Dark Sky Time Machine Request to get conditions yesterday and use forecast request for current conditions
	var forecastURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "?exclude=hourly,flags";

	getTimeData( location, function( weather ) {
			
		// Perform the HTTPs request to retrieve the time machine data for yesterday readings
		getDataHttps( forecastURL, function( forecastData ) {

			if ( !forecastData || !forecastData.daily.data || !forecastData.currently.temperature ) {
				callback( weather );
				return;
			}

			// Generate URL for Dark Sky Time machine request to get conditions for today
			var todayURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "," +
							( ( forecastData.daily.data[0].time) || 0 ) + "?exclude=currently,daily,flags";
			
			getDataHttps( todayURL, function( todayData ) {

				if ( !todayData || !todayData.hourly.data ) {
					callback( weather );
					return;
				}

				// Generate URL for Dark Sky Time Machine request to get conditions yesterday
				//		Use the time from current reading timestamp less 86400 (24hr in secs)
				var yesterdayURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "," +
								( ( forecastData.daily.data[0].time - 86400 ) || 0 ) + "?exclude=currently,flags";
				
				getDataHttps( yesterdayURL, function( yesterdayData ) {

					if ( !yesterdayData || !yesterdayData.daily.data || !yesterdayData.hourly.data ) {
						callback( weather );
						return;
					}

					var currentPrecip = 0,
						yesterdayPrecip = 0,
						maxCount = 24,
						index;
					
					for ( index = 0; index < maxCount; index++ ) {
						
						// Only use current day rainfall data for the hourly readings prior to the current hour
						if ( todayData.hourly.data[index].time <= ( forecastData.currently.time - 3600 ) ) {
							currentPrecip += parseFloat( todayData.hourly.data[index].precipIntensity );
						}
						
					}
					
					for ( index = 0; index < maxCount; index++ ) {
						yesterdayPrecip += parseFloat( yesterdayData.hourly.data[index].precipIntensity );
					}

					weather.maxTemp = parseInt( yesterdayData.daily.data[0].temperatureHigh ); //Takes logic of high during the day,
					weather.minTemp = parseInt( yesterdayData.daily.data[0].temperatureLow ); //low during the night based on DN logic
					weather.temp = parseInt( forecastData.currently.temperature );
					weather.humidity = parseFloat( yesterdayData.daily.data[0].humidity ) * 100;
					weather.wind = parseInt( yesterdayData.daily.data[0].windSpeed );
					weather.yesterdayPrecip = yesterdayPrecip;
					weather.currentPrecip = currentPrecip;
					weather.forecastPrecip = parseFloat( forecastData.daily.data[0].precipIntensity ) * 24;
					weather.precip = ( currentPrecip > 0 ? currentPrecip : 0) + ( yesterdayPrecip > 0 ? yesterdayPrecip : 0);
					weather.icon = forecastData.currently.icon || "clear-day";
					weather.solar = parseInt( forecastData.currently.uvIndex );
					weather.raining = ( forecastData.currently.icon = "rain" ? true : false);
					weather.source = "darksky";

					callback ( weather );
				} );
			} );
		} );
	} );
}

// Retrieve Dark Sky weather data from Open Weather Map for App
function getDSWeatherData( location, darkSkyKey, callback ) {

	// Generate URL for Dark Sky Time Machine Request to get conditions yesterday and use forecast request for current conditions
	var forecastURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "?exclude=hourly,flags";

	getTimeData( location, function( weather ) {

		// Perform the HTTPs request to retrieve the time machine data for yesterday readings
		getDataHttps( forecastURL, function( forecastData ) {

			if ( !forecastData || !forecastData.daily.data || !forecastData.currently.temperature ) {
				callback( weather );
				return;
			}

			// Generate URL for Dark Sky Time machine request to get conditions for today
			var todayURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "," +
							( ( forecastData.daily.data[0].time) || 0 ) + "?exclude=currently,daily,flags";
			
			getDataHttps( todayURL, function( todayData ) {

				if ( !todayData || !todayData.hourly.data ) {
					callback( weather );
					return;
				}

				// Generate URL for Dark Sky Time Machine request to get conditions yesterday
				//		Use the time from current reading timestamp less 86400 (24hr in secs)
				var yesterdayURL = "https://api.darksky.net/forecast/" + darkSkyKey + "/" +  location[ 0 ] + "," + location[ 1 ] + "," +
								( ( forecastData.daily.data[0].time - 86400 ) || 0 ) + "?exclude=currently,flags";
				
				getDataHttps( yesterdayURL, function( yesterdayData ) {

					if ( !yesterdayData || !yesterdayData.daily.data || !yesterdayData.hourly.data ) {
						callback( weather );
						return;
					}

					var currentPrecip = 0,
						yesterdayPrecip = 0,
						maxCount = 24,
						index;
					
					for ( index = 0; index < maxCount; index++ ) {
						
						// Only use current day rainfall data for the hourly readings prior to the current hour
						if ( todayData.hourly.data[index].time <= ( forecastData.currently.time - 3600 ) ) {
							currentPrecip += parseFloat( todayData.hourly.data[index].precipIntensity );
						}
						
					}
					
					for ( index = 0; index < maxCount; index++ ) {
						yesterdayPrecip += parseFloat( yesterdayData.hourly.data[index].precipIntensity );
					}

					weather.maxTemp = parseInt( yesterdayData.daily.data[0].temperatureHigh ); //Takes logic of high during the day,
					weather.minTemp = parseInt( yesterdayData.daily.data[0].temperatureLow ); //low during the night based on DN logic
					weather.temp = parseInt( forecastData.currently.temperature );
					weather.humidity = ( yesterdayData.daily.data[0].humidity ) * 100;
					weather.wind = parseInt( yesterdayData.daily.data[0].windSpeed );
					weather.yesterdayPrecip = yesterdayPrecip;
					weather.currentPrecip = currentPrecip;
					weather.forecastPrecip = parseFloat( forecastData.daily.data[0].precipIntensity ) * 24;
					weather.precip = ( currentPrecip > 0 ? currentPrecip : 0) + ( yesterdayPrecip > 0 ? yesterdayPrecip : 0);
					weather.icon = forecastData.currently.icon || "clear-day";
					weather.solar = parseInt( forecastData.currently.uvIndex );
					weather.forecast = [];

					for ( var index = 0; index < forecastData.daily.data.length; index++ ) {
						weather.forecast.push( {
							temp_min: parseInt( forecastData.daily.data[ index ].temperatureLow ),
							temp_max: parseInt( forecastData.daily.data[ index ].temperatureHigh ),
							precip: parseFloat( forecastData.daily.data[ index ].precipIntensity * 24),
							date: parseInt( forecastData.daily.data[ index ].time ),
							icon: forecastData.daily.data[ index ].icon,
						} );
					}
					weather.source = "darksky";

					callback ( weather );
				} );
			} );
		} );
	} );
}

// Retrieve data from Open Weather Map for water level calculations
function getOWMWateringData( location, callback ) {
	var OWM_API_KEY = process.env.OWM_API_KEY,
		forecastUrl = "http://api.openweathermap.org/data/2.5/forecast?appid=" + OWM_API_KEY + "&units=imperial&lat=" + location[ 0 ] + "&lon=" + location[ 1 ];

	getTimeData( location, function( weather ) {

		// Perform the HTTP request to retrieve the weather data
		getDataHttp( forecastUrl, function( forecast ) {

			if ( !forecast || !forecast.list ) {
				callback( weather );
				return;
			}

			weather.temp = 0;
			weather.humidity = 0;
			weather.precip = 0;

			var periods = Math.min(forecast.list.length, 10);
			for ( var index = 0; index < periods; index++ ) {
				weather.temp += parseFloat( forecast.list[ index ].main.temp );
				weather.humidity += parseInt( forecast.list[ index ].main.humidity );
				weather.precip += ( forecast.list[ index ].rain ? parseFloat( forecast.list[ index ].rain[ "3h" ] || 0 ) : 0 );
			}

			weather.temp = weather.temp / periods;
			weather.humidity = weather.humidity / periods;
			weather.precip = weather.precip / 25.4;
			weather.raining = ( forecast.list[ 0 ].rain ? ( parseFloat( forecast.list[ 0 ].rain[ "3h" ] || 0 ) > 0 ) : false );
			weather.source = "openweathermaps";

			callback( weather );
		} );
	} );
}

// Retrieve weather data from Open Weather Map for App
function getOWMWeatherData( location, callback ) {
	var OWM_API_KEY = process.env.OWM_API_KEY,
		currentUrl = "http://api.openweathermap.org/data/2.5/weather?appid=" + OWM_API_KEY + "&units=imperial&lat=" + location[ 0 ] + "&lon=" + location[ 1 ],
		forecastDailyUrl = "http://api.openweathermap.org/data/2.5/forecast/daily?appid=" + OWM_API_KEY + "&units=imperial&lat=" + location[ 0 ] + "&lon=" + location[ 1 ];

	getTimeData( location, function( weather ) {

		getDataHttp( currentUrl, function( current ) {

			getDataHttp( forecastDailyUrl, function( forecast ) {

				if ( !current || !current.main || !current.wind || !current.weather || !forecast || !forecast.list ) {
					callback( weather );
					return;
				}

				weather.temp = parseInt( current.main.temp );
				weather.humidity = parseInt( current.main.humidity );
				weather.wind = parseInt( current.wind.speed );
				weather.description = current.weather[0].description;
				weather.icon = current.weather[0].icon;

				weather.region = forecast.city.country;
				weather.city = forecast.city.name;
				weather.minTemp = parseInt( forecast.list[ 0 ].temp.min );
				weather.maxTemp = parseInt( forecast.list[ 0 ].temp.max );
				weather.precip = ( forecast.list[ 0 ].rain ? parseFloat( forecast.list[ 0 ].rain || 0 ) : 0 ) / 25.4;
				weather.forecast = [];

				for ( var index = 0; index < forecast.list.length; index++ ) {
					weather.forecast.push( {
						temp_min: parseInt( forecast.list[ index ].temp.min ),
						temp_max: parseInt( forecast.list[ index ].temp.max ),
						date: parseInt( forecast.list[ index ].dt ),
						icon: forecast.list[ index ].weather[ 0 ].icon,
						description: forecast.list[ index ].weather[ 0 ].description
					} );
				}
				weather.source = "openweathermaps";

				callback( weather );
			} );
		} );
	} );	
}

// Calculate timezone and sun rise/set information
function getTimeData( location, callback ) {

	var timezone = moment().tz( geoTZ( location[ 0 ], location[ 1 ] )[0] ).utcOffset();
	var tzOffset = getTimezone( timezone, "minutes" );

	// Calculate sunrise and sunset since Weather Underground does not provide it
	var sunData = SunCalc.getTimes( new Date(), location[ 0 ], location[ 1 ] );

	sunData.sunrise.setUTCMinutes( sunData.sunrise.getUTCMinutes() + tzOffset );
	sunData.sunset.setUTCMinutes( sunData.sunset.getUTCMinutes() + tzOffset );

	callback( {
		timezone:	timezone,
		sunrise:	( sunData.sunrise.getUTCHours() * 60 + sunData.sunrise.getUTCMinutes() ),
		sunset:		( sunData.sunset.getUTCHours() * 60 + sunData.sunset.getUTCMinutes() )
	} );
}

// Calculates the resulting water scale using the provided weather data, adjustment method and options
function calculateWeatherScale( adjustmentMethod, adjustmentOptions, weather ) {

	// Zimmerman method
	if ( adjustmentMethod === 1 ) {
		var humidityBase = 30, tempBase = 70, precipBase = 0;

		// Check to make sure valid data exists for all factors
		if ( !validateValues( [ "temp", "humidity", "precip" ], weather ) ) {
			return 100;
		}

		// Get baseline conditions for 100% water level, if provided
		if ( adjustmentOptions ) {
			humidityBase = adjustmentOptions.hasOwnProperty( "bh" ) ? adjustmentOptions.bh : humidityBase;
			tempBase = adjustmentOptions.hasOwnProperty( "bt" ) ? adjustmentOptions.bt : tempBase;
			precipBase = adjustmentOptions.hasOwnProperty( "br" ) ? adjustmentOptions.br : precipBase;
		}

		var temp = ( ( weather.maxTemp + weather.minTemp ) / 2 ) || weather.temp,
			humidityFactor = ( humidityBase - weather.humidity ),
			tempFactor = ( ( temp - tempBase ) * 4 ),
			precipFactor = ( ( precipBase - weather.precip ) * 200 );

		// Apply adjustment options, if provided, by multiplying the percentage against the factor
		if ( adjustmentOptions ) {
			if ( adjustmentOptions.hasOwnProperty( "h" ) ) {
				humidityFactor = humidityFactor * ( adjustmentOptions.h / 100 );
			}

			if ( adjustmentOptions.hasOwnProperty( "t" ) ) {
				tempFactor = tempFactor * ( adjustmentOptions.t / 100 );
			}

			if ( adjustmentOptions.hasOwnProperty( "r" ) ) {
				precipFactor = precipFactor * ( adjustmentOptions.r / 100 );
			}
		}

		// Apply all of the weather modifying factors and clamp the result between 0 and 200%.
		return parseInt( Math.min( Math.max( 0, 100 + humidityFactor + tempFactor + precipFactor ), 200 ) );
	}

	return -1;
}

// Checks if the weather data meets any of the restrictions set by OpenSprinkler.
// Restrictions prevent any watering from occurring and are similar to 0% watering level.
//
// California watering restriction prevents watering if precipitation over two days is greater
// than 0.01" over the past 48 hours.
function checkWeatherRestriction( adjustmentValue, weather ) {

	var californiaRestriction = ( adjustmentValue >> 7 ) & 1;

	if ( californiaRestriction ) {

		// If the California watering restriction is in use then prevent watering
		// if more then 0.1" of rain has accumulated in the past 48 hours
		if ( weather.precip > 0.1 ) {
			return true;
		}
	}

	return false;
}

exports.getWeatherData = function( req, res ) {
	var location 	= req.query.loc,
		darkSkyKey	= req.query.dskey;

	if ( filters.gps.test( location ) ) {

		// Handle GPS coordinates by storing each coordinate in an array
		location = location.split( "," );
		location = [ parseFloat( location[ 0 ] ), parseFloat( location[ 1 ] ) ];

		// Provide support for Dark Sky weather data
		if ( darkSkyKey ) {	

			getDSWeatherData( location, darkSkyKey, function( data ) {
				data.location = location;
				res.json( data );
			} );
			
		} else {	

			// Continue with the weather request
			getOWMWeatherData( location, function( data ) {
				data.location = location;
				res.json( data );
			} );
	    }
	} else {

		// Attempt to resolve provided location to GPS coordinates when it does not match
		// a GPS coordinate or Weather Underground location using Weather Underground autocomplete
		resolveCoordinates( location, function( result ) {
			if ( result === false ) {
				res.send( "Error: Unable to resolve location" );
				return;
			}

			location = result;

			// Provide support for Dark Sky weather data
			if ( darkSkyKey ) {	
				
				getDSWeatherData( location, darkSkyKey, function( data ) {
					data.location = location;
					res.json( data );
				} );
				
			} else {	

				// Continue with the weather request
				getOWMWeatherData( location, function( data ) {
					data.location = location;
					res.json( data );
				} );
			}
		} );
    }
};

// API Handler when using the weatherX.py where X represents the
// adjustment method which is encoded to also carry the watering
// restriction and therefore must be decoded
exports.getWateringData = function( req, res ) {

	// The adjustment method is encoded by the OpenSprinkler firmware and must be
	// parsed. This allows the adjustment method and the restriction type to both
	// be saved in the same byte.
	var adjustmentMethod		= req.params[ 0 ] & ~( 1 << 7 ),
		adjustmentOptions		= req.query.wto,
		location				= req.query.loc,
		darkSkyKey				= req.query.dskey,
		outputFormat			= req.query.format,
		remoteAddress			= req.headers[ "x-forwarded-for" ] || req.connection.remoteAddress,

		// Function that will accept the weather after it is received from the API
		// Data will be processed to retrieve the resulting scale, sunrise/sunset, timezone,
		// and also calculate if a restriction is met to prevent watering.
		finishRequest = function( weather ) {
			if ( !weather ) {
				if ( typeof location[ 0 ] === "number" && typeof location[ 1 ] === "number" ) {
					getTimeData( location, finishRequest );
				} else {
					res.send( "Error: No weather data found." );
				}

				return;
			}

			var scale = calculateWeatherScale( adjustmentMethod, adjustmentOptions, weather ),
				rainDelay = -1;

			// Check for any user-set restrictions and change the scale to 0 if the criteria is met
			if ( checkWeatherRestriction( req.params[ 0 ], weather ) ) {
				scale = 0;
			}

			// If any weather adjustment is being used, check the rain status
			if ( adjustmentMethod > 0 && weather.hasOwnProperty( "raining" ) && weather.raining ) {

				// If it is raining and the user has weather-based rain delay as the adjustment method then apply the specified delay
				if ( adjustmentMethod === 2 ) {

					rainDelay = ( adjustmentOptions && adjustmentOptions.hasOwnProperty( "d" ) ) ? adjustmentOptions.d : 24;
				} else {

					// For any other adjustment method, apply a scale of 0 (as the scale will revert when the rain stops)
					scale = 0;
				}
			}

			var data = {
					scale:		scale,
					rd:			rainDelay,
					tz:			getTimezone( weather.timezone ),
					sunrise:	weather.sunrise,
					sunset:		weather.sunset,
					eip:		ipToInt( remoteAddress )
				};
			
			// Return the response to the client in the requested format
			if ( outputFormat === "json" ) {
				res.json( data );
			} else {
				res.send(	"&scale="		+	data.scale +
							"&rd="			+	data.rd +
							"&tz="			+	data.tz +
							"&sunrise="		+	data.sunrise +
							"&sunset="		+	data.sunset +
							"&eip="			+	data.eip
				);
			}
		};

	// Exit if no location is provided
	if ( !location ) {
		res.send( "Error: No location provided." );
		return;
	}

	// X-Forwarded-For header may contain more than one IP address and therefore
	// the string is split against a comma and the first value is selected
	remoteAddress = remoteAddress.split( "," )[ 0 ];

	// Parse weather adjustment options
	try {

		// Parse data that may be encoded
		adjustmentOptions = decodeURIComponent( adjustmentOptions.replace( /\\x/g, "%" ) );

		// Reconstruct JSON string from deformed controller output
		adjustmentOptions = JSON.parse( "{" + adjustmentOptions + "}" );
	} catch ( err ) {

		// If the JSON is not valid, do not incorporate weather adjustment options
		adjustmentOptions = false;
	}

	// Parse location string
	if ( filters.pws.test( location ) ) {

		// Weather Underground is discontinued and PWS or ICAO cannot be resolved
		res.send( "Error: Weather Underground is discontinued." );
		return;
	} else if ( filters.gps.test( location ) ) {

		// Handle GPS coordinates by storing each coordinate in an array
		location = location.split( "," );
		location = [ parseFloat( location[ 0 ] ), parseFloat( location[ 1 ] ) ];

		// Provide support for Dark Sky weather data
		if ( darkSkyKey ) {	
			
			getDSWateringData( location, darkSkyKey, finishRequest );
			
		} else {
			
			// Continue with the weather request
			getOWMWateringData( location, finishRequest );
		}
	} else {

		// Attempt to resolve provided location to GPS coordinates when it does not match
		// a GPS coordinate or Weather Underground location using Weather Underground autocomplete
		resolveCoordinates( location, function( result ) {
			if ( result === false ) {
				res.send( "Error: Unable to resolve location" );
				return;
			}

			location = result;

			// Provide support for Dark Sky weather data
			if ( darkSkyKey ) {	
				
				getDSWateringData( location, darkSkyKey, finishRequest );
				
			} else {
				
				// Continue with the weather request
				getOWMWateringData( location, finishRequest );
			}			

		} );
    }
};

// Generic HTTP request handler that parses the URL and uses the
// native Node.js http module to perform the request
function httpRequest( url, callback ) {
	url = url.match( filters.url );

	var options = {
		host: url[ 1 ],
		port: url[ 2 ] || 80,
		path: url[ 3 ]
	};

	http.get( options, function( response ) {
        var data = "";

        // Reassemble the data as it comes in
        response.on( "data", function( chunk ) {
            data += chunk;
        } );

        // Once the data is completely received, return it to the callback
        response.on( "end", function() {
            callback( data );
        } );
	} ).on( "error", function() {

		// If the HTTP request fails, return false
		callback( false );
	} );
}

// Generic HTTPs request handler that parses the URL and uses the
// native Node.js http module to perform the request
function httpsRequest( url, callback ) {
	url = url.match( filters.url );

	var options = {
		host: url[ 1 ],
		port: url[ 2 ] || 443,
		path: url[ 3 ]
	};

	https.get( options, function( response ) {
        var data = "";

		response.setEncoding( "utf8" );

        // Reassemble the data as it comes in
        response.on( "data", function( chunk ) {
            data += chunk;
        } );

        // Once the data is completely received, return it to the callback
        response.on( "end", function() {
            callback( data );
        } );
	} ).on( "error", function() {

		// If the HTTP request fails, return false
		callback( false );
	} );
}

// Checks to make sure an array contains the keys provided and returns true or false
function validateValues( keys, array ) {
	var key;

	for ( key in keys ) {
		if ( !keys.hasOwnProperty( key ) ) {
			continue;
		}

		key = keys[ key ];

		if ( !array.hasOwnProperty( key ) || typeof array[ key ] !== "number" || isNaN( array[ key ] ) || array[ key ] === null || array[ key ] === -999 ) {
			return false;
		}
	}

	return true;
}

// Accepts a time string formatted in ISO-8601 or just the timezone
// offset and returns the timezone.
// The timezone output is formatted for OpenSprinkler Unified firmware.
function getTimezone( time, format ) {

	var hour, minute, tz;

	if ( typeof time === "number" ) {
		hour = Math.floor( time / 60 );
		minute = time % 60;
	} else {

		// Match the provided time string against a regex for parsing
		time = time.match( filters.time ) || time.match( filters.timezone );

		hour = parseInt( time[ 7 ] + time[ 8 ] );
		minute = parseInt( time[ 9 ] );
	}

	if ( format === "minutes" ) {
		tz = ( hour * 60 ) + minute;
	} else {

		// Convert the timezone into the OpenSprinkler encoded format
		minute = ( minute / 15 >> 0 ) / 4;
		hour = hour + ( hour >= 0 ? minute : -minute );

		tz = ( ( hour + 12 ) * 4 ) >> 0;
	}

	return tz;
}

// Converts IP string to integer
function ipToInt( ip ) {
    ip = ip.split( "." );
    return ( ( ( ( ( ( +ip[ 0 ] ) * 256 ) + ( +ip[ 1 ] ) ) * 256 ) + ( +ip[ 2 ] ) ) * 256 ) + ( +ip[ 3 ] );
}
