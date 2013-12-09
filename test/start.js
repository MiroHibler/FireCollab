/*
	Start local HTTP server for testing purposes

	NOTE: This will *NOT* serve files outside of test directory!!!
			if you want that functionality, please consider
			'servedir' (https://github.com/remy/servedir)
 */
start_server = function ( port, serve_path ) {
	var _app = require( 'http' ).createServer( handler ),
		_port = port || 8080,
		_path = serve_path || ".";

	_app.listen( _port );

	console.log( 'Serving ' + require( 'path' ).resolve( _path ) + ' on http://localhost:' + _port );

	function handler ( req, res ) {
		var cs = require( 'connect' ).static( _path, {} );
		return cs( req, res, function () { res.end(); } );

		// res.writeHead(403);
		// res.end( 'Nothing here but a FireCollab test server.' );
	}
};

start_server( 8080, '.' );
