/*
 Some Utilites
 */

// Object Creation Utility
;if ( typeof Object.create !== "function" ) {
	Object.create = function ( obj ) {
		function F() {};
		F.prototype = obj;
		return new F();
	};
}

// JOT uses this a lot
String.prototype.splice = function ( idx, rem, s ) {
	return ( this.slice( 0, idx ) + s + this.slice( idx + Math.abs( rem ) ) );
}

// And some more...
function makeGUID () {
	// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function ( c ) {
		var r = Math.random() * 16|0, v = c == 'x' ? r : ( r&0x3|0x8 );
		return v.toString( 16 );
	});
}

function randomString ( length ) {
	// Create random string that can be used to name new session
	// Stollen from: https://github.com/firebase/firepad
	var seed = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var name = "";

	for ( var i = 0; i < length; i++ ) {
		name += seed.charAt( Math.floor( Math.random() * seed.length ) );
	}

	return name;
}

/*
 End of Utilites
 */

