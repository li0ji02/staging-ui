(function(window) {

  window.appContextSpi = {

	getAppInstanceId: function() {
	  return '';
	},

	/* Return a string for the portal title. This should be the display name of the application. */
	getPortalTitle: function() {
	  return 'ca Securecenter Virtual Appliance'; //'Application Name';
	},

	/** Return the  Nav. menu class name (string) or Element. */
	getNavMenuContainer: function() {
	  return 'navigation';
	},

	/** Return the  Nav. menu class name (string) or Element. */
	getHeaderMenuContainer: function() {
	  return 'header';
	},

	/** Return the content container class name (string) or Element. */
	getContentContainer: function() {
	  return 'content';
	},

	/** Get default Icon URL. */
	getInitialState: function() {
	  return {
		expanded: false,
		showNavMenu: false
	  };
	},

	/** Invoked by the Nav UI when it's ready to receive menus from the app. */
	initMenu: function(navUi) {},

	/** Allow the Portal navigation to register for a notification when any open Nav. or Header menus should
	   be closed. This is generally caused by a click on the content area of the application, but making this
	   an event allows applications the freedom to define custom rules.
	 */
	onDismissMenus: function(handler, context) {
	  this.onDismissMenusHandler = function() { return handler.call(context); };
	  var me = this,
		contentElem = document.getElementsByClassName('content')[0];
	  contentElem.onclick = function() {
		if (me.onDismissMenusHandler) {
		  me.onDismissMenusHandler();
		}
	  };
	},

	/**
	  This is temporary method since the content area does not cover the whole empty space,
	  it should be removed after content area is properly implemented
	*/
	onDismissHeaderMenus: function(handler, context) {
	  this.onDismissMenusHandler = function(e) { return handler.call(context,e); };
	  var me = this;
	  document.body.onclick = function(e) {
		if (me.onDismissMenusHandler) {
		  me.onDismissMenusHandler(e);
		}
	  };
	},


	/*  (Optional)
	   Invoked when the expanded state of the Nav. menu is changed.
	  The 'uisNavMenuExpanded' class is also added and removed when the Nav. menu is expanded
	  and collapsed, so it can be used directly with CSS styling to resize the content area.
	*/
	navMenuToggle: function(expanded) {
	  //console.log("Portal nav menu " + (expanded ? "expanded" : "collapsed"));
	}

  };

})(window);
