/*! ┌───────────────────────────────────────────────────────────────────────────────────────────┐ */
/*! │ FireCollab v0.0.1 - Collaboration powered by Firebase                                     │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Copyright © 2013 Miroslav Hibler (http://MiroHibler.github.com/FireCollab/)               │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Licensed under the MIT (http://miro.mit-license.org) license.                             │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Dependencies: JSON Operational Transform (JOT) (https://github.com/JoshData/jot)          │ */
/*! └───────────────────────────────────────────────────────────────────────────────────────────┘ */


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



( function ( window, undefined ) {

	var _version = "0.0.1",

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


function FireCollabAdapter ( ID, dbName ) {

	var _base	= require( "jot/base.js" ),
		_collab	= require( "jot/collab.js" ),
		_obj	= require( "jot/objects.js" ),
		_seqs	= require( "jot/sequences.js" ),
		_values	= require( "jot/values.js" ),

		_fireCollabAdapter	= Object.subClass({

			get id() {
				return this._id;
			},	// get id

			get dbName() {
				return this._dbName;
			},	// get dbName

			get GUID() {
				return this._GUID;
			},	// get GUID

			set timeSinceLastOp( time ) {
				this._timeSinceLastOp;
			},

			get timeSinceLastOp() {
				return this._timeSinceLastOp;
			},

			get queue() {
				return this._queue;
			},

			get eventHandlers() {
				return this._eventHandlers;
			},

			get eventLoop() {
				return this._eventLoop;
			},

			get twoWayCollab() {
				return this._twoWayCollab;
			},

			init: function ( ID, dbName ) {
				var self = this;

				this._id = ID;

				if ( dbName ) {
					this._dbName = dbName;
				} else {
					this._dbName = ID;
				}

				this._GUID = makeGUID();

				this.timeSinceLastOp = 0;

				this._queue = {
					// use a two-stage queue so that operations are guaranteed
					// to wait before getting sent in the wire, in case they
					// are pushed just before an event fires
					//
					// we queue operations and not messages because we can
					// compose operations but we can't compose messages
					stage1: [],
					stage2: []
				}	// queue

				this._eventHandlers = {
				}	// eventHandlers

				this._eventLoop = {
					pushLocalChange: function ( op ) {
						self.queue.stage1.push( op );
					},
					flushLocalChanges: function () {
						var _ops = self.queue.stage2.concat( self.queue.stage1 );
						var _ops = _base.normalize_array( _ops );
						if ( _ops.length > 0 ) self.twoWayCollab.local_revision( _ops );
						self.queue.stage1 = [];
						self.queue.stage2 = [];
					}
				}	// eventLoop

				this._twoWayCollab = new _collab.TwoWayCollaboration(
					// receiver
					function( op, op_metadata ) {
						if ( self.eventHandlers.hasOwnProperty( "update" ) ) {
							self.eventHandlers[ "update" ]( op, op_metadata );
						}
					},
					// sender
					function( message ) {
						if ( self.eventHandlers.hasOwnProperty( "send" ) ) {
							self.eventHandlers[ "send" ]( self, message );
						}
					}
				);

				// Enable chaining
				return this;
			},	// init

			set: function ( doc ) {
				FireCollab.set( doc, this );

				// Enable chaining
				return this;
			},	// set

			sendQueue: function () {
				// send queue.stage2, then move queue.stage1 to queue.stage2,
				// and then schedule the next firing of the function
				var self = this;

				var _ops = _base.normalize_array( self.queue.stage2 );
				if ( _ops.length > 0 ) {
					self.twoWayCollab.local_revision( _ops );	// send whole arrays
					self.timeSinceLastOp = 0;

				// If there was no operation to send on this iteration, see if it's
				// time to send a period ping, which acknowledges that we're caught
				// up with the most recent remote revision we've received. That let's
				// the other end clear buffers.
				} else if ( self.twoWayCollab.needs_ack && self.timeSinceLastOp > FireCollab.maxAckTime ) {
					self.twoWayCollab.send_ping();
					self.timeSinceLastOp = 0;
				} else {
					self.timeSinceLastOp += 1;
				}
				self.queue.stage2 = self.queue.stage1;
				self.queue.stage1 = [];

				// TODO: Find out why remote revision sends "conflict-undo" message?
				// This is a hack to prevent it until fixed
				self.twoWayCollab.our_history = [];

				// Enable chaining
				return this;
			},

			// Event handlers
			// Example: if ( this.eventHandlers.hasOwnProperty( trigger ) ) this.eventHandlers[ trigger ]();
			// TODO: Implement event handler chaining
			on: function ( trigger, handler ) {
				if ( trigger ) {
					if ( typeof( trigger ) === "object" ) {
						this.eventHandlers = FireCollab.extend( {}, this.eventHandlers, trigger );
					} else {
						this.eventHandlers[ trigger ] = handler;
					}
				}

				// Enable chaining
				return this;
			},	// on

			// TODO: Remove event handler from chain
			off: function ( trigger ) {
				if ( typeof( trigger ) === "string" ) {
					// Clear single handler
					if ( this.eventHandlers.hasOwnProperty( trigger ) ) this.eventHandlers[ trigger ] = null;
				} else {
					// Clear all handlers
					for ( var handler in this.eventHandlers ) this.eventHandlers[ handler ] = null;
				}

				// Enable chaining
				return this;
			}	// off
		});

	// Return the FireCollab Adapter
	return _fireCollabAdapter;
}
