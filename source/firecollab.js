
( function ( window, undefined ) {

	var _version = "<%= meta.version %>",

		_GUID,
		_firebase,

		_baseURL	= "https://firecollab.firebaseio.com",
		_newContext	= true,

		_base = require( "jot/base.js" ),

		_adapters = [],

		_setFirebase = function ( baseURL, newContext ) {
			// Create new Firebase connection
			if ( typeof baseURL !== "string" ) {
				throw new Error( "Invalid baseURL provided" );
			}

			return new Firebase(
				baseURL, newContext || false ? new Firebase.Context() : null
			);
		},	// _setFirebase

		_queueSendChanges = function ( bufferTime ) {
			window.setTimeout( "fireCollabSendChanges()", bufferTime );
		},	// _queueSendChanges

		_firecollab = function() {
			// The FireCollab object is actually just the init constructor 'enhanced'
			return new _firecollab.fn.init();
		}	// _firecollab

	_firecollab.fn = _firecollab.prototype = {

		constructor: _firecollab,

		get version() {
			return _version;
		},

		set bufferTime( bufferTime ) {	// min time between sending changes over the wire, in milliseconds
			this._opBufferTime = bufferTime;
		},

		get bufferTime() {
			return this._opBufferTime;
		},

		set maxAckTime( maxAckTime ) {	// max time between sending changes (number of op_buffer_time intervals)
			this._maxAckTime = maxAckTime;
		},

		get maxAckTime() {
			return this._maxAckTime;
		},

		get db() {
			return _firebase;
		},

		init: function () {
			var self = this;

			if ( window.jQuery ) {
				this.extend = jQuery.extend;
			};

			this._opBufferTime	= 250,
			this._maxAckTime	= 10,

			_GUID		= makeGUID();
			_firebase	= _setFirebase( _baseURL, _newContext );

			// send queue.stage2, then move queue.stage1 to queue.stage2,
			// and then schedule the next firing of the function
			window.fireCollabSendChanges = function() {
				for ( var i = 0; i < _adapters.length; i++ ) {
					_adapters[i].sendQueue();
				}
				_queueSendChanges( self.bufferTime );
			}
			_queueSendChanges( self.bufferTime );

			// Enable chaining
			return this;
		},	// init

		initDB: function ( baseURL, newContext ) {
			_firebase = _setFirebase( baseURL, newContext );

			// Enable chaining
			return this;
		},	// baseURL

		register: function ( adapter ) {
			if ( adapter ) {
				_adapters.push( adapter );

				var self = this;

				adapter.on( "send", self.push );

				_firebase.child( adapter.dbName ).child( "doc" ).once( "value", function ( dataSnapshot ) {

					if ( adapter.eventHandlers.hasOwnProperty( "init" ) ) {
						adapter.eventHandlers[ "init" ]( dataSnapshot.val() );
					}

					if ( adapter.eventHandlers.hasOwnProperty( "update" ) ) {
						_firebase.child( adapter.dbName ).child( "history" ).on( "child_added", function( childSnapshot, prevChildName ) {
							var v = childSnapshot.val();
							if ( v.author === adapter.GUID ) return;
							// prevent recursive fail by running async
							setTimeout( function () {
								adapter.eventLoop.flushLocalChanges();
								adapter.twoWayCollab.process_remote_message( v.msg );	// actual ot message
							}, 0 );
						});
					}
				});
			}

			// Enable chaining
			return this;
		},	// register

		set: function ( doc, adapter ) {
			this.db.child( adapter.dbName ).child( "doc" ).set( doc );

			// Enable chaining
			return this;
		},	// set

		push: function ( adapter, message ) {
			var change = {
					author: adapter.GUID,
					msg: message
				};

			_firebase.child( adapter.dbName ).child( "history" ).push( change );

			// Enable chaining
			return this;
		},	// push

		extend: function () {
			// Mimic jQuery's $.extend
			for ( var i = 1; i < arguments.length; i++ ) {
				for ( var key in arguments[i] ) {
					if ( arguments[i].hasOwnProperty( key ) ) {
						arguments[0][ key ] = arguments[i][ key ];
					}
				}
			}

			return arguments[0];
		}	// extend
	};

	// Give the init function the FireCollab prototype for later instantiation
	_firecollab.fn.init.prototype = _firecollab.fn;

	// If there is a window object define FireCollab identifier
	if ( typeof window === "object" ) {
		window.FireCollab = new _firecollab();
	}

})( window );
