/*! ┌───────────────────────────────────────────────────────────────────────────────────────────┐ */
/*! │ <%= meta.title %> v<%= meta.version %> - <%= meta.description %>                                     │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Copyright © <%= meta.copyright %> (<%= meta.homepage %>)               │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Licensed under the MIT (<%= meta.licenses[0]["url"] %>) license.                             │ */
/*! ├───────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Requirements: JSONEditor (https://github.com/josdejong/jsoneditor)                        │ */
/*! │               FireCollab (http://MiroHibler.github.com/FireCollab/)                       │ */
/*! └───────────────────────────────────────────────────────────────────────────────────────────┘ */

function JSONEditorAdapter ( containerID, dbName ) {

	var _version = "0.1.0",

		_obj	= require( "jot/objects.js" ),
		_seqs	= require( "jot/sequences.js" ),
		_values	= require( "jot/values.js" ),

		_getPath = function ( node ) {
			var path = [];
			while ( node.parent ) { // the root node does not have a parent and does not contribute to the path
				if ( node.parent.type === "object" ) {
					path.splice( 0, 0, node.tmp_field_name ? node.tmp_field_name : node.field );
				} else {
					path.splice( 0, 0, node.parent.childs.indexOf(node) );
				}
				node = node.parent;
			}
			return path;
		},	// _getPath

		_hasChildAlready = function ( node, except, field ) {
			for ( var i in node.childs ) {
				if ( node.childs[i] != except && node.childs[i].field == field ) {
					return true;
				}
			}
			return false;
		},	// _hasChildAlready

		_getValue = function ( node, type ) {
			if ( !type ) type = node.type;
			if ( type === "auto" ) {
				// guessing what the editor does
				// TODO: numbers
				if ( node.value === "true" ) return true;
				if ( node.value === "false" ) return false;
				if ( node.value === "null" ) return null;
				return node.value; // string
			} else if ( type === "string" ) {
				return node.value;
			} else if ( type === "array" ) {
				var ret = [];
				for ( var i in node.childs ) {
					ret.push( _getValue( node.childs[i] ) );
				}
				return ret;
			} else if ( type === "object" ) {
				var ret = {};
				for ( var i in node.childs ) {
					ret[ node.childs[i].field ] = _getValue( node.childs[i] );
				}
				return ret;
			}
		},	// _getValue

		_nodeClone = function ( node ) {
			// we don't have access to the Node constructor so we have
			// to go about making new nodes a round-about way.
			var empty_node = node.editor.node.clone();

			empty_node.type		= "auto";
			empty_node.field	= null;
			empty_node.value	= null;
			empty_node.childs	= [];
			empty_node.expanded	= false;
			empty_node.dom		= {};

			return empty_node;
		},	// _nodeClone

		_nodeSetValue = function ( node, val ) {
			// TODO: numbers
			if ( val == null || typeof val == "string" || typeof val == "boolean" || typeof val == "number" ) {
				if ( typeof val == "string" && ( val == "null" || val == "true" || val == "false" ) ) {
					node.changeType( "string" );
				} else {
					node.changeType( "auto" );
				}
				node.updateValue( val );
			} else if ( val instanceof Array || val instanceof Object ) {
				if ( val instanceof Array ) {
					node.changeType( "array" );
				} else if ( val instanceof Object ) {
					node.changeType( "object" );
				}
				node.childs = [];
				for ( var i in val ) {
					var c = _nodeClone( node );

					if ( val instanceof Array )
						c.index = i;
					else
						c.field = i;

					_nodeSetValue( c, val[i] );
					node.appendChild( c );
				}
			}
		},	// _nodeSetValue

		_nodeUpdatePreserveSelection = function ( node, value, pos, shift ) {
			var s = node.editor.getSelection();
			_nodeSetValue( node, value );
			if ( s.range && s.range.container == node.dom.value ) {
				// restore caret location, adjusted for change in text length before caret location
				if ( s.range.startOffset > pos && shift ) s.range.startOffset += shift;
				if ( s.range.endOffset > pos && shift ) s.range.endOffset += shift;
				node.editor.setSelection( s );
			}
		},	// _nodeUpdatePreserveSelection

		_jsonEditorAdapter = new FireCollabAdapter( containerID, dbName ),

		_prototype = {
			get version() {
				return _version;
			},	// get version

			set editor( editor ) {
				this._editor = editor;
			},

			get editor() {
				return this._editor;
			},

			init: function ( containerID, dbName ) {
				// Call Super handler
				this._super( containerID, dbName );

				var self 		= this,
					container	= document.getElementById( containerID ),
					treeEditor	= jsoneditor.JSONEditor.modes[ "tree" ].editor,
					onAction	= treeEditor.prototype._onAction;

				// First change the prototype method...
				treeEditor.prototype._onAction = function ( action, params ) {
					// Call Super handler
					onAction.call( self.editor, action, params );

					try {
						var op;

						switch ( action ) {
						case "editValue":
							var op = _values.REP( params.oldValue, params.newValue );
							if ( typeof params.oldValue === "string" && typeof params.newValue === "string") {
								// if this is a single simple string edit, pass that as the operation
								var op2 = _seqs.from_string_rep( op ); // converts this to an array
								if ( op2.length == 1 ) {
									op = op2[0];
								}
							}
							op = _obj.access( _getPath( params.node ), op );
							break;

						case "changeType":
							op = _obj.access(
								_getPath( params.node ),
								"values.js",
								"REP",
								_getValue( params.node, params.oldType ), // this is a little tricky because the old value
								_getValue( params.node, params.newType ) // isn't stored anywhere, yet information isn't lost
							);
							break;

						case "editField": // i.e. field name
							var oldValue = params.oldValue;
							if ( params.node.tmp_field_name ) {
								oldValue = params.node.tmp_field_name;
								delete params.node.tmp_field_name;
							}

							// the editor allows names to clash...
							var newValue = params.newValue;
							if ( _hasChildAlready( params.node.parent, params.node, newValue ) ) {
								newValue = randomString();
								params.node.tmp_field_name = newValue;
							}

							op = _obj.access(
								_getPath( params.node.parent ),
								"objects.js",
								"REN",
								oldValue,
								newValue
							);
							break;

						case "removeNode":
							if ( params.parent.type === "object" ) {
								op = _obj.access(
									_getPath( params.node.parent ),
									"objects.js",
									"DEL",
									params.node.field,
									_getValue( params.node )
								);
							} else {
								op = _obj.access(
									_getPath( params.parent ),
									"sequences.js",
									"DEL",
									params.index,
									[ _getValue( params.node ) ]
								);
							}
							break;

						case "appendNode":
						case "insertBeforeNode":
							if ( params.parent.type === "object" ) {
								// append/insertBefore/insertAfter all have the same effect on
								// objects because they are unordered in the document model.
								if ( _hasChildAlready( params.node.parent, params.node, params.node.field ) ) {
									// the field name starts off as the empty string, which
									// is a valid key, but check if it's in use before actually
									// sending that key name. if it is in use, send a different
									// key name on the wire.
									params.node.tmp_field_name = makeGUID();
								}
								op = _obj.access(
										_getPath( params.parent ),
										"objects.js",
										"PUT",
										( params.node.tmp_field_name ? params.node.tmp_field_name : params.node.field ),
										_getValue( params.node )
									);
							} else {
								// array
								var index;
								if ( action == "appendNode" )
									index = params.parent.childs.length;
								else if ( action == "insertBeforeNode" )
									index = params.beforeNode.parent.childs.indexOf( params.beforeNode ) - 1; // it's already been inserted

								op = _obj.access(
										_getPath( params.parent ),
										"sequences.js",
										"INS",
										index,
										[ _getValue( params.node ) ]
									);
							}
							break;

						case "duplicateNode":
							if ( params.parent.type === "object" ) {
								// in an object, duplicate works like creating a new key
								// we'd definitely get a name clash if we didn't set our own name
								params.clone.tmp_field_name = makeGUID();
								op = _obj.access(
									_getPath( params.parent ),
									"objects.js",
									"PUT",
									params.clone.tmp_field_name,
									_getValue( params.clone )
								);
							} else { // array
								// in an array, duplicate works like an insert-after
								index = params.parent.childs.indexOf( params.clone ); // it's already been inserted
								op = _obj.access(
									_getPath( params.parent ),
									"sequences.js",
									"INS",
									index,
									[ _getValue( params.clone ) ]
								);
							}
							break;

						// TODO : sort, move not yet handled
						default:
							console.log( action );
							console.log( params );
							console.log( "Operation not implemented." );
							return;
						}

						self.eventLoop.pushLocalChange( op );
					} catch ( e ) {
						console.log( e );
					}
				}	// treeEditor.prototype._onAction
				// ...then create new editor
				self.editor = new jsoneditor.JSONEditor( container );

				return self;
			},	// init

			set: function ( doc ) {
				// Call Super handler
				this._super( doc );

				this.editor.set( doc );

				return this;
			},	// set

			update: function ( op, node ) {
				var self = this;

				if ( op instanceof Array ) {
					for ( var i = 0; i < op.length; i++ ) {
						self.update( op[i], node );
					}
					return;
				}

				switch ( op.module_name ) {
				case "objects.js":
					if ( op.type == "prop" ) {
						if ( op.old_key != null ) {
							// delete or rename a key
							for ( var i in node.childs ) {
								if ( node.childs[i].field == op.old_key ) {
									if ( op.new_key != null ) {
										node.childs[i].updateField( op.new_key );
									} else {
										node.removeChild( node.childs[i] );
									}
									return;
								}
							}
						} else {
							// creation of a key
							var k = _nodeClone( node );
							k.field = op.new_key;
							node.appendChild( k );
							_nodeSetValue( k, op.new_value );
							return;
						}
					}

					if ( op.type == "apply" ) {
						for ( var i in node.childs ) {
							if ( node.childs[i].field == op.key ) {
								self.update( op.op, node.childs[i] );
							}
						}
						return;
					}
					break;
				case "sequences.js":
					if ( node.type == "array" ) {
						if ( op.type == "splice" ) {
							// (Firebase doesn't store empty properties, so we have to check if
							// op.old_value and op.new_value are null before getting length. (?))

							// remove
							for ( var i = 0; i < ( op.old_value ? op.old_value.length : 0 ); i++ ) {
								node.removeChild( node.childs[op.pos] );
							}

							// insert
							for ( var i = 0; i < ( op.new_value ? op.new_value.length : 0 ); i++ ) {
								var elem = _nodeClone( node );
								if ( op.pos+i >= node.childs.length ) {
									node.appendChild( elem );
								} else {
									node.insertBefore( elem, node.childs[ op.pos+i ] );
								}
								_nodeSetValue( elem, op.new_value[i] );
							}
							return;
						}

						if ( op.type == "apply" ) {
							self.update( op.op, node.childs[op.pos] );
							return;
						}
					}

					if ( node.type == "string" || node.type == "auto" ) {
						if ( op.type == "splice" ) {
							var v = node.value.splice( op.pos, op.old_value.length, op.new_value );
							_nodeUpdatePreserveSelection( node, v, op.pos, ( op.new_value.length - op.old_value.length ) );
							return;
						}
					}
					break;
				case "values.js":
					if ( op.type == "rep" ) {
						_nodeUpdatePreserveSelection( node, op.new_value );
						return;
					}
					break;
				default:
					console.log( "FireCollab Adapter Not Handled: " + op.module_name + "#" + op.type );
					console.log( op );
					console.log( node );
				}

				return;
			}	// update
		};

	_jsonEditorAdapter.fn = _jsonEditorAdapter.prototype = _jsonEditorAdapter.subClass( _prototype ).prototype;

	// The FireCollab Adapter object is actually just the init constructor 'enhanced'
	return _jsonEditorAdapter.fn.init( containerID, dbName );
}
