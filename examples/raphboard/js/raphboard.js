/*! ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ */
/*! │ RaphBoard v1.1.0 - Cross-browser drawing board based on Raphaël                             │ */
/*! ├─────────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Copyright © 2012-2013 Miroslav Hibler (http://MiroHibler.github.com/RaphBoard/)             │ */
/*! ├─────────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Licensed under the MIT license (http://opensource.org/licenses/mit-license.php).            │ */
/*! ├─────────────────────────────────────────────────────────────────────────────────────────────┤ */
/*! │ Requirements: jQuery  (http://jquery.com)                                                   │ */
/*! |               Raphaël (http://raphaeljs.com)                                                │ */
/*! │               Raphaël FreeTransform (http://alias.io/raphael/free_transform/)               │ */
/*! └─────────────────────────────────────────────────────────────────────────────────────────────┘ */

// Object Creation Utility
;if ( typeof Object.create !== "function" ) {
	Object.create = function ( obj ) {
		function F() {};
		F.prototype = obj;
		return new F();
	};
}

( function ( $, window, document, undefined ) {

	var _buttonIcon = {
		init: function ( button, path, attr ) {
			var self = this;

			self._button = button;
			self._path = button._toolBar._paper.path( path ).attr( attr );

			return self;
		},

		// Properties
		isGlowing: function () {
			return ( typeof this._path._glow === "object" );
		},

		isVisible: function () {
			return this._path.node.style.display !== "none";
		},

		// Methods
		glow: function ( state ) {
			var self = this;

			if ( state ) {
				self._path._glow = self._path.glow();
			} else {
				if ( self.isGlowing() ) {
					self._path._glow.remove();
				}
			}

			return self;
		},

		show: function () {
			var self = this;

			self._path.show();

			return self;
		},

		hide: function () {
			var self = this;

			self._path.hide();

			return self;
		}
	};

	function ButtonIcon ( button, path, attr ) {
		return Object.create( _buttonIcon ).init( button, path, attr );
	}

	var _button = {
		init: function ( toolBar, name, attr ) {
			var self = this;

			self._toolBar = toolBar;
			self._name = name;
			self._icons = [];
			self._isEnabled = true;
			self._isSelected = false;

			var _p = toolBar._paper;
			self._set = _p.set();
			self._paths = _p.set();
			self._set.push( self._paths );
			self._rect = _p.rect( 0, 0, 0, 0 ).attr( attr );
			self._set.push( self._rect );

			return self;
		},

		// Properties
		isEnabled: function () {
			return this._isEnabled;
		},

		isVisible: function () {
			return this._isVisible;
		},

		isSelected: function () {
			return this._isSelected;
		},

		name: function ( newName ) {
			var self = this;

			if ( newName !== undefined ) {
				self._name = newName;
			}

			return self._name;
		},

		attr: function ( newAttr ) {
			var self = this;

			if ( typeof newAttr === "Object" ) {
				self._rect.attr( $.extend( {}, self._rect.attr(), newAttr ) );
			}

			return self._rect.attr();
		},

		activeIcon: function () {
			var self = this;
			var _activeIcon;

			for ( ndx in self._icons ) {
				if ( self._icons[ndx].isVisible() ) {
					_activeIcon = self._icons[ndx];
					break;
				}
			};

			return _activeIcon;
		},

		hover: function ( mouseIn, mouseOut ) {
			var self = this;

			self._mouseIn = mouseIn;
			self._mouseOut = mouseOut;
			self._rect.hover( function () {
				if ( self._isEnabled ) self._mouseIn();
			}, function () {
				if ( self._isEnabled ) self._mouseOut();
			});

			return self;
		},

		mouseDown: function ( mouseDown ) {
			var self = this;

			self._mouseDown = mouseDown;
			self._rect.mousedown( function () {
				if ( self._isEnabled ) self._mouseDown();
			});

			return self;
		},

		mouseUp: function ( mouseUp ) {
			var self = this;

			self._mouseUp = mouseUp;
			self._rect.mouseup( function () {
				if ( self._isEnabled ) self._mouseUp();
			} );

			return self;
		},

		// Methods
		addIcon: function ( icon ) {
			var self = this;

			self._icons.push( icon );
			self._paths.push( icon._path );
			self.showIcon( self._icons.length - 1 );
			self._rect.toFront();

			return self;
		},

		insertIcon: function ( index, icon ) {
			var self = this;

			self._icons.splice( index, 1, icon );

			return self;
		},

		removeIcon: function ( index ) {
			var self = this;

			self._icons[index]._path.remove();
			self._icons.splice( index, 1 );

			return self;
		},

		showIcon: function ( index ) {
			var self = this;

			for ( ndx in self._icons ) {
				self._icons[ndx].hide();
			};
			self._icons[index].show();

			return self;
		},

		highlight: function ( state, glow  ) {
			var self = this;

			if ( state ) {
				self.activeIcon().glow( glow );
				self.activeIcon()._path.attr( { fill: "90-#6B9DF4-#4575ED", stroke: "none" } );
			} else {
				self.activeIcon().glow( false );
				self.activeIcon()._path.attr( { fill: "90-#888-#CCC", stroke: "none" } );
			}

			return self;
		},

		enable: function () {
			var self = this;

			self._isEnabled = true;

			return self;
		},

		disable: function () {
			var self = this;

			self._isEnabled = false;

			return self;
		},

		select: function () {
			var self = this;

			self._isSelected = true;
			self.highlight( true, true );

			return self;
		},

		deselect: function () {
			var self = this;

			self._isSelected = false;
			self.highlight( false, false );

			return self;
		}
	};

	function Button ( toolBar, name, attr ) {
		return Object.create( _button ).init( toolBar, name, attr );
	}

	var _toolBar = {
		init: function ( RB, id ) {
			var self = this;

			self._board = RB;
			self._isEnabled = true;
			self._height = 40;
			self._container = $( "#" + id );
			self._buttons = [];

			self._container.css( {
				position	: "relative",
				width		: self._board.width() + "px",
				height		: self._height + "px"
			} );

			self._paper = Raphael( id, self._board.width(), self._height );
			// Fix for half-pixel position ( "left: -0.5px" )
			var containerSVG = self._container.children( ":first" );
			if ( containerSVG.css( "position" ) == "relative" ) {
				containerSVG.css( "left", "" );
				containerSVG.css( "top", "" );
			}

			self._background = self._paper.rect( 0, 0, self._board.width(), self._height ).attr( { fill: "90-#555-#000", stroke: "none" } );

			// Default ToolBar Tools
			var Tools = {
				move		: { title: "Move", path: "M14.296,27.885v-2.013c0,0-0.402-1.408-1.073-2.013c-0.671-0.604-1.274-1.274-1.409-1.61c0,0-0.268,0.135-0.737-0.335s-1.812-2.616-1.812-2.616l-0.671-0.872c0,0-0.47-0.671-1.275-1.342c-0.805-0.672-0.938-0.067-1.476-0.738s0.604-1.275,1.006-1.409c0.403-0.134,1.946,0.134,2.684,0.872c0.738,0.738,0.738,0.738,0.738,0.738l1.073,1.141l0.537,0.201l0.671-1.073l-0.269-2.281c0,0-0.604-2.55-0.737-4.764c-0.135-2.214-0.47-5.703,1.006-5.837s1.007,2.55,1.073,3.489c0.067,0.938,0.806,5.232,1.208,5.568c0.402,0.335,0.671,0.066,0.671,0.066l0.402-7.514c0,0-0.479-2.438,1.073-2.549c0.939-0.067,0.872,1.543,0.872,2.147c0,0.604,0.269,7.514,0.269,7.514l0.537,0.135c0,0,0.402-2.214,0.604-3.153s0.604-2.416,0.537-3.087c-0.067-0.671-0.135-2.348,1.006-2.348s0.872,1.812,0.939,2.415s-0.134,3.153-0.134,3.757c0,0.604-0.738,3.623-0.537,3.824s2.08-2.817,2.349-3.958c0.268-1.141,0.201-3.02,1.408-2.885c1.208,0.134,0.47,2.817,0.402,3.086c-0.066,0.269-0.671,2.349-0.872,2.952s-0.805,1.476-1.006,2.013s0.402,2.349,0,4.629c-0.402,2.281-1.61,5.166-1.61,5.166l0.604,2.08c0,0-1.744,0.671-3.824,0.805C16.443,28.221,14.296,27.885,14.296,27.885z", scale: "0.8" },
				pen			: { title: "Pen", path: "M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z", scale: "0.7" },
				line		: { title: "Line", path: "M6.63,21.796l-5.122,5.121h25.743V1.175L6.63,21.796zM18.702,10.48c0.186-0.183,0.48-0.183,0.664,0l1.16,1.159c0.184,0.183,0.186,0.48,0.002,0.663c-0.092,0.091-0.213,0.137-0.332,0.137c-0.121,0-0.24-0.046-0.33-0.137l-1.164-1.159C18.519,10.96,18.519,10.664,18.702,10.48zM17.101,12.084c0.184-0.183,0.48-0.183,0.662,0l2.156,2.154c0.184,0.183,0.184,0.48,0.002,0.661c-0.092,0.092-0.213,0.139-0.334,0.139s-0.24-0.046-0.33-0.137l-2.156-2.154C16.917,12.564,16.917,12.267,17.101,12.084zM15.497,13.685c0.184-0.183,0.48-0.183,0.664,0l1.16,1.161c0.184,0.183,0.182,0.48-0.002,0.663c-0.092,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.24-0.046-0.332-0.138l-1.16-1.16C15.314,14.166,15.314,13.868,15.497,13.685zM13.896,15.288c0.184-0.183,0.48-0.181,0.664,0.002l1.158,1.159c0.183,0.184,0.183,0.48,0,0.663c-0.092,0.092-0.212,0.138-0.332,0.138c-0.119,0-0.24-0.046-0.332-0.138l-1.158-1.161C13.713,15.767,13.713,15.471,13.896,15.288zM12.293,16.892c0.183-0.184,0.479-0.184,0.663,0l2.154,2.153c0.184,0.184,0.184,0.481,0,0.665c-0.092,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.242-0.046-0.334-0.138l-2.153-2.155C12.11,17.371,12.11,17.075,12.293,16.892zM10.302,24.515c-0.091,0.093-0.212,0.139-0.332,0.139c-0.119,0-0.238-0.045-0.33-0.137l-2.154-2.153c-0.184-0.183-0.184-0.479,0-0.663s0.479-0.184,0.662,0l2.154,2.153C10.485,24.036,10.485,24.332,10.302,24.515zM10.912,21.918c-0.093,0.093-0.214,0.139-0.333,0.139c-0.12,0-0.24-0.045-0.33-0.137l-1.162-1.161c-0.184-0.183-0.184-0.479,0-0.66c0.184-0.185,0.48-0.187,0.664-0.003l1.161,1.162C11.095,21.438,11.095,21.735,10.912,21.918zM12.513,20.316c-0.092,0.092-0.211,0.138-0.332,0.138c-0.119,0-0.239-0.046-0.331-0.138l-1.159-1.16c-0.184-0.184-0.184-0.48,0-0.664s0.48-0.182,0.663,0.002l1.159,1.161C12.696,19.838,12.696,20.135,12.513,20.316zM22.25,21.917h-8.67l8.67-8.67V21.917zM22.13,10.7c-0.09,0.092-0.211,0.138-0.33,0.138c-0.121,0-0.242-0.046-0.334-0.138l-1.16-1.159c-0.184-0.183-0.184-0.479,0-0.663c0.182-0.183,0.479-0.183,0.662,0l1.16,1.159C22.312,10.221,22.313,10.517,22.13,10.7zM24.726,10.092c-0.092,0.092-0.213,0.137-0.332,0.137s-0.24-0.045-0.33-0.137l-2.154-2.154c-0.184-0.183-0.184-0.481,0-0.664s0.482-0.181,0.664,0.002l2.154,2.154C24.911,9.613,24.909,9.91,24.726,10.092z", scale: "0.7" },
				arrow		: { title: "Arrow", path: "M21.786,12.876l7.556-4.363l-7.556-4.363v2.598H2.813v3.5h18.973V12.876zM10.368,18.124l-7.556,4.362l7.556,4.362V24.25h18.974v-3.501H10.368V18.124z", scale: "0.7" },
				circle		: { title: "Circle", path: "M16,1.466C7.973,1.466,1.466,7.973,1.466,16 c0,8.027,6.507,14.534,14.534,14.534 c8.027,0,14.534-6.507,14.534-14.534 C30.534,7.973,24.027,1.466,16,1.466z", scale: "0.7" },
				rect		: { title: "Rectangle", path: "M5.5,5.5h20v20h-20z", scale: "" },
				text		: { title: "Text", path: "M22.255,19.327l-1.017,0.131c-0.609,0.081-1.067,0.208-1.375,0.382c-0.521,0.293-0.779,0.76-0.779,1.398c0,0.484,0.178,0.867,0.532,1.146c0.354,0.28,0.774,0.421,1.262,0.421c0.593,0,1.164-0.138,1.72-0.412c0.938-0.453,1.4-1.188,1.4-2.229v-1.354c-0.205,0.131-0.469,0.229-0.792,0.328C22.883,19.229,22.564,19.29,22.255,19.327zM8.036,18.273h4.309l-2.113-6.063L8.036,18.273zM28.167,7.75H3.168c-0.552,0-1,0.448-1,1v16.583c0,0.553,0.448,1,1,1h24.999c0.554,0,1-0.447,1-1V8.75C29.167,8.198,28.721,7.75,28.167,7.75zM14.305,23.896l-1.433-4.109H7.488L6,23.896H4.094L9.262,10.17h2.099l4.981,13.727H14.305L14.305,23.896zM26.792,23.943c-0.263,0.074-0.461,0.121-0.599,0.141c-0.137,0.02-0.323,0.027-0.562,0.027c-0.579,0-0.999-0.204-1.261-0.615c-0.138-0.219-0.231-0.525-0.29-0.926c-0.344,0.449-0.834,0.839-1.477,1.169c-0.646,0.329-1.354,0.493-2.121,0.493c-0.928,0-1.688-0.28-2.273-0.844c-0.589-0.562-0.884-1.271-0.884-2.113c0-0.928,0.29-1.646,0.868-2.155c0.578-0.511,1.34-0.824,2.279-0.942l2.682-0.336c0.388-0.05,0.646-0.211,0.775-0.484c0.063-0.146,0.104-0.354,0.104-0.646c0-0.575-0.203-0.993-0.604-1.252c-0.408-0.26-0.99-0.389-1.748-0.389c-0.877,0-1.5,0.238-1.865,0.713c-0.205,0.263-0.34,0.654-0.399,1.174H17.85c0.031-1.237,0.438-2.097,1.199-2.582c0.77-0.484,1.659-0.726,2.674-0.726c1.176,0,2.131,0.225,2.864,0.673c0.729,0.448,1.093,1.146,1.093,2.093v5.766c0,0.176,0.035,0.313,0.106,0.422c0.071,0.104,0.223,0.156,0.452,0.156c0.076,0,0.16-0.005,0.254-0.015c0.093-0.011,0.191-0.021,0.299-0.041L26.792,23.943L26.792,23.943z", scale: "" },
				cut			: { title: "Cut", path: "M11.108,10.271c1.083-1.876,0.159-4.443-2.059-5.725C8.231,4.074,7.326,3.825,6.433,3.825c-1.461,0-2.721,0.673-3.373,1.801C2.515,6.57,2.452,7.703,2.884,8.814C3.287,9.85,4.081,10.751,5.12,11.35c0.817,0.473,1.722,0.723,2.616,0.723c0.673,0,1.301-0.149,1.849-0.414c0.669,0.387,1.566,0.904,2.4,1.386c1.583,0.914,0.561,3.861,5.919,6.955c5.357,3.094,11.496,1.535,11.496,1.535L10.75,10.767C10.882,10.611,11.005,10.449,11.108,10.271zM9.375,9.271c-0.506,0.878-2.033,1.055-3.255,0.347C5.474,9.245,4.986,8.702,4.749,8.09C4.541,7.555,4.556,7.035,4.792,6.626c0.293-0.509,0.892-0.801,1.64-0.801c0.543,0,1.102,0.157,1.616,0.454C9.291,6.996,9.898,8.366,9.375,9.271zM17.246,15.792c0,0.483-0.392,0.875-0.875,0.875c-0.037,0-0.068-0.017-0.104-0.021l0.667-1.511C17.121,15.296,17.246,15.526,17.246,15.792zM16.371,14.917c0.037,0,0.068,0.017,0.104,0.021l-0.666,1.51c-0.188-0.16-0.312-0.39-0.312-0.656C15.496,15.309,15.887,14.917,16.371,14.917zM29.4,10.467c0,0-6.139-1.559-11.496,1.535c-0.537,0.311-0.995,0.618-1.415,0.924l4.326,2.497L29.4,10.467zM13.171,17.097c-0.352,0.851-0.575,1.508-1.187,1.859c-0.833,0.481-1.73,0.999-2.399,1.386c-0.549-0.265-1.176-0.414-1.85-0.414c-0.894,0-1.798,0.249-2.616,0.721c-2.218,1.282-3.143,3.851-2.06,5.726c0.651,1.127,1.912,1.801,3.373,1.801c0.894,0,1.799-0.25,2.616-0.722c1.04-0.601,1.833-1.501,2.236-2.536c0.432-1.112,0.368-2.245-0.178-3.189c-0.103-0.178-0.226-0.34-0.356-0.494l3.982-2.3C14.044,18.295,13.546,17.676,13.171,17.097zM9.42,24.192c-0.238,0.612-0.725,1.155-1.371,1.528c-1.221,0.706-2.75,0.532-3.257-0.347C4.27,24.47,4.878,23.099,6.12,22.381c0.514-0.297,1.072-0.453,1.615-0.453c0.749,0,1.346,0.291,1.64,0.8C9.612,23.138,9.628,23.657,9.42,24.192z", scale: "0.7" },
				// Actions
				undo		: { title: "Undo", path: "M12.981,9.073V6.817l-12.106,6.99l12.106,6.99v-2.422c3.285-0.002,9.052,0.28,9.052,2.269c0,2.78-6.023,4.263-6.023,4.263v2.132c0,0,13.53,0.463,13.53-9.823C29.54,9.134,17.952,8.831,12.981,9.073z", scale: "0.7" },
				redo		: { title: "Redo", path: "M12.981,9.073V6.817l-12.106,6.99l12.106,6.99v-2.422c3.285-0.002,9.052,0.28,9.052,2.269c0,2.78-6.023,4.263-6.023,4.263v2.132c0,0,13.53,0.463,13.53-9.823C29.54,9.134,17.952,8.831,12.981,9.073z", scale: "0.7...s-1,1" },
				clear		: { title: "Clear", path: "M20.826,5.75l0.396,1.188c1.54,0.575,2.589,1.44,2.589,2.626c0,2.405-4.308,3.498-8.312,3.498c-4.003,0-8.311-1.093-8.311-3.498c0-1.272,1.21-2.174,2.938-2.746l0.388-1.165c-2.443,0.648-4.327,1.876-4.327,3.91v2.264c0,1.224,0.685,2.155,1.759,2.845l0.396,9.265c0,1.381,3.274,2.5,7.312,2.5c4.038,0,7.313-1.119,7.313-2.5l0.405-9.493c0.885-0.664,1.438-1.521,1.438-2.617V9.562C24.812,7.625,23.101,6.42,20.826,5.75zM11.093,24.127c-0.476-0.286-1.022-0.846-1.166-1.237c-1.007-2.76-0.73-4.921-0.529-7.509c0.747,0.28,1.58,0.491,2.45,0.642c-0.216,2.658-0.43,4.923,0.003,7.828C11.916,24.278,11.567,24.411,11.093,24.127zM17.219,24.329c-0.019,0.445-0.691,0.856-1.517,0.856c-0.828,0-1.498-0.413-1.517-0.858c-0.126-2.996-0.032-5.322,0.068-8.039c0.418,0.022,0.835,0.037,1.246,0.037c0.543,0,1.097-0.02,1.651-0.059C17.251,18.994,17.346,21.325,17.219,24.329zM21.476,22.892c-0.143,0.392-0.69,0.95-1.165,1.235c-0.474,0.284-0.817,0.151-0.754-0.276c0.437-2.93,0.214-5.209-0.005-7.897c0.881-0.174,1.708-0.417,2.44-0.731C22.194,17.883,22.503,20.076,21.476,22.892zM11.338,9.512c0.525,0.173,1.092-0.109,1.268-0.633h-0.002l0.771-2.316h4.56l0.771,2.316c0.14,0.419,0.53,0.685,0.949,0.685c0.104,0,0.211-0.017,0.316-0.052c0.524-0.175,0.808-0.742,0.633-1.265l-1.002-3.001c-0.136-0.407-0.518-0.683-0.945-0.683h-6.002c-0.428,0-0.812,0.275-0.948,0.683l-1,2.999C10.532,8.77,10.815,9.337,11.338,9.512z", scale: "0.8" },
				palette		: { title: "Attributes", path: "M15.653,7.25c-3.417,0-8.577,0.983-8.577,3.282c0,1.91,2.704,3.229,1.691,3.889c-1.02,0.666-2.684-1.848-4.048-1.848c-1.653,0-2.815,1.434-2.815,2.926c0,4.558,6.326,8.25,13.749,8.25c7.424,0,13.443-3.692,13.443-8.25C29.096,10.944,23.077,7.25,15.653,7.25zM10.308,13.521c0-0.645,0.887-1.166,1.98-1.166c1.093,0,1.979,0.521,1.979,1.166c0,0.644-0.886,1.166-1.979,1.166C11.195,14.687,10.308,14.164,10.308,13.521zM14.289,22.299c-1.058,0-1.914-0.68-1.914-1.518s0.856-1.518,1.914-1.518c1.057,0,1.914,0.68,1.914,1.518S15.346,22.299,14.289,22.299zM19.611,21.771c-1.057,0-1.913-0.681-1.913-1.519c0-0.84,0.856-1.521,1.913-1.521c1.059,0,1.914,0.681,1.914,1.521C21.525,21.092,20.67,21.771,19.611,21.771zM20.075,10.66c0-0.838,0.856-1.518,1.914-1.518s1.913,0.68,1.913,1.518c0,0.839-0.855,1.518-1.913,1.518C20.934,12.178,20.075,11.499,20.075,10.66zM24.275,19.482c-1.057,0-1.914-0.681-1.914-1.519s0.857-1.518,1.914-1.518c1.059,0,1.914,0.68,1.914,1.518S25.334,19.482,24.275,19.482zM25.286,15.475c-1.058,0-1.914-0.68-1.914-1.519c0-0.838,0.856-1.518,1.914-1.518c1.057,0,1.913,0.68,1.913,1.518C27.199,14.795,26.343,15.475,25.286,15.475z", scale: "" },
				// Status
				// locked	: { title: "Unlock", path: "M24.875,15.334v-4.876c0-4.894-3.981-8.875-8.875-8.875s-8.875,3.981-8.875,8.875v4.876H5.042v15.083h21.916V15.334H24.875zM10.625,10.458c0-2.964,2.411-5.375,5.375-5.375s5.375,2.411,5.375,5.375v4.876h-10.75V10.458zM18.272,26.956h-4.545l1.222-3.667c-0.782-0.389-1.324-1.188-1.324-2.119c0-1.312,1.063-2.375,2.375-2.375s2.375,1.062,2.375,2.375c0,0.932-0.542,1.73-1.324,2.119L18.272,26.956z", scale: "0.7" },
				// unlocked	: { title: "Lock", path: "M24.875,15.334v-4.876c0-4.894-3.981-8.875-8.875-8.875s-8.875,3.981-8.875,8.875v0.375h3.5v-0.375c0-2.964,2.411-5.375,5.375-5.375s5.375,2.411,5.375,5.375v4.876H5.042v15.083h21.916V15.334H24.875zM18.272,26.956h-4.545l1.222-3.667c-0.782-0.389-1.324-1.188-1.324-2.119c0-1.312,1.063-2.375,2.375-2.375s2.375,1.062,2.375,2.375c0,0.932-0.542,1.73-1.324,2.119L18.272,26.956z", scale: "0.7" }
			}

			var x = 4;	// Space between buttons
			for ( var name in Tools ) {
				var button = Button( self, name, {
					x		: x - 4,
					y		: 0,
					width	: self._height,
					height	: self._height,
					title	: Tools[name].title,
					fill	: "rgba(0,0,0,0)",
					stroke	: "none"
				} );
				button.addIcon( ButtonIcon( button, Tools[name].path, {
					fill		: "90-#888-#CCC",
					stroke		: "none",
					transform	: "t" + x + ",4" + ( Tools[name].scale != "" ? "s" + Tools[name].scale : "" )
				} ) );
				button.hover(
					function () {		// mouseIn
						if ( self._board.options.editable && !this.isSelected() ) {
							if ( this.name() != "undo" && this.name() != "redo" ) {
								this.highlight( true, false );
							}
						}
					}, function () {	// mouseOut
						if ( self._board.options.editable && !this.isSelected() ) {
							if ( this.name() != "undo" && this.name() != "redo" ) {
								this.highlight( false, false );
							}
						}
					}
				);
				button.mouseDown(
					function () {
						if ( self._board.options.editable ) {
							if ( !this.isSelected() ) {
								switch( this.name() ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
									case "undo":
									case "redo":
										break;
									case "clear":
										this.select();
										break;
									case "palette":
										self._board.canvas._container.unbind( "mouseenter" );
										this.select();
										break;
									default:
										self.deselectAll();
										// this.select( true );
										if ( self._board.mode() != this.name() ) self._board.mode( this.name() );
								}
							}
						}
					}
				);
				button.mouseUp(
					function () {		// mouse_up
						if ( self._board.options.editable ) {
							switch( this.name() ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
								case "undo":
									self._board.undo();
									break;
								case "redo":
									self._board.redo();
									break;
								case "clear":
									this.deselect();
									this.highlight( true, false );
									self._board.clear();
									break;
								case "palette":
									self._board.attributesPanel.show();
									this.deselect();
									this.highlight( true, true );
									break;
								default: //	no default
							}
						}
					}
				);
				self.addButton( button );
				x += self._height;
			}

			return self;
		},

		// Properties
		height: function () {
			return this._height;
		},

		background: function () {
			return this._background;
		},

		buttons: function () {
			return this._buttons;
		},

		// Methods
		enable: function () {
			var self = this;

			self._isEnabled = true;
			_ToggleButtons( true );

			var _activeButton = self.button( self._board.mode() );
			if ( _activeButton.name() != "undo" && _activeButton.name() != "redo" ) {
				_activeButton.select();
			}

			return self;
		},

		disable: function () {
			var self = this;

			self._isEnabled = false;
			_ToggleButtons( false );

			self.deselectAll();

			return self;
		},

		addButton: function ( button ) {
			var self = this;

			self._buttons.push( button );

			return self;
		},

		insertButton: function ( button, index ) {
			var self = this;

			self._buttons.splice( index, 1, button );

			return self;
		},

		removeButton: function ( button ) {
			var self = this;

			self._buttons.splice( $.inArray( button, self._buttons ), 1 );
			button.set.clear();

			return self;
		},

		button: function ( name ) {
			var self = this;

			for ( idx in self._buttons ) {
				if ( self._buttons[idx].name() == name ) {
					return self._buttons[idx];
				}
			}
		},

		deselectAll: function () {
			var self = this;
			var buttons = self._buttons;

			for ( idx in buttons ) {
				if ( buttons[idx].name() != "undo" && buttons[idx].name() != "redo" ) {
					buttons[idx].deselect();
				}
			}

			return self;
		},

		toggleUndoRedo: function () {
			var self = this;

			var undoButton = self.button( "undo" );
			var redoButton = self.button( "redo" );

			if ( self._board.canUndo() ) {
				undoButton.activeIcon()._path.attr( { fill: "90-#BBF1B2-#5D9E54", stroke: "none" } );
				undoButton.enable();
			} else {
				undoButton.activeIcon()._path.attr( { fill: "90-#888-#CCC", stroke: "none" } );
				undoButton.disable();
			}

			if ( self._board.canRedo() ) {
				redoButton.activeIcon()._path.attr( { fill: "90-#BBF1B2-#5D9E54", stroke: "none" } );
				redoButton.enable();
			} else {
				redoButton.activeIcon()._path.attr( { fill: "90-#888-#CCC", stroke: "none" } );
				redoButton.disable();
			}

			return self;
		}
	};

	function ToolBar ( board, id ) {
		return Object.create( _toolBar ).init( board, id );
	}

	function _ToggleButtons ( toggle ) {
		var self = this;

		for ( idx in self._buttons ) {
			if ( toggle ) {
				self._buttons[idx].enable();
			} else {
				self._buttons[idx].disable();
			}
		}
	}

	var _canvas = {
		init: function ( RB, id ) {
			var self = this;

			self._board = RB;
			self._container = $( "#" + id )

			self._container.css( {
				position	: "absolute",
				width		: self._board.width() + "px",
				height		: ( self._board.height() - ( self._board.options.showToolBar ? self._board.toolBar.height() : 0 ) ) + "px"
			});

			self._paper = Raphael( id, self._board.width(), self._board.height() - ( self._board.options.showToolBar ? self._board.toolBar.height() : 0 ) );
			// Fix for half-pixel position ( "left: -0.5px" )
			var containerSVG = self._container.children( ":first" );
			if ( containerSVG.css( "position" ) == "relative" ) {
				containerSVG.css( "left", "" );
				containerSVG.css( "top", "" );
			}

			return self;
		},

 		// Properties
		paper: function () {
			return this._paper;
		}
	};

	function Canvas ( board, id ) {
		return Object.create( _canvas ).init( board, id );
	}

	var _attributesPanel = {
		init: function ( RB, id ) {
			var self = this;

			self._board = RB;
			self._container = $( "#" + id );

			self._container.css( {
				position	: "absolute",
				"z-index"	: "9999",
				display		: "none"
			} );


			self._paper = Raphael( id, self._board.width(), self._board.height() );
			// Fix for half-pixel position ( "left: -0.5px" )
			var containerSVG = self._container.children( ":first" );
			if ( containerSVG.css( "position" ) == "relative" ) {
				containerSVG.css( "left", "" );
				containerSVG.css( "top", "" );
			}

			return self;
 		},

 		// Properties
 		paper: function () {
 			return this._paper;
 		},

 		// Methods
		show: function () {
			var self = this;

			var colors = [ "#000", "#FFF", "#F00", "#0F0", "#00F", "#FF0" ];

			var x = 0;
			var y = 0;
			var w = self._board.width();
			var h = self._board.height();

			self._container.css( {
				top			: "0px",
				width		: w + "px",
				height		: h + "px",
			} );

			self._panel = self._paper.set();
			self._panel.push( self._paper.rect( 0, 0, w, h ).attr( {
				fill	: "rgba(0,0,0,0.25)",
				stroke	: "none",
				cursor	: "auto"
			} ) );
			self._panel.push( self._paper.rect( ( w/2 ) - 110, ( h/2 ) - 110, 220, 220, 16 ).attr( {
				fill	: "rgba(0,0,0,0.5)",
				stroke	: "none"
			} ) );
			var picker = self._paper.circle( w/2, h/2, 90 ).attr( {
				"fill"			: self._board.options.fill,
				"stroke"		: self._board.options.stroke,
				"stroke-width"	: self._board.options.strokeWidth,
				"cursor"		: "pointer"
			} );
			self._panel.push( picker );

			// Fill Color Picker
			var fillPicker = self._paper.set();
			var i = 0;
			var angle = 0;

			while ( angle < 360 ) {
				var color = colors[ i ];
				( function ( t, c ) {
					fillPicker.push( self._paper.circle( w/2, ( h/2 ) + 40, 16 )
							.attr( {
								stroke		: c,
								fill		: c,
								transform	: t,
								cursor		: "pointer"
							})
							.click( function () {
								picker.attr( { fill: this.attr( "fill" ) } );
							})
					);
				} ) ( "r" + angle + " " + ( w/2 ) + " " + ( h/2 ), color );
				i++;
				angle += 60;
			}

			var s = self._paper.set();
			var fill_back = self._paper.circle( w/2, ( h/2 ), 16 ).attr( {
				fill	: "rgba(0,0,0,0)",
				stroke	: "none"
			} );
			s.push( fill_back );
			s.push( self._paper.path( "M11.478,17.568c-0.172-0.494-0.285-1.017-0.285-1.568c0-2.65,2.158-4.807,4.807-4.807c0.552,0,1.074,0.113,1.568,0.285l2.283-2.283C18.541,8.647,17.227,8.286,16,8.286C8.454,8.286,2.5,16,2.5,16s2.167,2.791,5.53,5.017L11.478,17.568zM23.518,11.185l-3.056,3.056c0.217,0.546,0.345,1.138,0.345,1.76c0,2.648-2.158,4.807-4.807,4.807c-0.622,0-1.213-0.128-1.76-0.345l-2.469,2.47c1.327,0.479,2.745,0.783,4.229,0.783c5.771,0,13.5-7.715,13.5-7.715S26.859,13.374,23.518,11.185zM25.542,4.917L4.855,25.604L6.27,27.02L26.956,6.332L25.542,4.917z" )
				.attr( {
					fill		: "#FFF",
					stroke		: "#000",
					transform	: "t" + ( ( w/2 ) - 16 ) + "," + ( ( h/2 ) - 16 )
				})
			);
			s.attr( { cursor: "pointer" } )
				.hover(
					function () {	// mouse_in
						fill_back.attr( { fill: "rgba(255,255,255,0.5)" } )
					},
					function () {	// mouse_out
						fill_back.attr( { fill: "rgba(0,0,0,0)" } )
					}
				)
				.click( function () {
					picker.attr( { fill: "none" } );
					if ( picker.attr( "stroke-width" ) == 0) picker.attr( { "stroke-width": 1 } );
				} );
			fillPicker.push( s );

			// Stroke Color Picker
			var i = 0;
			var angle = 105;

			while ( angle < 270 ) {
				var color = colors[ i ];
				( function ( t, c ) {
					self._panel.push( self._paper.circle( ( w/2 ), ( h/2 ) + 90, 16 )
							.attr( {
								stroke		: c,
								fill		: c,
								transform	: t,
								cursor		: "pointer"
							})
							.click( function () {
								picker.attr( { stroke: this.attr( "fill" ) } );
							}
						)
					);
				} ) ( "r" + angle + " " + ( w/2 ) + " " + ( h/2 ), color );
				i++;
				angle += 30;
			}

			// Stroke Width Picker
			var angle = 300;
			var width = 12;

			while ( angle <= 420 ) {
				var color = "#000";
				( function ( t, c, sw ) {
					var s = self._paper.set();
					var bg = self._paper.circle( ( w/2 ), ( h/2 ) + 90, 16 ).attr( {
						stroke	: "none",
						fill	: "#C0C0C0"
					} );
					s.push( bg );
					if ( sw > 0 ) {
						s.push( self._paper.circle( ( w/2 ), ( h/2 ) + 90, ( sw/2 ) ).attr( {
							stroke	: "none",
							fill	: c
						} ) );
					}
					s.attr( {
						stroke			: "rgba(0,0,0,0)",
						"stroke-width"	: sw == 0 ? 0 : ( sw/2 ),
						transform		: t,
						cursor			: "pointer"
					} );
					if ( sw == 0 ) {
						var bgBox = bg.getBBox( false );
						s.push( self._paper.path( "M11.478,17.568c-0.172-0.494-0.285-1.017-0.285-1.568c0-2.65,2.158-4.807,4.807-4.807c0.552,0,1.074,0.113,1.568,0.285l2.283-2.283C18.541,8.647,17.227,8.286,16,8.286C8.454,8.286,2.5,16,2.5,16s2.167,2.791,5.53,5.017L11.478,17.568zM23.518,11.185l-3.056,3.056c0.217,0.546,0.345,1.138,0.345,1.76c0,2.648-2.158,4.807-4.807,4.807c-0.622,0-1.213-0.128-1.76-0.345l-2.469,2.47c1.327,0.479,2.745,0.783,4.229,0.783c5.771,0,13.5-7.715,13.5-7.715S26.859,13.374,23.518,11.185zM25.542,4.917L4.855,25.604L6.27,27.02L26.956,6.332L25.542,4.917z" )
							.attr( {
								fill			: "#000",
								stroke			: "rgba(0,0,0,0)",
								"stroke-width"	: sw == 0 ? 0 : ( sw/2 ),
								transform		: "t" + bgBox.x + "," + bgBox.y
							})
						);
					}
					s.click( function () {
							sw = this.attr( "stroke-width" );
							if ( sw == 0 ) {
								if ( picker.attr( "fill" ) == "none" ) picker.attr( { fill: self._board.options.fill } );
							} else {
								sw = sw == 1 ? 1 : sw*2;
							}
							picker.attr( { "stroke-width": sw } );
						} );
					self._panel.push( s );
				} ) ( "r" + angle + " " + ( w/2 ) + " " + ( h/2 ), color, width );
				angle += 30;
				width -= 4;
				if ( width < 0 ) {
					width = 0;
				} else if ( width == 0 ) {
					width = 2;
				}
			}

			// Cancel Button
			var cancel_back = self._paper.circle( ( w/2 ) - 90, ( h/2 ) + 90, 16 ).attr( {
				fill	: "rgba(0,0,0,0)",
				stroke	: "none"
			} );
			var s = self._paper.set();
			s.push( cancel_back );
			s.push( self._paper.path( "M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z" )
				.attr( {
					fill		: "#F00",
					stroke		: "none",
					transform	: "t" + ( ( w/2 ) - 90 - 16 ) + "," + ( ( h/2 ) + 90 - 16 )
				} )
			);
			s.attr( { cursor: "pointer" } )
				.hover(
					function () {	// mouse_in
						cancel_back.attr( { fill: "rgba(255,0,0,0.25)" } )
					},
					function () {	// mouse_out
						cancel_back.attr( { fill: "rgba(0,0,0,0)" } )
					}
				)
				.click( function () {
					self.hide();
					self._board.canvas._container.mousemove( InitBoardEvents( self._board.canvas._container ) );
					self._board.canvas._container.unbind( "mousemove" );
				} );
			self._panel.push( s );

			// OK Button
			var ok_back = self._paper.circle( ( w/2 ) + 90, ( h/2 ) + 90, 16 ).attr( {
				fill	: "rgba(0,0,0,0)",
				stroke	: "none"
			} );
			var s = self._paper.set();
			s.push( ok_back );
			s.push( self._paper.path( "M2.379,14.729 5.208,11.899 12.958,19.648 25.877,6.733 28.707,9.561 12.958,25.308z" )
				.attr( {
					fill		: "#0F0",
					stroke		: "none",
					transform	: "t" + ( ( w/2 ) + 90 - 16) + "," + ( ( h/2 ) + 90 - 16 )
				} ) );
			s.attr( { cursor: "pointer" } )
				.hover(
					function () {	// mouse_in
						ok_back.attr( { fill: "rgba(0,255,0,0.25)" } )
					},
					function () {	// mouse_out
						ok_back.attr( { fill: "rgba(0,0,0,0)" } )
					}
				)
				.click( function () {
					self._board.options.stroke		= picker.attr( "stroke" );
					self._board.options.fill		= picker.attr( "fill" );
					self._board.options.strokeWidth	= picker.attr( "stroke-width" );
					self.hide();
					self._board.canvas._container.mousemove( InitBoardEvents( self._board.canvas._container ) );
					self._board.canvas._container.unbind( "mousemove" );
				} );
			self._panel.push( s );
			self._panel.attr( { cursor: "pointer" } );

			$( self._container ).show();

			return self;
		},

		hide: function () {
			var self = this;

			$( self._container ).hide();
			self._paper.clear();

			return self;
		}
	};

	function AttributesPanel ( board, id ) {
		return Object.create( _attributesPanel ).init( board, id );
	}

	var Board = {
		init: function ( options, elem ) {
			var self = this;

			self._version = "1.1.0";
			self._UUID = Raphael.createUUID();

			self.elem = elem;
			self.$elem = $( elem );

			// Options
			if ( options ) {
				if ( options.strokeWidth ) {
					switch( options.strokeWidth ) {
						case "medium":
							options.strokeWidth = 4;
							break;
						case "big":
							options.strokeWidth = 8;
							break;
						case "huge":
							options.strokeWidth = 12;
							break;
						default:
							options.strokeWidth = 1;
					}
				}
			}
			self.options = $.extend( {}, $.fn.RaphBoard.options, options );

			// Events
			self.eventHandlers = {
				// Return false to prevent default execution
				before_mode_change		: null,		// called right before internal mode change procedure starts
				after_mode_change		: null,		// called right after internal mode change procedure completes
				before_start			: null,		// called right before internal drawing procedure starts
				after_start				: null,		// called right after internal drawing procedure starts
				before_change			: null,		// called right before internal drawing change procedure starts
				after_change			: null,		// called right after internal drawing change procedure completes
				before_end				: null,		// called right before internal drawing procedure completes
				after_end				: null,		// called right after internal drawing procedure completes
				before_select			: null,		// called right before internal select procedure starts
				after_select			: null,		// called right after internal select procedure completes
				before_deselect			: null,		// called right before internal deselect procedure starts
				after_deselect			: null,		// called right after internal deselect procedure completes
				before_show_handles		: null,		// called right before internal show_handles procedure starts
				after_show_handles		: null,		// called right after internal hide_handles procedure starts
				before_hide_handles		: null,		// called right before internal hide_handles procedure starts
				after_hide_handles		: null,		// called right after internal show_handles procedure starts
				before_move				: null,		// called right before internal move procedure starts
				after_move				: null,		// called right after internal move procedure completes
				before_cut				: null,		// called right before internal cut procedure starts
				after_cut				: null,		// called right after internal cut procedure completes
				before_undo				: null,		// called right before internal undo procedure starts
				after_undo				: null,		// called right after internal undo procedure completes
				before_redo				: null,		// called right before internal redo procedure starts
				after_redo				: null,		// called right after internal redo procedure completes
				before_clear			: null,		// called right before internal clearing procedure starts
				after_clear				: null,		// called right after internal clearing procedure completes
				updateUndoRedo			: null		// called upon each undo/redo operation to update GUI
			}

			// The Toolbar
			// Only if included!
			if ( typeof _toolBar !== 'undefined' && _toolBar != null ) {
				var toolBarContainer = "r_b-toolbar";
				self.$elem.append( "<div id='" + toolBarContainer + "'/>" );
				self.toolBar = ToolBar( self, toolBarContainer );

				// The Attributes Panel
				var attributesPanelContainer = "r_b-overlay";
				self.$elem.append( "<div id='" + attributesPanelContainer + "'/>" );
				self.attributesPanel = AttributesPanel( self, attributesPanelContainer );
			}

			// The Canvas
			var canvasContainer = "r_b-paper";
			self.$elem.append( "<div id='" + canvasContainer + "'/>" );
			self.canvas = Canvas( self, canvasContainer );
			self.paper = self.canvas.paper();

			// TODO: REMOVE self.elements ALTOGETHER!
			self.elements = [];		// list of all drawn objects
			self.undoBuffer = [];	// undo buffer, contains all actions
			self.redoBuffer = [];	// redo buffer, contains all undone actions

			self.mode( "pen" );	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"

			// Register Mouse Events
			self.mouseDownX = self.mouseDownY = self.mouseUpX = self.mouseUpY = 0;

			self.canvas._container.mouseenter( OnMouseEnter );

			return self;
		},	// init:

		// Properties
		container: function () {
			return this.elem;
		},

		version: function () {
			return this._version;
		},

		UUID: function () {
			return this._UUID;
		},

		left: function () {
			return this.$elem.offset().left;
		},

		top: function () {
			return this.$elem.offset().top;
		},

		width: function () {
			return this.$elem.width();
		},

		height: function () {
			return this.$elem.height();
		},

		isEnabled: function () {
			return this.options.editable;
		},

		canUndo: function () {
			return ( this.undoBuffer.length > 0 );
		},

		canRedo: function () {
			return ( this.redoBuffer.length > 0 );
		},

		// Attributes Methods
		getAttribute: function ( name ) {
			var o = this.options;

			if ( name == "align" ) {
				return o[ "textAnchor" ];
			} else {
				return o[ name ];
			}
		},

		toggleAttribute: function ( name ) {
			var o = this.options;

			switch( name ) {
				case "editable":
					o[ "editable" ] = !o[ "editable" ];
					break;
				case "bold":
					o[ 'fontWeight' ] = o[ 'fontWeight' ] == 'bold' ? 'normal' : 'bold';
					break;
				case "italic":
					o[ 'fontStyle' ] = o[ 'fontStyle' ] == 'italic' ? 'normal' : 'italic';
					break;
				case "underline":
					o[ 'textDecoration' ] = o[ 'textDecoration' ] == 'underline' ? 'none' : 'underline';
					break;
				case "strike":
					o[ 'textDecoration' ] = o[ 'textDecoration' ] == 'line-through' ? 'none' : 'line-through';
					break;
				default:
					// Ignore
			}

			return o[ name ];
		},

		setAttribute: function ( name, attribute ) {
			var o = this.options;

			if ( name == "align" ) {
				switch( attribute ) {
					case "left":
						o[ "textAnchor" ] = "start";
						break;
					case "center":
						o[ "textAnchor" ] = "middle";
						break;
					case "right":
						o[ "textAnchor" ] = "end";
						break;
					case "justify":
						// TODO: Implement Text Alignment: Justify
						o[ "textAnchor" ] = "middle";
						break;
					default:
						o[ "textAnchor" ] = "start";
				}
			} else {
				o[ name ] = attribute;
			}

			return o[ name ];
		},

		// Event handling methods
		on: function ( eventType, callback ) {
			var self = this;

			$.each( self.eventHandlers, function ( k, v ) {
				if ( k = eventType ) {
					self.eventHandlers[ eventType ] = callback;
					return false;
				}
			});

			return self;
		},

		off: function ( eventType ) {
			var self = this;

			$.each( self.eventHandlers, function ( k, v ) {
				if ( k = eventType ) {
					self.eventHandlers[ eventType ] = null;
					return false;
				}
			});

			return self;
		},

		// Editing methods
		enable: function () {
			var self = this;

			self.options.editable = true;
			if ( self.toolBar ) {
				self.toolBar.enable();
			}

			return self;
		},

		disable: function () {
			var self = this;

			self.canvas._container.unbind( "mouseenter" );
			self.elem.removeClasses( "cursor-*" );
			self.options.editable = false;
			if ( self.toolBar ) {
				self.toolBar.disable();
			}

			return self;
		},

		mode: function ( mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
			var self = this;

			if ( mode !== undefined ) {
				if ( EventHandler( self, "before_mode_change" ) ) {
					ClearModeEvents( self );
					self._mode = mode;
					if ( self.options.editable ) {
						if ( self.toolBar ) {
							self.toolBar.deselectAll();
							self.toolBar.button( self._mode ).select();
						}
					}
					SetModeEvents( self );
				}
				EventHandler( self, "after_mode_change" );
			}

			return self._mode;
		},

		element: function ( id ) {
			var self = this;
			var element;

			$.each( self.elements, function( k, v ) {
				if ( v.id == id ) {
					element = v;
					return false;	// We've reached the goal, exit $.each
				}
			});

			return element;
		},

		initMove: function ( id, hideHandles ) {
			var self = this;
			var element = self.element( id );

			if ( element && element.freeTransform ) {
				var ft = element.freeTransform;
			} else {
				var ft = InitMove( self, element );
			}
			if ( hideHandles ) {
				ft.hideHandles({ undrag: false });
			} else {
				ft.showHandles();
			}

			return element;
		},

		select: function ( id ) {
			var self = this;

			return self.initMove( id );
		},

		deselect: function ( id, noUnplug ) {
			var self = this;
			var element = self.element( id );

			if ( element ) {
				ClearElementEvents( element, noUnplug );
			}

			return element;
		},

		showHandles: function ( id ) {
			var self = this;
			var element = self.element( id );

			if ( element ) {
				return ShowHandles( self, element );
			}
		},

		hideHandles: function ( id ) {
			var self = this;
			var element = self.element( id );

			if ( element ) {
				return HideHandles( self, element );
			}
		},

		move: function ( id, x, y ) {
			// TODO: Rewrite to use freeTransform
			var self = this;
			var element = self.element( id );
			var animation = self.options.animation;

			if ( element ) {
				switch( element.type ) {	// "path|circle|ellipse|rect|text"
					case "path":
						var t = element.matrix.toTransformString().replace( "t", "" ).split( "," );
						element.ox = t[0] ? t[0] : 0;
						element.oy = t[1] ? t[1] : 0;
						break;
					case "circle":
					case "ellipse":
						element.ox = element.attr( "cx" );
						element.oy = element.attr( "cy" );
						break;
					default:
						element.ox = element.attr( "x" );
						element.oy = element.attr( "y" );
				}
				var dx = x - element.ox;
				var dy = y - element.oy;
				// if ( animation ) {
				// 	switch( element.type ) {
				// 		case "path":
				// 			var animationParams = {
				// 				transform: "t" + ( parseInt( element.ox ) + parseInt( dx ) ) +
				// 							"," + ( parseInt( element.oy ) + parseInt( dy ) )
				// 			}
				// 			break;
				// 		case "circle":
				// 		case "ellipse":
				// 			var animationParams = {
				// 				cx: element.ox + dx,
				// 				cy: element.oy + dy
				// 			};
				// 			break;
				// 		default:
				// 			var animationParams = {
				// 				x: element.ox + dx,
				// 				y: element.oy + dy
				// 			};
				// 	}
				// 	element.animate( Raphael.animation(
				// 		$.extend( {}, animation.params, animationParams ),
				// 		animation.delay,
				// 		animation.easing
				// 	));
				// }
				switch( element.type ) {
					case "path":
						element.transform( "t" +
							( parseInt( element.ox ) + parseInt( dx ) ) + "," +
							( parseInt( element.oy ) + parseInt( dy ) )
						);
						break;
					case "circle":
					case "ellipse":
						element.attr( { cx: element.ox + dx, cy: element.oy + dy } );
						break;
					default:
						element.attr( { x: element.ox + dx, y: element.oy + dy } );
				}
				self.paper.safari();
				PushToBuffer( self, "move", element );
			}

			return element;
		},

		modify: function ( id, attrs ) {
			var self = this;
			var element = self.element( id );
			var animation = self.options.animation;

			if ( element ) {
				if ( typeof attrs === "object" ) {

					element.attr( attrs );

					self.paper.safari();

					PushToBuffer( self, "modify", element );
				}
			}

			return element;
		},

		transform: function ( id, transform ) {
			var self = this;
			var animation = self.options.animation;
			var element = self.element( id );

			if ( element ) {
				if ( typeof transform === "string" ) {

					element.transform( transform );

					self.paper.safari();

					PushToBuffer( self, "transform", element );
				}
			}

			return element;
		},

		freeTransform: function ( id, attrs ) {
			var self = this;
			var element = self.element( id );

			if ( element ) {
				if ( typeof attrs === "object" ) {

					// var unplug = false;
					// var ft = element.freeTransform;
					// if ( !ft ) {
					// 	unplug = true;
					// 	ft = self.paper.freeTransform( element ).setOpts({
					// 		animate: self.options.animation
					// 	});
					// }

					// var attrs_ = JSON.parse( JSON.stringify( attrs ) );
					// var fa = ft.attrs;

					// for ( var attr in attrs_ ) {
					// 	switch ( attr ) {
					// 	case "cx":
					// 		fa.translate.x = attrs_[attr] - fa.center.x;
					// 		fa.center.x = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "cy":
					// 		fa.translate.y = attrs_[attr] - fa.center.y;
					// 		fa.center.y = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "rx":
					// 		fa.size.x = attrs_[attr] * 2;
					// 		delete attrs_[attr];
					// 		break;
					// 	case "ry":
					// 		fa.size.y = attrs_[attr] * 2;
					// 		delete attrs_[attr];
					// 		break;
					// 	case "sx":
					// 		fa.scale.x = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "sy":
					// 		fa.scale.y = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "width":
					// 		fa.size.x = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "height":
					// 		fa.size.y = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "x":
					// 		fa.translate.x = attrs_[attr] - fa.x;
					// 		fa.x = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "y":
					// 		fa.translate.y = attrs_[attr] - fa.y;
					// 		fa.y = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "r":
					// 		fa.size.x = attrs_[attr] * 2;
					// 		fa.size.y = attrs_[attr] * 2;
					// 		delete attrs_[attr];
					// 		break;
					// 	case "ratio":
					// 		fa.ratio = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	case "rotate":
					// 		fa.rotate = attrs_[attr];
					// 		delete attrs_[attr];
					// 		break;
					// 	default:
					// 		// Ignore
					// 	}
					// }

					// element.attr( attrs );

					// if ( data ) {
					// 	if ( data.ft && data.ft.attrs ) {
					// 		ft.attr( data.ft.attrs );
							SetFreeTransformAttrs( self, element, attrs )
					// 	}
					// }

					// ft.apply();

					// if ( unplug ) {
					// 	ft.unplug();
					// }

					// if ( !( JSON.stringify( attrs_ ) === "{}" ) ) {
					// 	element.attr( attrs_ );
					// }

					PushToBuffer( self, "move", element );
				} else {
					return GetFreeTransformAttrs( self, element )
				}
			}

			return element;
		},

		line: function ( x, y, dx, dy ) {
			var self = this;

			if ( !( dx == 0 && dy == 0 ) ) {
				var element = StartLine( self, x, y );
				element.attr( "path", "M" + x + "," + y +
									"L" + dx + "," + dy );
				self.elements.push( element );
				PushToBuffer( self, "line", element );

				return element;
			}

			return null;
		},

		arrow: function ( x, y, dx, dy ) {
			var self = this;

			if ( !( dx == 0 && dy == 0 ) ) {
				var element = StartLine( self, x, y );
				element.attr( "path", "M" + x + "," + y +
									"L" + dx + "," + dy );
				self.elements.push( element );
				PushToBuffer( self, "arrow", element );

				return element;
			}

			return null;
		},

		circle: function ( x, y, r ) {
			var self = this;

			if ( r != 0 ) {
				var element = StartCircle( self, x, y );
				element.attr( "r", r );
				self.elements.push( element );
				PushToBuffer( self, "circle", element );

				return element;
			}

			return null;
		},

		ellipse: function ( x, y, rx, ry ) {
			var self = this;

			if ( !( rx == 0 && ry == 0 ) ) {
				var element = StartEllipse( self, x, y );
				element.attr( "rx", rx )
					.attr( "ry", ry );
				self.elements.push( element );
				PushToBuffer( self, "ellipse", element );

				return element;
			}

			return null;
		},

		rect: function ( x, y, dx, dy ) {
			var self = this;

			if ( !( dx == 0 && dy == 0 ) ) {
				var element = StartRectangle( self, x, y );
				element.attr( "dx", dx )
					.attr( "dy", dy );
				self.elements.push( element );
				PushToBuffer( self, "rect", element );

				return element;
			}

			return null;
		},

		text: function ( x, y, text, size ) {
			var self = this;

			if ( text && text != "" ) {
				if ( size && !isNaN( size ) ) {
					var fontSize = Math.abs( parseInt( size ) );
					self.options.fontSize = ( fontSize == 0 ) ? 12 : fontSize;
				}
				var element = DrawText( self, x, y, text );
				self.elements.push( element );
				PushToBuffer( self, "text", element );

				/***********************************************************/
				// EXCEPTIONALLY IN THIS CASE WE'RE CALLING EVENT HANDLER! //
				/***********************************************************/
				EventHandler( self, "after_end" );
				return element;
			}

			return null;
		},

		cut: function ( id ) {
			var self = this;
			var elements = self.elements;
			var isCut = false;

			if ( elements.length > 0 ) {
				for ( var i=0;i<elements.length;i++ ) {
					if ( elements[i].id == id ) {
						PushToBuffer( self, "cut", elements[i] );
						elements[i].remove();
						elements.splice( i, 1 );
						isCut = true;
						break;
					}
				}
			}

			return isCut;
		},
		// TODO: Change toJSON to export self.elements not paper elements
		toJSON: function ( id, callback ) {
			// https://github.com/ElbertF/Raphael.JSON
			var self = this,
				elements = [],
				cache = [],
				paper = self.paper,
				prepareElement = function ( el ) {
					var data = callback ? callback( el, new Object ) : new Object;

					if ( data ) {
						data.ft = {
							attrs: GetFreeTransformAttrs( self, el )
						};
						elements.push({
							command : el.type,
							element : {
								data		: data,
								type		: el.type,
								attrs		: el.attrs,
								transform	: el.matrix.toTransformString(),
								id			: el.id
							}
						});
					}
				};

			if ( id ) {
				prepareElement( paper.getById( id ) );
			} else {
				paper.forEach(function( el ) {
					prepareElement( el );
				});
			}

			var o = JSON.stringify( elements, function ( key, value ) {
				// http://stackoverflow.com/a/11616993/400048
				if ( typeof value === 'object' && value != null ) {
					if ( cache.indexOf( value ) !== -1 ) {
						// Circular reference found, discard key
						return;
					}
					// Store value in our collection
					cache.push( value );
				}
				return value;
			});

			elements = cache = null;

			return o;
		},

		fromJSON: function ( elements, callback ) {
			// https://github.com/ElbertF/Raphael.JSON
			var self = this,
				json = [],
				_json;

			if ( typeof elements === "string" ) {
				_json = JSON.parse( elements );
			} else {
				_json = elements;
			}

			if ( !( _json instanceof Array ) ) {
				json.push( _json );
			} else {
				json = _json;
			}

			for ( var i in json ) {
				if ( json.hasOwnProperty( i ) ) {
					var element = Draw( self, json[i].element );
					var data = json[i].element.data;
					if ( data ) {
						if ( data.ft && data.ft.attrs ) {
							SetFreeTransformAttrs( self, element, data.ft.attrs );
						}
					}

					if ( callback ) callback( element );

					PushToBuffer( self, json[i].command, element );
				}
			}
		},

		undo: function () {
			var self = this;

			if ( self.canUndo() ) {
				if ( EventHandler( self, "before_undo" ) ) {
					var paper = self.paper;
					var elements = self.elements;
					var undoBuffer = self.undoBuffer;
					var shape = undoBuffer.pop();
					var mode = shape.command;

					ClearModeEvents( self );
					switch( mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut|clear"
						case "move":
							var prev = PreviousShapeInBuffer( undoBuffer, shape.element.id );
							if ( prev ) {
								// self.modify( prev.id, prev.attrs );
								// self.modify() pushes shape to undo buffer,
								// so we fix that
								// self.undoBuffer.pop();
								// self.transform( prev.id, prev.transform );
								// self.transform() pushes shape to undo buffer,
								// so we fix that
								// self.undoBuffer.pop();
								self.freeTransform( prev.id, prev.data.ft.attrs );
								// self.freeTransform() pushes shape to undo buffer,
								// so we fix that
								self.undoBuffer.pop();
							}
							break;
						case "modify":
							var prev = PreviousShapeInBuffer( undoBuffer, shape.element.id );
							if ( prev ) {
								self.modify( prev.id, prev.attrs );
								// self.modify() pushes shape to undo buffer,
								// so we fix that
								self.undoBuffer.pop();
								break;
							}
							break;
						case "transform":
							var prev = PreviousShapeInBuffer( undoBuffer, shape.element.id );
							if ( prev ) {
								self.transform( prev.id, prev.transform );
								// self.transform() pushes shape to undo buffer,
								// so we fix that
								self.undoBuffer.pop();
								break;
							}
							break;
						case "cut":
							Draw( self, shape.element );
							break;
						case "clear":
							shape.elements.map(function( element ) {
								Draw( self, element );
							});
							break;
						default:	// undo draw shape
							elements.pop().remove();
					}
					self.redoBuffer.push( shape );
					switch( mode ) {
						case "modify":
						case "transform":
						case "undo":
						case "redo":
						case "clear":
							break;
						default:
							self.mode( mode );
							SetModeEvents( self );
					}
				}
			}
			self.toggleUndoRedo();

			EventHandler( self, "after_undo" );

			return self;
		},

		clearUndo: function () {
			var self = this;

			self.undoBuffer = [];
			self.toggleUndoRedo();

			return self;
		},

		redo: function () {
			var self = this;

			if ( self.canRedo() ) {
				if ( EventHandler( self, "before_redo" ) ) {
					var elements = self.elements;
					var redoBuffer = self.redoBuffer;
					var paper = self.paper;
					var shape = redoBuffer.pop();
					var mode = shape.command;
					var element = shape.element;

					ClearModeEvents( self );
					switch( mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut|clear"
						case "move":
							// self.modify( element.id, element.attrs );
							// self.modify() pushes element to undo buffer,
							// so we fix that
							// self.undoBuffer.pop();
							// self.transform( element.id, element.transform );
							// self.transform() pushes element to undo buffer,
							// so we fix that
							// self.undoBuffer.pop();
							// self.undoBuffer.push( shape );
							self.freeTransform( element.id, shape.element.data.ft.attrs );
							// self.freeTransform() pushes element to undo buffer,
							// so we fix that
							self.undoBuffer.pop();
							self.undoBuffer.push( shape );
							break;
						case "modify":
							self.modify( element.id, element.attrs );
							break;
						case "transform":
							self.transform( element.id, element.transform );
							break;
						case "cut":
							self.cut( element.id );
							break;
						case "clear":
							self.clear();
							break;
						default:	// redo draw element
							Draw( self, element );
							self.undoBuffer.push( shape );
					}
					switch( mode ) {
						case "modify":
						case "transform":
						case "undo":
						case "redo":
						case "clear":
							break;
						default:
							self.mode( mode );
							SetModeEvents( self );
					}
				}
			}
			self.toggleUndoRedo();

			EventHandler( self, "after_redo" );

			return self;
		},

		clearRedo: function () {
			var self = this;

			self.redoBuffer = [];
			self.toggleUndoRedo();

			return self;
		},

		toggleUndoRedo: function () {
			var self = this;

			if ( self.toolBar ) {

				var handler = self.eventHandlers[ 'updateUndoRedo' ];

				if ( handler ) {
					handler( self );
				} else {
					self.toolBar.toggleUndoRedo();
				}
			}

			return self;
		},

		clear: function () {
			var self = this;

			if ( self.elements.length > 0 ) {
				if ( EventHandler( self, "before_clear" ) ) {
					ClearModeEvents( self );
					var elements = [];
					self.elements.map(function( element ) {
						elements.push( CloneElement( self, element ) );
					});
					self.undoBuffer.push({
						command	: "clear",
						elements: elements
					} );
					self.elements = [];
					self.paper.clear();
				}
			}
			self.clearRedo();

			EventHandler( self, "after_clear" );

			return self;
		},

		flush: function () {
			var self = this;

			ClearModeEvents( self );
			self.elements = [];
			self.paper.clear();
			self.clearUndo();
			self.clearRedo();

			return self;
		}
	};

	$.fn.RaphBoard = function ( options, argument ) {
		var board = $( this ).data( "RaphBoard" );

		if ( !board ) {
			board = Object.create( Board );

			board.init( options, this );

			$.data( this.get( 0 ), "RaphBoard", board );
		}

		if ( options !== undefined ) {
			if ( typeof options === "object" ) {
				// Set options
				board.options = $.extend( {}, $.fn.RaphBoard.options, options );
			} else if ( typeof options === "string" ) {
				// Set options
				board.options = $.extend( {}, $.fn.RaphBoard.options, { options: argument } );
			}
		}

		return board;
	};

	$.fn.RaphBoard.options = {
		/*
		// See http://raphaeljs.com/reference.html#Element.attr for more info
		*/
		editable		: true,										// allow editing
		stroke			: "#FFF",									// default: "#000"
		strokeWidth		: 1,										// default: 1 ("small (1)|medium (4)|big (8)|huge (12)")
		fill			: "#FFF",									// default: "#FFF"
		lineCap			: "round",									// default: "butt" (“butt|square|round”)
		lineJoin		: "round",									// default: "butt" (“bevel|round|miter”) ???
		arrowEnd		: "classic-medium-medium",					// default: "none" ("classic|block|open|oval|diamond|none[-wide|narrow|midium[-long|short|midium]]"
		fontSize		: 12,										// default: "10"
		font			: null,										// default: '10px "Arial"' (NOTE the apostrophes!)
		fontFamily		: null,										// default: '"Arial"' (NOTE the apostrophes!)
		fontStyle		: null,										// default: "normal" ("normal|italic|oblique|inherit")
		fontWeight		: null,										// default: 400 ("normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|inherit")
		textAnchor		: "start",									// default: "middle" ("start|middle|end|inherit")
		// NOTE: text-decoration not (yet) implemented in Raphael?
		textDecoration	: null,										// default: "none" ("none|[underline||overline||line-through||blink]|inherit")
		animation		: {											// Default animation to be applied to freeTransform or "false" to disable
							delay: 100,
							easing: "<>"
						}											// set to null if no animation wanted
	};

	$.fn.removeClasses = function ( mask ) {
		return this.removeClass( function ( index, cls ) {
			var re = mask.replace( /\*/g, '\\S+' );
			return ( cls.match( new RegExp( '\\b' + re + '', 'g' )) || [] ).join( ' ' );
		});
	};

	// Editing Events Functions
	function SetModeEvents( self, ignoredElement ) {
		if ( self.options.editable ) {
			self.elements.map(function( element ) {
				if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
					SetElementEvents( self, element, self._mode );
				}
			});
		}
	}

	function SetElementEvents( self, element, mode ) {
		switch ( mode ) {
		case "move":
			if ( element.freeTransform == null ) {
				self.initMove( element.id, true );
			}
			element.attr( { cursor: "pointer" } );
			break;
		case "text":
			element.attr( { cursor: "text" } );
			break;
		case "cut":
			element.hover( OnCutIn, OnCutOut );
			element.attr( { cursor: "pointer" } );
			break;
		case "pen":
		case "line":
		case "arrow":
		case "circle":
		case "ellipse":
		case "rect":
			element.attr( { cursor: "crosshair" } );
			break;
		default:
			// Ignore everything else
		}
	}

	function ClearModeEvents( self, ignoredElement ) {
		if ( self.options.editable ) {
			self.elements.map(function( element ) {
				if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
					ClearElementEvents( element, true );	// keep freeTransform
				} else {
					ClearElementEvents( element );		// freeTransform.unplug()
				}
				switch( self._mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
					case "move":
					case "cut":
						element.attr( { cursor: "pointer" } );
						break;
					case "text":
						element.attr( { cursor: "text" } );
						break;
					default:
						element.attr( { cursor: "crosshair" } );
				}
			});
		}
	}

	function ClearElementEvents( element, noUnplug ) {
		if ( element.events ) {
			var eventsLength = element.events.length;
			for ( var i=0;i<eventsLength;i++ ) {
				switch ( element.events[i].f ) {
				// Remove only our events
				case OnCutIn:
				case OnCut:
				case OnCutOut:
				case OnMouseDown:
				case OnMouseMove:
				case OnMouseUp:
					element[ "un"+element.events[i].name ]( element.events[i].f );
					if ( element.events ) {
						eventsLength = element.events.length;
					} else {
						eventsLength = 0;
					}
					i--;
					break;
				default:
					// Ignore
				}
			}
		}
		if ( element.freeTransform && !noUnplug ) {
			element.freeTransform.unplug();
		}
	}

	function InitMove( self, element ) {
		var moved = false;
		return self.paper.freeTransform(
			element,
			{
				animate		: false,
				attrs: {	// Attributes for handles
					fill	: "#bada55",
					stroke	: "#000"
				},
				drag: [
					"center",
					"self"
				],
				draw		: ( element.type === "circle" ) ? [ "bbox" ] : [ "circle", "bbox" ],
				keepRatio	: ( element.type === "circle" ) ? true : false,
				rotate		: ( element.type === "circle" ) ? false : [ "axisX" ],
				scale		: [
					"bboxCorners",
					"bboxSides"
				],
				size: {
					axes		: 5,
					bboxCorners	: 5,
					bboxSides	: 5,
					center		: 5
				}
			},
			function( ft, events ) {
				switch ( events[0] ) {	// Single events only
				case "init":
					moved = false;
					break;
				case "drag start":
					ft.hideHandles({ undrag: false });
					element.attr({ cursor: "move" });
					break;
				case "drag end":
					ft.showHandles();
					element.attr({ cursor: "pointer" });
					break;
				case "rotate start":
					if ( ft.handles.center ) {
						ft.handles.center.disc.hide();
					}
					if ( ft.bbox ) {
						ft.bbox.hide();
						if ( ft.handles.bbox ) {
							ft.handles.bbox.map(function( handle ) {
								handle.element.hide();
							});
						}
					}
					element.attr({ cursor: "pointer" });
					break;
				case "rotate end":
					if ( ft.handles.center ) {
						ft.handles.center.disc.show();
					}
					if ( ft.bbox ) {
						ft.bbox.show();
						if ( ft.handles.bbox ) {
							ft.handles.bbox.map(function( handle ) {
								handle.element.show();
							});
						}
					}
					element.attr({ cursor: "pointer" });
					break;
				case "scale start":
					if ( ft.handles.center ) {
						ft.handles.center.disc.hide();
					}
					[ 'x', 'y' ].map(function(axis) {
						if ( ft.handles[axis] ) {
							ft.handles[axis].disc.hide();
							ft.handles[axis].line.hide();
						}
					});
					if ( ft.bbox ) {
						var selectedHandle;
						var cursor = "";

						self.paper.getElementsByPoint( ft.o.handlePos.cx, ft.o.handlePos.cy ).forEach(function( element ) {
							if ( element.type === "rect" ) {
								selectedHandle = element.id;
								return false;
							}
						});
						if ( ft.handles.bbox ) {
							ft.handles.bbox.map(function( handle ) {
								if ( selectedHandle !== handle.element.id ) {
									handle.element.hide();
								} else {
									// // Position of Handle
									// // x = -1	// "W"
									// // x = 0	// ""
									// // x = 1	// "E"
									// // y = -1	// "N"
									// // y = 0	// ""
									// // y = 1	// "S"
									// switch ( handle.y ) {
									// case -1:
									// 	cursor = "n";
									// 	break;
									// case 1:
									// 	cursor = "s";
									// 	break;
									// default:	// 0
									// 	// ""
									// }
									// switch ( handle.x ) {
									// case -1:
									// 	cursor += "w";
									// 	break;
									// case 1:
									// 	cursor += "e";
									// 	break;
									// default:	// 0
									// 	// ""
									// }
									// handle.element.attr({
									// 	// ne-resize
									// 	// nw-resize
									// 	// se-resize
									// 	// sw-resize
									// 	// e-resize
									// 	// n-resize
									// 	// s-resize
									// 	// w-resize
									// 	cursor: cursor += "-resize"
									// });
								}
							});
						}
					}
					if ( ft.circle ) {
						ft.circle.hide();
					}
					break;
				case "scale end":
					if ( ft.handles.center ) {
						ft.handles.center.disc.show();
					}
					[ 'x', 'y' ].map(function( axis ) {
						if ( ft.handles[axis] ) {
							ft.handles[axis].disc.show();
							ft.handles[axis].line.show();
						}
					});
					if ( ft.bbox ) {
						// ft.bbox.show();
						if ( ft.handles.bbox ) {
							ft.handles.bbox.map(function( handle ) {
								handle.element.show();
							});
						}
					}
					if ( ft.circle ) {
						ft.circle.show();
					}
					element.attr({ cursor: "pointer" });
					break;
				default:	// "drag|rotate|scale|apply..."
					moved = true;
				}
				switch ( events[0].split(" ")[1] ) {
				case "start":
					if ( EventHandler( self, "before_move" ) ) {
						HideAllHandles( self, element );
						PushToBuffer( self, self._mode, element );
					}
					break;
				case "end":
					var shape = self.undoBuffer.pop();
					if ( moved ) {
						// var a = shape.element.attrs;
						// var fa = ft.attrs;

						// switch( shape.element.type ) {	// "path|circle|ellipse|rect|text"
						// /* freeTransform attributes
						// 	ft.attrs.x
						// 	ft.attrs.y
						// 	ft.attrs.ratio (?)
						// 	ft.attrs.rotate
						// 	ft.attrs.center.x
						// 	ft.attrs.center.y
						// 	ft.attrs.scale.x
						// 	ft.attrs.scale.y
						// 	ft.attrs.size.x
						// 	ft.attrs.size.y
						// 	ft.attrs.translate.x
						// 	ft.attrs.translate.y
						// 	ft.items.length
						// */
						// case "circle":
						// 	a.cx = fa.center.x + fa.translate.x;
						// 	a.cy = fa.center.y + fa.translate.y;
						// 	a.r = ( fa.size.x / 2 );
						// 	break;
						// case "ellipse":
						// 	a.cx = fa.center.x + fa.translate.x;
						// 	a.cy = fa.center.y + fa.translate.y;
						// 	a.rx = fa.size.x * fa.scale.x;
						// 	a.ry = fa.size.y * fa.scale.y;
						// 	break;
						// case "text":
						// 	a.x = fa.center.x + fa.translate.x - ( fa.size.x / 2 );
						// 	a.y = fa.center.y + fa.translate.y - ( fa.size.y / 2 );	// !!!
						// 	break;
						// case "rect":
						// 	a.width = fa.size.x * fa.scale.x;
						// 	a.height = fa.size.y * fa.scale.y;
						// default:	// "path"
						// 	a.x = fa.center.x + fa.translate.x - ( fa.size.x / 2 );
						// 	a.y = fa.center.y + fa.translate.y - ( fa.size.y / 2 );
						// }
						// a.sx = fa.scale.x;
						// a.sy = fa.scale.y;
						// a.ratio = fa.ratio;
						// a.rotate = fa.rotate;

						shape.element.data.ft.attrs = GetFreeTransformAttrs( self, element );
						delete shape.element.attrs.cursor;

						self.undoBuffer.push( shape );
						self.clearRedo();

						moved = false;
					}
					EventHandler( self, "after_move" );
					break;
				default:
					// Ignore the rest
				}
			}
		);
	}

	function SelectAllElements( self, ignoredElement ) {
		self.elements.map(function( element ) {
			if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
				SelectElement( self, element );
			}
		});

		return ignoredElement;
	}

	function SelectElement( self, element ) {
		if ( EventHandler( self, "before_select" ) ) {
			element.attr({ cursor: "move" });
			self.select( element.id );
		}

		EventHandler( self, "after_select" );

		return element;
	}

	function DeselectAllElements( self, ignoredElement ) {
		self.elements.map(function( element ) {
			if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
				DeselectElement( self, element );
			}
		});

		return ignoredElement;
	}

	function DeselectElement( self, element ) {
		if ( EventHandler( self, "before_deselect" ) ) {
			self.deselect( element.id );
		}

		EventHandler( self, "after_deselect" );

		return element;
	}

	function ShowAllHandles( self, ignoredElement ) {
		var elements = self.elements;

		elements.map(function( element ) {
			if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
				ShowHandles( self, element );
			}
		});

		return ignoredElement;
	}

	function ShowHandles( self, element ) {
		if ( EventHandler( self, "before_show_handles" ) ) {
			if ( element.freeTransform ) {
				var ft = element.freeTransform;

				if ( ft.handles.center ) {
					ft.handles.center.disc.show();
				}
				if ( ft.bbox ) {
					ft.bbox.show();
					if ( ft.handles.bbox ) {
						ft.handles.bbox.map(function( handle ) {
							handle.element.show();
						});
					}
				}
				[ 'x', 'y' ].map(function( axis ) {
					if ( ft.handles[axis] ) {
						ft.handles[axis].disc.show();
						ft.handles[axis].line.show();
					}
				});
				if ( ft.circle ) {
					ft.circle.show();
				}
			}
		}

		EventHandler( self, "after_show_handles" );

		return element;
	}

	function HideAllHandles( self, ignoredElement ) {
		var elements = self.elements;

		elements.map(function( element ) {
			if ( element.id !== ( ( ignoredElement ) ? ignoredElement.id : -1 ) ) {
				HideHandles( self, element );
			}
		});

		return ignoredElement;
	}

	function HideHandles( self, element ) {
		if ( EventHandler( self, "before_hide_handles" ) ) {
			if ( element.freeTransform ) {
				var ft = element.freeTransform;

				if ( ft.handles.center ) {
					ft.handles.center.disc.hide();
				}
				if ( ft.bbox ) {
					ft.bbox.hide();
					if ( ft.handles.bbox ) {
						ft.handles.bbox.map(function( handle ) {
							handle.element.hide();
						});
					}
				}
				[ 'x', 'y' ].map(function( axis ) {
					if ( ft.handles[axis] ) {
						ft.handles[axis].disc.hide();
						ft.handles[axis].line.hide();
					}
				});
				if ( ft.circle ) {
					ft.circle.hide();
				}
			}
		}

		EventHandler( self, "after_hide_handles" );

		return element;
	}

	function OnCutIn( e ) {
		// e.stopPropagation();
		var element = this;
		var elem = $( element.node );
		var self = elem.parent().parent().parent().data( "RaphBoard" );

		element.mousedown( OnCut );

		SetCutAttributes( self, element );
	}

	function OnCut( e ) {
		// e.stopPropagation();
		var element = this;
		var elem = $( element.node );
		var self = elem.parent().parent().parent().data( "RaphBoard" );

		if ( EventHandler( self, "before_cut" ) ) {
			ClearElementEvents( element );
			ResetCutAttributes( self, element );
			self.cut( element.id );
		}
		EventHandler( self, "after_cut" );
	}

	function OnCutOut( e ) {
		// e.stopPropagation();
		var element = this;
		var elem = $( element.node );
		var self = elem.parent().parent().parent().data( "RaphBoard" );

		element.unmousedown( OnCut );

		ResetCutAttributes( self, element );
	}

	function SetCutAttributes( self, element ) {
		self.cutStroke = element.attr( "stroke" );
		self.cutStrokeWidth = element.attr( "stroke-width" );
		self.cutStrokeDash = element.attr( "stroke-dasharray" );
		if ( element.type != "path" && element.attr( "fill" ) != "none" ) {
			self.cutFill = element.attr( "fill" );
			self.cutOpacity = element.attr( "fill-opacity" );
			element.attr( { "fill": "#F00", "fill-opacity": 1 } );
		}
		element.attr( {
			"stroke"			: "#F00",
			"stroke-width"		: 1,
			"stroke-dasharray"	: "-"
		});
		if ( element.type != "path" && element.attr( "fill" ) != "none" ) element.animate( { "fill-opacity": 0.5 }, 100 );
	}

	function ResetCutAttributes( self, element ) {
		if ( element.type != "path" && element.attr( "fill" ) != "none" ) {
			element.animate( { "fill-opacity": self.cutOpacity }, 100 ).attr( {
				"fill"			: self.cutFill,
				"fill-opacity"	: self.cutOpacity
			});
		}
		element.attr( {
			"stroke"			: self.cutStroke,
			"stroke-width"		: self.cutStrokeWidth,
			"stroke-dasharray"	: self.cutStrokeDash
		});
	}

	function InitBoardEvents( elem ) {
		var self = elem.parent().data( "RaphBoard" );

		switch( self._mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
			case "move":
			case "cut":
				elem.css( { cursor: "pointer" } );
				break;
			case "text":
				elem.css( { cursor: "text" } );
				break;
			default:
				elem.css( { cursor: "crosshair" } );
		}

		elem.unbind( "mouseenter" )
			.mouseleave( OnMouseLeave );
		if ( self._mode != "cut" ) elem.mousedown( OnMouseDown );
	}

	function EventHandler( self, eventType ) {
		var handler = self.eventHandlers[ eventType ];

		if ( handler ) {
			return handler( self );
		} else {
			return true;
		}
	}

	function OnMouseEnter( e ) {
		var elem = $( e.delegateTarget );
		var self = elem.parent().data( "RaphBoard" );

		if ( self.options.editable ) {
			InitBoardEvents( elem );
		}
	}

	function OnMouseDown( e ) {
		// Prevent text edit cursor while dragging in webkit browsers
		e.originalEvent.preventDefault();
		var elem = $( e.delegateTarget );
		var self = elem.parent().data( "RaphBoard" );

		self.mouseDownX = e.pageX - self.left();
		self.mouseDownY = e.pageY - self.top() - ( self.toolBar ? self.toolBar.height() : 0 );

		if ( EventHandler( self, "before_start" ) ) {
			var elements = self.elements;
			switch( self._mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
			case "pen":
				elements.push( StartLine( self, self.mouseDownX, self.mouseDownY ) );
				break;
			case "line":
				elements.push( StartLine( self, self.mouseDownX, self.mouseDownY ) );
				break;
			case "arrow":
				elements.push(
					StartLine( self, self.mouseDownX, self.mouseDownY )
						.attr( { "arrow-end": self.options.arrowEnd } )
				);
				break;
			case "circle":
				elements.push( StartCircle( self, self.mouseDownX, self.mouseDownY ) );
				break;
			case "ellipse":
				elements.push( StartEllipse( self, self.mouseDownX, self.mouseDownY ) );
				break;
			case "rect":
				elements.push( StartRectangle( self, self.mouseDownX, self.mouseDownY ) );
				break;
			case "text":
				GetText( self, self.mouseDownX, self.mouseDownY );
				break;
			default: //	"move"
				var element = self.paper.getElementByPoint( e.pageX, e.pageY );
				if ( element == null ) {
					DeselectAllElements( self );
					self.multiSelect = StartRectangle( self, self.mouseDownX, self.mouseDownY );
					self.multiSelect.attr({
						"fill"				: "#bada55",
						"fill-opacity"		: .1,
						"stroke"			: "#bada55",
						"stroke-width"		: 1,
						"stroke-dasharray"	: "-"
					});
				}
			}

			if ( self._mode != "text" && self._mode != "cut" ) {
				if ( self._mode != "move" || self.multiSelect != null ) {
					elem.mousemove( OnMouseMove );
				}
				elem.mouseup( OnMouseUp );
			}
		}

		EventHandler( self, "after_start" );
	}

	function OnMouseMove( e ) {
		var elem = $( e.delegateTarget );
		var self = elem.parent().data( "RaphBoard" );

		if ( EventHandler( self, "before_change" ) ) {
			var element = self.elements[ self.elements.length - 1 ];

			var moveX = e.pageX - self.left();
			var moveY = e.pageY - self.top() - ( self.toolBar ? self.toolBar.height() : 0 );

			var width = moveX - self.mouseDownX;
			var height = moveY - self.mouseDownY;

			switch( self._mode ) {	// "move|pen|line|arrow|circle|ellipse|rect|text|cut"
				case "pen":
					element.attr( "path", element.attr( "path" ) + "L" + moveX + "," + moveY );
					break;
				case "line":
					element.attr( "path", "M" + self.mouseDownX + " " + self.mouseDownY + "L" + moveX + "," + moveY );
					break;
				case "arrow":
					element.attr( "path", "M" + self.mouseDownX + " " + self.mouseDownY + "L" + moveX + "," + moveY );
					break;
				case "circle":
					element.attr( "r", Math.max( Math.abs( width ), Math.abs( height ) ) );
					break;
				case "ellipse":
					element.attr( "rx", Math.abs( width ) )
						 .attr( "ry", Math.abs( height ) );
					break;
				case "rect":
					if ( width < 0 ) element.attr( "x", moveX );
					if ( height < 0 ) element.attr( "y", moveY );
					element.attr( "width", Math.abs( width ) )
						 .attr( "height", Math.abs( height ) );
					break;
				case "text":
				  	// No resizing of text, just ignore the event
					break;
				default: //	"move"
					if ( self.multiSelect ) {
						if ( width < 0 ) self.multiSelect.attr( "x", moveX );
						if ( height < 0 ) self.multiSelect.attr( "y", moveY );
						self.multiSelect.attr( "width", Math.abs( width ) )
							 			.attr( "height", Math.abs( height ) );
					}
			}
		}
		EventHandler( self, "after_change" );
	}

	function OnMouseUp( e ) {
		var elem = $( e.delegateTarget );
		var self = elem.parent().data( "RaphBoard" );

		self.mouseUpX = e.pageX - self.left();
		self.mouseUpY = e.pageY - self.top() - ( self.toolBar ? self.toolBar.height() : 0 );

		if ( EventHandler( self, "before_end" ) ) {
			switch ( self._mode ) {
			case "cut":
			case "text":
				break;
			case "move":
				if ( self.multiSelect ) {
					var BBox = self.multiSelect.getBBox();
					self.multiSelect.remove();
					self.multiSelect = null;

					if ( BBox.width !== 0 && BBox.height !== 0 ) {
						self.elements.map(function( element ) {
							if ( Raphael.isBBoxIntersect( BBox, element.getBBox() ) ) {
								SelectElement( self, element );
							}
						});
					}
				}
				SetModeEvents( self );
				break;
			default:
				var elements = self.elements;
				element = elements.pop();
				var BBox = element.getBBox();

				if ( BBox.width == 0 && BBox.height == 0 ) {
					element.remove();
				} else {
					elements.push( element );
					PushToBuffer( self, self._mode, element );
				}
			}

			if ( self._mode != "text" && self._mode != "cut" ) {
				elem.unbind( "mousemove" )
					.unbind( "mouseup" );
			}
		}

		EventHandler( self, "after_end" );
	}

	function OnMouseLeave( e ) {
		e.stopPropagation();
		var elem = $( e.delegateTarget );

		elem.unbind( "mouseleave" )
			.removeClass( "cursor-*" );
		var self = elem.parent().data( "RaphBoard" );
		if ( self._mode != "cut" ) elem.unbind( "mousedown" );

		elem.mouseenter( OnMouseEnter );
	}

	// Shape Drawing Functions
	function PreviousShapeInBuffer( buffer, id ) {
		for ( var i=buffer.length-1;i>=0;i-- ) {
			var prev = buffer[i].element;
			if ( prev.id == id ) {
				return prev;
			}
		}
		return null;
	}

	function PushToBuffer( self, mode, element ) {
		var element = {
			command		: mode,
			element		: CloneElement( self, element )
		};

		self.undoBuffer.push( element );

		switch ( mode ) {
		case "cut":
		case "clear":
		case "move":
		case "modify":
		case "transform":
			break;
		default:
			self.clearRedo();
		}
	}

	function SetFreeTransformAttrs( self, element, attrs ) {
		var unplug = false;

		var ft = element.freeTransform;
		if ( !ft ) {
			unplug = true;
			ft = self.paper.freeTransform( element ).setOpts({
				animate: self.options.animation
			});
		}

		ft.attrs = JSON.parse( JSON.stringify( attrs ) );
		ft.apply();

		if ( unplug ) {
			ft.unplug();
		}

		return element;
	}

	function GetFreeTransformAttrs( self, element ) {
		var attrs;
		var unplug = false;

		var ft = element.freeTransform;
		if ( !ft ) {
			unplug = true;
			ft = self.paper.freeTransform( element );
		}

		attrs = JSON.parse( JSON.stringify( ft.attrs ) );

		if ( unplug ) {
			ft.unplug();
		}

		return attrs;
	}

	function CloneElement( self, element ) {
		var clone = {
			data : {
				ft: {
					attrs: GetFreeTransformAttrs( self, element )
				}
			},
			id			: element.id,
			type		: element.type,
			attrs		: JSON.parse( JSON.stringify( element.attrs ) ),
			transform	: element.matrix.toTransformString()
		};

		// Prevent freeTransform errors
		delete clone.attrs.transform;

		return clone;
	}

	function StartLine( self, x1, y1 ) {
		var element = self.paper.path( "M" + x1 + " " + y1 );

		if ( self.options.strokeWidth == 0 ) {
			self.options.stroke = self.options.fill;
			self.options.strokeWidth = 1;
		}
		element.attr({
			"stroke"			: self.options.stroke,
			"stroke-width"		: self.options.strokeWidth,
			"stroke-linecap"	: self.options.lineCap,
			"stroke-linejoin"	: self.options.lineJoin
		});

		return element;
	}

	function StartCircle( self, x, y ) {
		var element = self.paper.circle( x, y, 0 );

		element.attr({
			"fill"				: self.options.fill,
			"stroke"			: self.options.stroke,
			"stroke-width"		: self.options.strokeWidth,
			"stroke-linecap"	: self.options.lineCap,
			"stroke-linejoin"	: self.options.lineJoin
		});

		return element;
	}

	function StartEllipse( self, x, y ) {
		var element = self.paper.ellipse( x, y, 0, 0 );

		element.attr({
			"fill"				: self.options.fill,
			"stroke"			: self.options.stroke,
			"stroke-width"		: self.options.strokeWidth,
			"stroke-linecap"	: self.options.lineCap,
			"stroke-linejoin"	: self.options.lineJoin
		});

		return element;
	}

	function StartRectangle( self, x, y ) {
		var element = self.paper.rect( x, y, 0, 0 );

		element.attr({
			"fill"				: self.options.fill,
			"stroke"			: self.options.stroke,
			"stroke-width"		: self.options.strokeWidth,
			"stroke-linecap"	: self.options.lineCap,
			"stroke-linejoin"	: "miter"
		});

		return element;
	}

	function GetText( self, x, y ) {
		var text = prompt(
			"Please enter text:\n" +
			"Optionally, you can specify text size by\n" +
			"prepending text size as number enclosed in {}",
			"{" + self.options.fontSize + "}Write some text here..."
		);

		// Expects text in format "{fontSize}text"; "{fontSize}" is optional
		if ( text && text != "" ) {
			var size = self.options.fontSize;
			if ( text[0] == "{" ) {
				size = text.substring( 1, text.indexOf( "}" ) );
				text = text.substring( text.indexOf( "}" ) + 1 );
			}
			return self.text( x, y, text, size );
		}
	}

	function DrawText( self, x, y, text ) {
		var element = self.paper.text( x, y, text );
		var o = self.options;

		element.attr({
			"fill"				: o.fill,
			"stroke"			: o.stroke,
			"stroke-width"		: o.strokeWidth,
			"stroke-linecap"	: o.lineCap,
			"stroke-linejoin"	: o.lineJoin,
			"font-size"			: o.fontSize
		});
		if ( o.font ) element.attr({ "font"							: '"' + o.fontSize + 'px "' + o.font + '"' });
		if ( o.fontFamily ) element.attr({ "font-family"			: o.fontFamily });
		if ( o.fontStyle ) element.attr({ "font-style"				: o.fontStyle });
		if ( o.fontWeight ) element.attr({ "font-weight"			: o.fontWeight });
		if ( o.textAnchor ) element.attr({ "text-anchor"			: o.textAnchor });
		if ( o.textDecoration ) element.attr({ "text-decoration"	: o.textDecoration });

		return element;
	}

	function Draw( self, element ) {
		var el;
		var id;
		var elements = self.elements;
		var a = element.attrs;

		switch( element.type ) {		// "pen|line|arrow|circle|ellipse|rect|text"
			case "circle":
				el = self.paper.circle( a.cx, a.cy, a.r );
				break;
			case "ellipse":
				el = self.paper.ellipse( a.cx, a.cy, a.rx, a.ry );
				break;
			case "rect":
				el = self.paper.rect( a.x, a.y, a.width, a.height );
				break;
			case "text":
				el = self.paper.text( a.x, a.y, a.text );
				break;
			default:				// "pen|line|arrow" and other yet unknown
				el = self.paper.path( "" );
		}
		el.id = element.id;
		// NOTE: Unfortunately, we need this hack as well!
		el.node.raphaelid = element.id;

		el.attr( a );
		el.transform( element.transform );

		for ( var i=elements.length-1;i>=0;i-- ) {
			if ( el.id > elements[i].id ) {
				id = elements[i].id;
				break;
			}
		}
		if ( id ) {
			el.insertAfter( self.paper.getById( id ) );
			elements.splice( i + 1, 0, el );
		} else {
			elements.push( el );
		}

		return el;
	}

})( jQuery, window, document );
