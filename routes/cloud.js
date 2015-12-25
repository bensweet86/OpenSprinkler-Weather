exports.computeSecret = function( otherPublicKey, callback ) {
	var NBYTES = 16,
		GENERATOR = 6,
		MODULO = 251,
		i, b = [], key = [], hex = "";

	for ( i = 0; i < NBYTES; i++ ) {
		b[ i ] = Math.floor( Math.random() * MODULO );
		key[ i ] = powmod( GENERATOR, b[ i ], MODULO );
		hex = hex + ( ( key[ i ] >> 4 ).toString( 16 ) ) + ( ( key[ i ] & 0xf ).toString( 16 ) );
	}
	for ( i = 0; i < NBYTES; i++ ) {
		key[ i ] = ( h2i( otherPublicKey[ 2 * i ] ) << 4 ) | h2i( otherPublicKey[ 2 * i + 1 ] );
		key[ i ] = powmod( key[ i ], b[ i ], MODULO );
	}
	callback( hex, key );
};

function powmod( g, c, m ) {
	var ret = 1;
	for ( var i = 0; i < c; i++ ) {
		ret = Math.floor( ( ret * g ) % m );
	}
	return ret;
}

function h2i( c ) {
	if ( c >= 48 && c <= 57 ) {
		return c - 48;
	}
	if ( c >= 97 && c <= 102 ) {
		return 10 + c - 97;
	}
	if ( c >= 65 && c <= 70 ) {
		return 10 + c - 65;
	}
	return 0;
}
