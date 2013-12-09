
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
