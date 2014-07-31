/*! ┌───────────────────────────────────────────────────────────────────────────────────────────┐ */
/*! │ <%= meta.title %> v<%= meta.version %> - <%= meta.description %>                                     │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Copyright © <%= meta.copyright %> (<%= meta.homepage %>)               │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Licensed under the MIT (<%= meta.licenses[0]["url"] %>) license.                             │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Requirements: RaphBoard (http://MiroHibler.github.com/RaphBoard/)                         │ */
/*! │               FireCollab (http://MiroHibler.github.com/FireCollab/)                       │ */
/*! └───────────────────────────────────────────────────────────────────────────────────────────┘ */

function RaphBoardAdapter ( containerID, dbName ) {

	var _version = "0.1.0",

		_obj	= require( "jot/objects.js" ),
		_seqs	= require( "jot/sequences.js" ),
		_values	= require( "jot/values.js" ),

		_nodeId,		// Current node ID

		_attrQueue,		// new element attributes, queued, ie.: { 37: { x: 0, y: 0 } }
		_ftData,		// freeTransform data object, ie.: { 37: { x: 0, y: 0 } }

		_queueAttrs = function ( id, update ) {
			if ( !_attrQueue ) {
				_attrQueue = {/* ie.: 37: { x: 0, y: 0 } */};
			}
			for ( key in update ) {
				if ( !_attrQueue.hasOwnProperty( id ) ) {
					_attrQueue[id] = {};
				}
				_attrQueue[id][key] = update[key];
			}
		},

		_queueFreeTransform = function ( board, id, attrs ) {
			if ( !_ftData ) {
				_ftData = {/* ie.: 37: { x: 0, y: 0 } */};
			}
			_ftData[id] = $.extend( {}, _ftData[id], attrs );
		},

		_exeQueuedAttrs = function ( board ) {
			for ( id in _attrQueue ) {
				board.modify( id, _attrQueue[id] );
			}
			_attrQueue = null;		// Clear the modification queue
		},

		_exeFreeTransform = function ( board ) {
			for ( id in _ftData ) {
				board.freeTransform( id, _ftData[id] );
			}
			_ftData = null;			// Clear the freeTransform queue
		},

		_elementIndex = function ( elements, id ) {
			for ( var i = 0; i < elements.length; i++ ) {
				if ( elements[i].id === id ) {
					return i;
				}
			}
			// If there's no element with specified id,
			// return the last index (first non-existant)
			return i;
		},

		_updateElementAttribute = function ( self, id, path, op ) {
			var _path = path || [ "element", "attrs" ];
			var _index = _elementIndex( self.board.elements, id );
			if ( _index != null ) {
				var _op = _obj.access(
						[ _index ].concat( _path ),
						op
					);
				self.eventLoop.pushLocalChange( _op );
			}
		},

		_updateElementAttributes = function ( self, element, oldAttributes, newAttributes, path ) {
			var _path = path || [ "element" ];
			for ( _field in newAttributes ) {
				var _newValue = newAttributes[_field];
				if ( _newValue instanceof Object ) {
					_updateElementAttributes(
						self,
						element,
						oldAttributes.hasOwnProperty( _field ) ? oldAttributes[_field] : {},
						_newValue,
						_path.concat( [ _field ] )
					)
				} else {
					var _oldValue = ( oldAttributes.hasOwnProperty( _field ) ) ? oldAttributes[_field] : "";
					if ( _newValue !== _oldValue ) {
						_updateElementAttribute(
							self,
							element.id,
							_path.concat( [ _field ] ),
							_values.REP(
								_oldValue,
								_newValue
							)
						);
					}
				}
			}
		},

		_previousElement = function ( buffer, elem ) {
			for ( var i = buffer.length - 1; i >= 0; i-- ) {
				if ( buffer[i].element.id === elem.element.id ) {
					return buffer[i];
				}
			};
			return elem;	// If not found, return the same element
		},

		_insertElementBefore = function ( self, elem, index ) {
			var _op = _obj.access(
					// TODO: Take care of adding elements to
					// sets as well as to paper (root)
					[],
					"sequences.js",
					"INS",
					index,
					[ JSON.parse( JSON.stringify( elem ) ) ]
				);
			self.eventLoop.pushLocalChange( _op );
		},

		_appendElement = function ( self, elem ) {
			_insertElementBefore( self, elem, self.board.elements.length - 1 );	// it's already been inserted
		},

		_removeElement = function ( self, index, elem ) {
			if ( index != null ) {
				var _op = _obj.access(
						// TODO: Take care of removing elements from
						// sets as well as from paper (root)
						[],
						"sequences.js",
						"DEL",
						index,
						[ JSON.parse( JSON.stringify( elem ) ) ]
					);

				self.eventLoop.pushLocalChange( _op );
			}
		},

		_raphBoardAdapter = new FireCollabAdapter( containerID, dbName ),

		_prototype = {

			get version() {
				return _version;
			},	// get version

			set board( board ) {
				this._board = board;
			},

			get board() {
				return this._board;
			},

			init: function ( containerID, dbName ) {
				// Call Super handler
				this._super( containerID, dbName );

				this._textX = this._textY = this._mode = "",
				this._undoBufferCount = this._redoBufferCount = 0,
				this._oldElements = [],

				this.board = $( "#" + containerID ).RaphBoard();

				this.enable();

				return this;
			},	// init

			enable: function () {
				var self = this;

				if ( self.board ) {
					self.board
						.on( "before_start", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							self._redoBufferCount = board.redoBuffer.length;

							switch ( board.mode() ) {
							case "text":
								// return false;
							default:
								return true;
							}	// switch ( board.mode() )
						})
						.on( "after_end", function( board ) {
							if ( board.undoBuffer.length > self._undoBufferCount ) {
								var _elem = board.undoBuffer.pop(),
									_prev = _previousElement( board.undoBuffer, _elem );
								board.undoBuffer.push( _elem );

								switch ( _elem.command ) {	// "move|modify|transform|pen|line|arrow|circle|ellipse|rect|text|cut|clear"
								case "move":
								case "modify":
								case "transform":
									// Nothing yet
									break;
								default:	// Add element
									_appendElement( self, _elem );
								}	// switch ( _elem.command )
							}
						})
						.on( "before_move", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							return true;
						})
						.on( "after_move", function( board ) {
							if ( board.undoBuffer.length > self._undoBufferCount ) {
								var _elem = board.undoBuffer.pop(),
									_prev = _previousElement( board.undoBuffer, _elem );
								board.undoBuffer.push( _elem );
								if ( _prev ) {
									_updateElementAttributes(
										self,
										_elem.element,
										_prev.element.data.ft.attrs ? _prev.element.data.ft.attrs : {},
										_elem.element.data.ft.attrs ? _elem.element.data.ft.attrs : {},
										[ "element", "data", "ft", "attrs" ]
									);
								}
							}
						})
						.on( "before_cut", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							self._oldElements = JSON.parse( board.toJSON() );
							return true;
						})
						.on( "after_cut", function( board ) {
							if ( board.undoBuffer.length > self._undoBufferCount ) {
								var id = board.undoBuffer[ board.undoBuffer.length - 1 ].element.id;
								for ( var i = 0; i < self._oldElements.length; i++ ) {
									if ( self._oldElements[i].element.id === id ) {
										_removeElement( self, i, self._oldElements[i] );
										self._oldElements = null;
										break;
									}
								}
							}
							self._oldElements = null;
						})
						.on( "before_undo", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							self._redoBufferCount = board.redoBuffer.length;
							return true;
						})
						.on( "after_undo", function( board ) {
							if ( board.redoBuffer.length > self._redoBufferCount ) {
								var _elem = board.redoBuffer[ board.redoBuffer.length - 1 ],
									_prev = _previousElement( board.undoBuffer, _elem );

								switch ( _elem.command ) {	// "move|modify|transform|pen|line|arrow|circle|ellipse|rect|text|cut|clear"
								case "move":
									if ( _prev ) {
										_updateElementAttributes(
											self,
											_elem.element,
											_elem.element.data.ft.attrs ? _elem.element.data.ft.attrs : {},
											_prev.element.data.ft.attrs ? _prev.element.data.ft.attrs : {},
											[ "element", "data", "ft", "attrs" ]
										);
									}
									break;
								case "modify":
									if ( _prev ) {
										_updateElementAttributes(
											self,
											_elem.element,
											_prev.element.attrs,
											_elem.element.attrs,
											[ "element", "attrs" ]
										);
									}
									break;
								case "transform":
									if ( _prev ) {
										_updateElementAttributes(
											self,
											_elem.element,
											{ "transform": _prev.element.transform },
											{ "transform": _elem.element.transform },
											[ "element" ]
										);
									}
									break;
								case "cut":
									// Re-draw the element by inserting it where it was before
									var _nextIndex = _elementIndex( board.elements, _prev.element.id );
									if ( _nextIndex < board.elements.length ) {
										_insertElementBefore( self, _prev, _nextIndex );
									} else {
										_appendElement( self, _prev );
									}
									break;
								default:
									// Just delete the element
									_removeElement( self, _elementIndex( board.elements, _elem.element.id ), _elem );
								}	// switch ( _elem.command )
							}
						})
						.on( "before_redo", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							self._oldElements = JSON.parse( board.toJSON() );
							return true;
						})
						.on( "after_redo", function( board ) {
							if ( board.undoBuffer.length > self._undoBufferCount ) {
								var _elem = board.undoBuffer.pop(),
									_prev = _previousElement( board.undoBuffer, _elem );
								board.undoBuffer.push( _elem );

								switch ( _elem.command ) {	// "move|modify|transform|pen|line|arrow|circle|ellipse|rect|text|cut|clear"
								case "move":
									if ( _prev ) {
										_updateElementAttributes(
											self,
											_elem.element,
											_prev.element.data.ft.attrs ? _prev.element.data.ft.attrs : {},
											_elem.element.data.ft.attrs ? _elem.element.data.ft.attrs : {},
											[ "element", "data", "ft", "attrs" ]
										);
									}
									break;
								case "modify":
									if ( _prev ) {
										// _updateElementAttributes( self, _elem.element, _prev.element.attrs, _elem.element.attrs );
										_updateElementAttributes(
											self,
											_elem.element,
											_prev.element.attrs,
											_elem.element.attrs,
											[ "element", "attrs" ]
										);
									}
									break;
								case "transform":
									if ( _prev ) {
										// _transformElement( self, _elem.element, _prev.element.transform );
										_updateElementAttributes(
											self,
											_elem.element,
											{ "transform": _prev.element.transform },
											{ "transform": _elem.element.transform },
											[ "element" ]
										);
									}
									break;
								case "cut":
									if ( _prev ) {
										_removeElement( self, _elementIndex( self._oldElements, _prev.element.id ), _prev );
									}
									break;
								default:
									// Re-draw the element by inserting it where it was before
									var _nextIndex = _elementIndex( self._oldElements, _prev.element.id );
									if ( _nextIndex < self._oldElements.length ) {
										_insertElementBefore( self, _prev, _nextIndex );
									} else {
										_appendElement( self, _prev );
									}
								}	// switch ( _elem.command )
							}
							self._oldElements = null;
						})
						.on( "before_clear", function( board ) {
							self._undoBufferCount = board.undoBuffer.length;
							return true;
						})
						.on( "after_clear", function( board ) {
							if ( board.undoBuffer.length > self._undoBufferCount ) {

								// NO CLEAR YET!

							}
					});

					self.board.enable();
				}
			},	// enable

			disable: function() {
				if ( this.board ) {
					this.board.disable();
				}
			},	// disable

			set: function ( doc ) {
				// Call Super handler
				this._super( doc );

				this.board.fromJSON( doc );

				return this;
			},	// set

			update: function ( op, node ) {
				var self = this,
					board = this.board;

				if ( node && !( node instanceof Array ) && node.hasOwnProperty( "id" ) ) {
					_nodeId = node.id;
				}

				if ( op instanceof Array ) {
					for ( var i = 0; i < op.length; i++ ) {
						self.update( op[i], node );
					}
					if ( node instanceof Array ) {	// Document root only!
						if ( _attrQueue ) {
							_exeQueuedAttrs( board );
						}
						if ( _ftData ) {
							_exeFreeTransform( board );
						}
					}
					return;
				}

				switch ( op.module_name ) {
				case "objects.js":
					switch ( op.type ) {
					case "prop":
						// creation of a node (element)
						board.fromJSON( op.new_value );
						break;
					case "apply":
						switch ( op.key ) {
						case "element":
							if ( op.op.key === "data" ) {
								if ( !_ftData ) {
									_ftData = {};
								}
								if ( _ftData[_nodeId] == null ) {
									_ftData[_nodeId] = board.freeTransform( _nodeId );
								}
								self.update( op.op, {
									data: {
										ft: {
											attrs: _ftData[_nodeId]
										}
									}
								});
								_queueFreeTransform( board, _nodeId, _ftData[_nodeId] );
							} else {	// NOT updating freeTransform
								self.update( op.op, node );
							}
							break;
						case "data":
						case "ft":
							self.update( op.op, node[op.key] );
							break;
						case "center":
						case "scale":
						case "size":
						case "translate":
							self.update( op.op, node );
							break;
						case "path":
							self.update( op.op, node.path );
							break;
						case "transform":
							var transform = { value: node.matrix.toTransformString() };
							self.update( op.op, transform );
							// Update board's element
							board.transform( node.id, transform.value );
							break;
						case "attrs":
							if ( node.attrs[op.op.key] instanceof Object ) {
								self.update( op.op, node.attrs[op.op.key] );
							} else {
								var attr = {};
								attr[op.op.key] = node.attrs[op.op.key];
								self.update( op.op, attr );
								if ( _ftData ) {	// Updating freeTransform
									node.attrs[op.op.key] = attr[op.op.key];
								} else {
									// Update board's element but queue all
									// modifications in one single action
									_queueAttrs( node.id, attr );
								}
							}
							break;
						default:	// value
							var attr = {
								key		: op.key,
								value	: node[op.key]
							};
							self.update( op.op, attr );
							node[op.key] = attr.value;
							break;
						}
					default:
						// Nothing yet
					}
					break;
				case "sequences.js":
					if ( node instanceof Array ) {
						if ( op.type == "splice" ) {
							// (Firebase doesn't store empty properties, so we have to check if
							// op.old_value and op.new_value are null before getting length. (?))

							// remove
							for ( var i = 0; i < ( op.old_value ? op.old_value.length : 0 ); i++ ) {
								board.cut( board.elements[op.pos].id );
							}

							// insert
							var elements = [];
							for ( var i = 0; i < ( op.new_value ? op.new_value.length : 0 ); i++ ) {
								elements.push( op.new_value[i] );
							}
							board.fromJSON( elements );
							return;
						}

						if ( op.type === "apply" ) {
							if ( op.op.module_name === "values.js" ) {
								var attr = {};
								self.update( op.op, attr );
								node[op.pos] = attr.value;
							} else {
								self.update( op.op, node[op.pos] );
							}
							return;
						}
					}

					switch ( op.type ) {
					case "apply":
						if ( node[op.pos] instanceof Array ) {
							self.update( op.op, node[op.pos] );
						} else {
							var newValue;
							self.update( op.op, newValue );
							node[op.pos] = newValue;
						}
						break;
					case "splice":
						node.value = node.value.splice( op.pos, op.old_value.length, op.new_value );
						break;
					default:
						// Nothing yet
					}
					break;
				case "values.js":
					if ( op.type == "rep" ) {
						node.value = op.new_value;
					}
					break;
				default:
					console.log( "FireCollab Adapter Not Handled: " + op.module_name + "#" + op.type );
					console.log( op );
					console.log( node );
				}

				return;
			},	// update

			clear: function() {
				var self = this;

				if ( self.board ) {
					self.disable();
					self.board.clear();
					self.enable();
				}
			},	// clear

			destroy: function() {
				var self = this;

				self.disable();
				self.board = null;
			}	// destroy
		};

	_raphBoardAdapter.fn = _raphBoardAdapter.prototype = _raphBoardAdapter.subClass( _prototype ).prototype;

	// The FireCollab Adapter object is actually just the init constructor 'enhanced'
	return _raphBoardAdapter.fn.init( containerID, dbName );
}
