// Shim for IE (getElementsByClassName not supported)
if (!document.getElementsByClassName) {
	var indexOf = [].indexOf || function(prop) {
		for (var i = 0; i < this.length; i++) {
			if (this[i] === prop) return i;
		}
		return -1;
	};
	getElementsByClassName = function(className, context) {
		var elems = document.querySelectorAll ? context.querySelectorAll("." + className) : (function() {
			var all = context.getElementsByTagName("*"),
				elements = [],
				i = 0;
			for (; i < all.length; i++) {
				if (all[i].className && (" " + all[i].className + " ").indexOf(" " + className + " ") > -1 && indexOf.call(elements, all[i]) === -1) elements.push(all[i]);
			}
			return elements;
		})();
		return elems;
	};
	document.getElementsByClassName = function(className) {
		return getElementsByClassName(className, document);
	};

	if(Element) {
		Element.prototype.getElementsByClassName = function(className) {
			return getElementsByClassName(className, this);
		};
	}
}

(function(window) {
  var dom = {
	  console: window.console,
	  document: window.document,
	  classNameTests: {},
	  debug: function(message) {
		//this.console.debug(message);
	  },
	  info: function(message) {
		this.console.info(message);
	  },
	  error: function(message) {
		this.console.error(message);
	  },
	  isString: function(obj) {
		return ({}).toString.call(obj) === '[object String]';
	  },
	  isArray: function(obj) {
		return ({}).toString.call(obj) === "[object Array]";
	  },
	  isFunction: function(obj) {
		return ({}).toString.call(obj) === "[object Function]";
	  },
	  createElem: function(parentElem, name, attribs, value, nextElem) {
		var elem = this.document.createElement(name);
		this.configElem(elem, attribs, value);

		if (parentElem !== null) {
			if (nextElem === undefined) {
			  parentElem.appendChild(elem);
			} else {
			  parentElem.insertBefore(elem, nextElem);
			}
		}
		return elem;
	  },
	  createElemHtml: function(name, attribs, value) {
		var elem = this.document.createElement(name);
		this.configElem(elem, attribs, value);
		return elem.innerHTML;
	  },
	  configElem: function(elem, attribs, value) {
		var propValue, prop, type;
		type = typeof value;
		for (prop in attribs) {
		  if (attribs.hasOwnProperty(prop)) {
			propValue = attribs[prop];
			if (this.isFunction(propValue)) {
			  elem[prop] = propValue;
			} else {
			  elem.setAttribute(prop, propValue);
			}
		  }
		}
		if (type !== 'undefined') {
			$(elem).html(value);
		} else {
			$(elem).html('');
		}
	  },
	  getElemByClass: function(clsName) {
		var elems = this.document.getElementsByClassName(clsName),
		elem = null;
		if (elems.length > 1) {
		  this.error("Found more than one element for class id " + clsName);
		}
		if (elems.length > 0) {
		  elem = elems[0];
		}
		return elem;
	  },
	  getFirstChildElem: function(parentElem, name) {
		var nodeList = parentElem.childNodes, node, i;
		for (i = 0; i < nodeList.length; i += 1) {
		  node = nodeList[i];
		  if (node.nodeName === name) {
			return node;
		  }
		}
		return null;
	  },
	  hasClass: function(elem, cls) {
		if (elem) {
			if (!elem.className) {
			  return false;
			}
			var test = new RegExp("(?:^|\\s+)" + cls + "(?:\\s+|$)", 'g');
			return test.test(elem.className);
		}

		return false;
	  },
	  addClass: function(elem, cls) {
		if (!this.hasClass(elem, cls)) {
			if (elem) {
				elem.className = elem.className ? [elem.className, cls].join(' ') : cls;
			}
		}
	  },
	  removeClass: function(elem, cls) {
		if (this.hasClass(elem, cls)) {
		  var test = new RegExp("(?:^|\\s+)" + cls + "(?:\\s+|$)", 'g'),
			tmp = elem.className;
		  elem.className = tmp.replace(test, ' ');
		}
	  }
	},
	p = {
	  MENU: {
		USER: 'UserHeader',
		NAV: 'NavHeader',
		GNAV: 'GlobalNavHeader'
	  },
	  menuList: {},
	  baseItemClass: 'menuItem',
	  baseListClass: 'List',
	  lastMenuId: 0,
	  error: function(message) {
		dom.error(message);
	  },
	  userLocale: 'en',
	  setUserLocale: function(loc) {
		var p = this;
		p.userLocale = loc.substring(0, 2) || 'en';
	  },
	  portalLocales: {
		en: {
		  myProfile: "My Profile",
		  loggedInAs: "Logged in as:",
		  memberOf: "Member of:",
		  logout: "Log out",
		  changePassword: "Change Password",
		  currentTenantDecoration: "{0} (current)",
		  navHome: "Home",
		  sysNotification: "System Notifications",
		  noServices: "There are no services to display.",
		  navPlatform: "Platform Home",
		  navTenantAdmin: "Tenant Admin",
		  navUserAdmin: "User Admin",
		  myServices: "My Services",
		  myTenants: "My Tenants",
		  moreLink: "more",
		  updateLogo: "Update Tenant Logo"
		}
	  },
	  getLocaleString: function(key, args) {
		var p = this, str, loc, i;
		loc = p.portalLocales[p.userLocale];
		str = loc[key];
		if (args && args.length > 0) {
		  for (i = 0; i < args.length; i += 1) {
			str = str.replace("{" + (i) + "}", args[i]);
		  }
		}
		return str;
	  },
	  storeMenu: function(menu) {
		this.menuList[menu.id] = menu;
	  },
	  getMenu: function(id) {
		return this.menuList[id];
	  },
	  getMenuElem: function(menuId) {
		return dom.getElemByClass(this.baseItemClass + menuId);
	  },
	  getParentMenuItem: function(parentId) {
		return dom.getElemByClass(this.baseItemClass + parentId);
	  },
	  getParentMenuItemList: function(parentId) {
		return dom.getElemByClass(this.baseItemClass + parentId + this.baseListClass);
	  },
	  createMenuItemList: function(parentId) {
		var listElem,
		  parentDiv = this.getMenuElem(parentId);
		listElem = dom.createElem(parentDiv, 'ul', {
		  'class': this.baseItemClass + parentId + this.baseListClass
		});
		return listElem;
	  },
	  createMenuItem: function(parentId, parentDiv, menuData, nextElem) {
		var p = this, attribs, itemDiv, classNames, hasChildren, list, parentElem, parentMenu, i;
		if (!menuData.id) {
		  p.lastMenuId += 1;
		  menuData.id = (p.lastMenuId).toString();
		}
		if (!menuData.parent) {
		  menuData.parent = this.getMenu(parentId);
		}
		p.storeMenu(menuData);
		classNames = [];
		if (menuData.children && menuData.children.length > 0) {
		  classNames.push('has-sub');
		  hasChildren = true;
		}
		if (menuData.type === 'heading') {
		  classNames.push('menuHeading');
		}
		if (menuData.type === 'separator') {
		  classNames.push('menuSeparator');
		}
		if (menuData.type === 'login') {
		  classNames.push('loginName');
		}
		if (menuData.type === 'service') {
		  classNames.push('service');
		}
		if (menuData.type === 'tenant') {
		  classNames.push('tenant');
		}
		classNames.push(p.baseItemClass);
		classNames.push(p.baseItemClass + menuData.id);
		attribs = {
		  'class': classNames.join(' '),
		  onclick: function(event) {
			p.itemClick(menuData.id, event);
		  },
		  onmouseenter: function(event) {
			p.itemEnter(menuData.id, event);
		  },
		  onmouseleave: function(event) {
			p.itemLeave(menuData.id, event);
		  }
		};
		itemDiv = dom.createElem(parentDiv, 'li', attribs, '', nextElem);
		parentMenu = p.getMenu(parentId);
		parentElem = p.getParentMenuItem(parentId);
		if (parentElem) {
		  if (!parentMenu.isRoot && !dom.hasClass(parentElem, 'has-sub')) {
			dom.addClass(parentElem, 'has-sub');
		  }
		}
		if (parentMenu && parentMenu.isRoot) {
		  if (menuData.icon) {
			dom.createElem(itemDiv, 'img', {
			  src: menuData.icon,
			  'class': 'menuIcon'
			});
		  } else {
			dom.createElem(itemDiv, 'div', {
			  'class': 'menuIcon'
			});
		  }
		}
		if (menuData.href) {
		  dom.createElem(itemDiv, 'a', {
			href: menuData.href,
			target: menuData.target || ''
		  }, menuData.title);
		} else {
		  dom.createElem(itemDiv, 'a', {
			'class': 'text'
		  }, menuData.title);
		}
		if (hasChildren) {
		  list = dom.createElem(itemDiv, 'ul', {
			'class': p.baseItemClass + menuData.id + p.baseListClass
		  });
		  for (i = 0; i < menuData.children.length; i += 1) {
			this.createMenuItem(menuData.id, list, menuData.children[i]);
		  }
		}
		return true;
	  },
	  updateMenu: function(menuData) {
		var itemDiv = this.getMenuElem(menuData.id), anchorElem;
		if (itemDiv) {
		  anchorElem = dom.getFirstChildElem(itemDiv, 'A');
		  if (anchorElem) {
			dom.configElem(anchorElem, {
			  href: menuData.href,
			  target: menuData.target || ''
			}, menuData.title);
		  } else {
			dom.configElem(itemDiv, {}, menuData.title);
		  }
		}
		return true;
	  },
	  removeMenuElem: function(menuItemDiv) {
		if (menuItemDiv) {
			if (menuItemDiv.parentNode) {
			  menuItemDiv.parentNode.removeChild(menuItemDiv);
			}
		}
		return true;
	  },
	  isAncestor: function(first, second) {
		if (second) {
		  var parent = second.parent;
		  while (parent) {
			if (parent.id === first.id) {
			  return true;
			}
			parent = parent.parent;
		  }
		}
		return false;
	  },
	  setSelectedMenu: function(selectedMenuId) {
		var selectedMenu, menu, menuElem, nextlevel, menuId, i;
		selectedMenu = this.getMenu(selectedMenuId);
		for (menuId in this.menuList) {
		  if (this.menuList.hasOwnProperty(menuId)) {
			menu = this.menuList[menuId];
			if (menuId !== menu.id) {
			  dom.error("Menu ID mismatch for List ID: " + menuId + ", Object ID: " + menu.id);
			}
			if (menu.id === selectedMenuId) {
			  dom.info("Select menu (" + menu.id + ") " + menu.title);
			  menu.selected = true;
			  menuElem = this.getMenuElem(menuId);
			  dom.addClass(menuElem, 'selected');
			  if (menu.children && menu.children.length > 0) {
				for (i = 0; i < menu.children.length; i += 1) {
				  nextlevel = this.menuList[menu.children[i].id];
				  if (nextlevel && nextlevel.children && nextlevel.children.length > 0) {
					dom.addClass(this.getMenuElem(menu.children[i].id), 'nav-flyout-menuitem-parent');
				  } else {
					dom.addClass(this.getMenuElem(menu.children[i].id), 'nav-flyout-menuitem-placeholder');
				  }
				}
			  }
			} else {
			  if (menu.selected) {
				dom.info("De-select menu (" + menuId + ") " + menu.title);
				if (!this.isAncestor(menu, selectedMenu)) {
				  delete menu.selected;
				  menuElem = this.getMenuElem(menuId);
				  dom.removeClass(menuElem, 'selected');
				}
			  }
			}
		  }
		}
	  },
	  itemClick: function(menuId, event) {
		var e = event || window.event, menu;
		dom.debug("Clicked menu " + menuId);
		try {e.stopPropagation();} catch(e){}
		dom.removeClass(this.headerUserMenuElem, 'expanded');
		dom.removeClass(this.globalNavMenuElem, 'expanded');
		dom.removeClass(this.headerWrapperElem, "expanded");
		this.setSelectedMenu(menuId);
		menu = this.getMenu(menuId);
		if (menu.handler) {
		  if (!menu.handler.call(menu)) {
			this.closeAllMenus();
		  }
		}
		return true;
	  },
	  itemEnter: function(menuId, event) {
		var e = event || window.event;
		dom.debug("Entered menu " + menuId);
		try {e.stopPropagation();} catch(e){}
		return true;
	  },
	  itemLeave: function(menuId, event) {
		var e = event || window.event;
		try {e.stopPropagation();} catch(e){}
		dom.debug("Left menu " + menuId);
	  },
	  createHeader: function(headerElem, userContext) {
		var me = this, wrapper, globalNav, userBlock, caLogoAnchor, partnerLogo, userFullNameHtml, tenantNameHtml, gNavListElem, userListElem, appName, app,
		  appCnt = 0;
		dom.configElem(headerElem, {
		  'class': 'uisHeader'
		});
		dom.createElem(headerElem, 'div', {
		  'class': 'nav-btn',
		  onclick: function() {
			me.toggleNavMenu();
		  }
		});
		caLogoAnchor = dom.createElem(headerElem, 'a', {
		  href: '//www.ca.com',
		  target: '_blank'
		});
		dom.createElem(caLogoAnchor, 'div', {
		  'class': 'caLogo'
		});
		partnerLogo = dom.createElem(headerElem, 'div', {
		  'class': 'partnerLogo'
		});
		if (userContext.tenantLogoUrl !== undefined) {
		  dom.createElem(partnerLogo, 'img', {
			src: userContext.tenantLogoUrl
		  });
		}
		dom.createElem(headerElem, 'div', {
		  'class': 'title'
		}, this.appSpi.getPortalTitle ? this.appSpi.getPortalTitle() : '');
		dom.createElem(headerElem, 'div', {
		  'class': 'spaceContainer'
		});
		wrapper = dom.createElem(headerElem, 'div', {
		  'class': 'userNavWrapper'
		});
		p.headerWrapperElem = wrapper;
		globalNav = dom.createElem(wrapper, 'div', {
		  'class': 'globalNav',
		  onclick: function() {
			me.toggleGlobalNavMenu();
		  }
		});
		p.globalNavMenuElem = dom.createElem(globalNav, 'div', {
		  'class': 'headerMenu globalNavMenu'
		});
		for (appName in userContext.applications) {
		  if (userContext.applications.hasOwnProperty(appName)) {
			app = userContext.applications[appName];
			if (!app.isSystem && this.appSpi.getAppInstanceId() !== app.appInstanceId) {
			  appCnt = appCnt + 1;
			}
		  }
		}
		if (appCnt + userContext.altTenants.length > 4) {
		  gNavListElem = dom.createElem(p.globalNavMenuElem, 'ul', {
			'style': 'height:345px;overflow-y:scroll'
		  });
		} else {
		  gNavListElem = dom.createElem(p.globalNavMenuElem, 'ul', {});
		}
		p.createGlobalNavMenu(userContext, gNavListElem);
		dom.createElem(wrapper, 'div', {
		  'class': 'tbfill'
		});
		userBlock = dom.createElem(wrapper, 'div', {
		  'class': 'userBlock',
		  onclick: function() {
			me.toggleUserMenu();
		  }
		});
		//
		p.userTitleHeadElem = dom.createElem(userBlock, 'div', {
		  'class': 'userTitleBlock'
		});
		//
		//dom.createElem(p.userTitleHeadElem, 'img', { src: userContext.userAvatarUrl });

		dom.createElem(p.userTitleHeadElem, 'div',
		  {
			'class': 'userName',
			'style': 'background-image: url(' + userContext.userAvatarUrl + ');',
		  },
		  userContext.userFullName
		);
		p.headerUserMenuElem = dom.createElem(userBlock, 'div', {
		  'class': 'headerMenu uisUserMenu'
		});
		userListElem = dom.createElem(p.headerUserMenuElem, 'ul', {
		  'class': p.baseItemClass + this.MENU.USER
		});
		userFullNameHtml = dom.createElemHtml('span', {
		  'class': 'userFullName'
		}, p.getLocaleString('loggedInAs') + ' ' + userContext.userFullName);
		tenantNameHtml = dom.createElemHtml('span', {
		  'class': 'tenantName'
		}, p.getLocaleString('memberOf') + ' ' + userContext.tenantDisplayName);
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: userFullNameHtml,
		  type: 'login'
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: tenantNameHtml,
		  type: 'login'
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: '',
		  type: 'separator'
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: p.getLocaleString('myProfile'),
		  href: '#uis_aid:uisedltas,uis_pid:tas-myprofile'
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: p.getLocaleString('changePassword'),
		  handler: p.userChangePassword
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: p.getLocaleString('updateLogo'),
		  handler: p.updateTenantLogo
		});
		p.createMenuItem(this.MENU.USER, userListElem, {
		  title: p.getLocaleString('logout'),
		  href: userContext.logoutUrl
		});
	  },
	  createNavMenu: function(navMenuElem, contentElem) {
		var navMenuClass = 'uisMenu uisNavMenu',
		  navMenuInitialState = this.appSpi.getInitialState();
		if (navMenuInitialState.expanded) {
		  navMenuClass += ' expanded';
		} else {
		  navMenuClass += ' collapsed';
		}
		dom.configElem(navMenuElem, {
		  'class': navMenuClass
		});
		p.navMenuListElem = dom.createElem(navMenuElem, 'ul', {
		  'class': p.baseItemClass + this.MENU.NAV
		});
		if (navMenuInitialState.expanded) {
		  dom.addClass(contentElem, 'uisNavMenuExpanded');
		}
	  },
	  createGlobalNavMenu: function(userContext, menu) {
		var p = this, app, i, tenant, appName;
		/*p.createMenuItem(this.MENU.GNAV, menu, {
		  title: p.getLocaleString('navHome'),
		  href: '#uis_aid:uisportalservice,uis_pid:home',
		  icon: '../img/nav-home.png'
		});
		p.createMenuItem(this.MENU.GNAV, menu, {
		  title: p.getLocaleString('navUserAdmin'),
		  href: '#uis_aid:uisedltas,uis_pid:tas-users',
		  icon: '../img/user-admin.png'
		});
		p.createMenuItem(this.MENU.GNAV, menu, {
		  title: '',
		  type: 'separator'
		});
		p.createMenuItem(this.MENU.GNAV, menu, {
		  type: 'heading',
		  title: p.getLocaleString('myServices')
		});*/
		for (appName in userContext.applications) {
		  if (userContext.applications.hasOwnProperty(appName)) {
			app = userContext.applications[appName];
			if (!app.isSystem && this.appSpi.getAppInstanceId() !== app.appInstanceId) {
			  p.createMenuItem(this.MENU.GNAV, menu, {
				type: 'service',
				icon: '../img/service-30.png',
				title: app.appDisplayName,
				href: '#uis_aid:' + appName
			  });
			}
		  }
		}
		p.createMenuItem(this.MENU.GNAV, menu, {
		  title: '',
		  type: 'separator'
		});
		p.createMenuItem(this.MENU.GNAV, menu, {
		  type: 'heading',
		  title: p.getLocaleString('myTenants')
		});
		for (i = 0; i < userContext.altTenants.length; i += 1) {
		  tenant = userContext.altTenants[i];
		  p.createMenuItem(this.MENU.GNAV, menu, {
			type: 'tenant',
			title: tenant.displayName,
			href: '/ca-sass/servlet/' + tenant.id + '/uisportalservice/UI'
		  });
		}
	  },
	  toggleMenu: function(menuElem, menuId) {
		if (dom.hasClass(menuElem, 'expanded')) {
		  dom.removeClass(menuElem, 'expanded');
		  if (menuId === "userMenuToggle" && dom.hasClass(this.headerWrapperElem, 'expanded')) {
			dom.removeClass(this.headerWrapperElem, "expanded");
		  }
		} else {
		  dom.addClass(menuElem, 'expanded');
		  if (menuId === "userMenuToggle") {
			dom.addClass(this.headerWrapperElem, "expanded");
		  }
		}
	  },
	  toggleNavMenu: function() {
		var menuElem = this.navMenuElem,
		  spiFuncName = 'navMenuToggle';
		if (dom.hasClass(menuElem, 'expanded')) {
		  dom.removeClass(menuElem, 'expanded');
		  dom.addClass(menuElem, 'collapsed');
		  dom.removeClass(this.contentElem, 'uisNavMenuExpanded');
		  if (this.appSpi[spiFuncName]) {
			this.appSpi[spiFuncName](false);
		  }
		} else {
		  dom.removeClass(menuElem, 'collapsed');
		  dom.addClass(menuElem, 'expanded');
		  dom.addClass(this.contentElem, 'uisNavMenuExpanded');
		  if (this.appSpi[spiFuncName]) {
			this.appSpi[spiFuncName](true);
		  }
		}
	  },
	  toggleGlobalNavMenu: function() {
		this.closeUserMenu();
		this.closeNavMenu();
		this.toggleMenu(this.globalNavMenuElem, null, false);
	  },
	  toggleUserMenu: function() {
		this.closeGlobalNavMenu();
		this.closeNavMenu();
		this.toggleMenu(this.headerUserMenuElem, 'userMenuToggle', false);
	  },
	  closeUserMenu: function() {
		dom.removeClass(this.headerUserMenuElem, 'expanded');
		dom.addClass(this.headerUserMenuElem, 'collpased');
		dom.removeClass(this.headerWrapperElem, "expanded");
	  },
	  closeGlobalNavMenu: function() {
		dom.removeClass(this.globalNavMenuElem, 'expanded');
		dom.addClass(this.globalNavMenuElem, 'collapsed');
	  },
	  closeNavMenu: function() {
		this.setSelectedMenu(-1);
	  },
	  closeAllMenus: function() {
		this.closeUserMenu();
		this.closeGlobalNavMenu();
		this.closeNavMenu();
	  },
	  closeHeaderMenus: function(e) {
		try {
		  if (e.pageY && e.pageY > 60) {
			this.closeUserMenu();
			this.closeGlobalNavMenu();
		  }
		} catch (err) {
		  p.error("Couldn't close Header Menus");
		}
	  },
	  copyMenuData: function(arr) {
		var ret = [], myKey, item;
		for (myKey in arr) {
		  if (!arr.hasOwnProperty(myKey)) {
			continue;
		  }
		  item = arr[myKey];
		  if (item && item.children && item.children.length > 0) {
			item.children = this.copyMenuData(item.children);
		  }
		  ret[myKey] = item;
		}
		return ret;
	  },
	  sortFunc: function(a, b) {
		if (a.order === b.order) {
		  return 0;
		}
		if (a.order && (b.order === undefined)) {
		  return -1;
		}
		if (b.order && (a.order === undefined)) {
		  return 1;
		}
		if (a.order < b.order) {
		  return -1;
		}
		if (a.order > b.order) {
		  return 1;
		}
	  },
	  sortMenuData: function(arr) {
		var i, l;
		arr.sort(this.sortFunc);
		if (arr.length > 0) {
		  for (i = 0, l = arr.length; i < l; i += 1) {
			if (arr[i].children && arr[i].children.length > 0) {
			  this.sortMenuData(arr[i].children);
			}
		  }
		}
		return arr;
	  },
	  updateTenantLogo: function(menu) {
		p.info("Update tenant logo for " + menu.id);
	  },
	  userChangePassword: function(menu) {
		p.info("Collect the users's username and password, then post it to the Layer7 change password service." + menu.id);
	  }
	};
  window.portalNavUi = {
	MENU: p.MENU,
	loadLocales: function(locales) {
	  p.portalLocales = locales;
	},
	init: function(userContext, appSpi) {
	  var navMenuId = appSpi.getNavMenuContainer(),
		headerId = appSpi.getHeaderMenuContainer(),
		contentId = appSpi.getContentContainer(),
		headerElem = (dom.isString(headerId) ? dom.getElemByClass(headerId) : headerId),
		navMenuElem = (dom.isString(navMenuId) ? dom.getElemByClass(navMenuId) : navMenuId),
		contentElem = (dom.isString(contentId) ? dom.getElemByClass(contentId) : contentId);
	  p.appSpi = appSpi;
	  p.headerElem = headerElem;
	  p.navMenuElem = navMenuElem;
	  p.contentElem = contentElem;
	  p.setUserLocale(userContext.userLocale);
	  p.storeMenu({
		id: this.MENU.NAV,
		isRoot: true
	  });
	  p.storeMenu({
		id: this.MENU.USER,
		isRoot: true
	  });
	  p.storeMenu({
		id: this.MENU.GNAV,
		isRoot: true
	  });
	  p.createHeader(headerElem, userContext);
	  p.createNavMenu(navMenuElem, contentElem);
	  appSpi.onDismissMenus(p.closeAllMenus, p);
	  appSpi.initMenu(this);

	  this.stretchContentArea();
		if (window.addEventListener) {
			window.addEventListener("resize", this.stretchContentArea());
		}
	},
	stretchContentArea: function() {
	  /*

		  DISABLED ON 23rd JUNE BY SAM WHILLANCE (WHISA02)

		  var content = dom.getElemByClass('content');
		  content.style.height = document.documentElement.clientHeight + 'px';
	  */
	},
	getMenus: function(parentMenuId) {
	  var parentItem;
	  if (parentMenuId) {
		parentItem = p.getMenu(parentMenuId);
		if (parentItem) {
		  return parentItem.children;
		}
	  } else {
		return p.menuList;
	  }
	},
	getMenu: function(menuId) {
		return p.getMenu(menuId);
	},
	addMenu: function(menuItems, parentId) {
	  var parentMenu, parentDiv, newChildren, newChildrenCount, merged, menuItem, i;
	  if (!parentId) {
		p.error("Menu add failed: Parent menu ID required:" + parentId);
		return false;
	  }
	  parentMenu = p.getMenu(parentId);
	  if (!parentMenu) {
		p.error("Menu add failed: Invalid parent menu ID:" + parentId);
		return false;
	  }
	  if (parentMenu.isRoot) {
		parentDiv = p.getParentMenuItem(parentMenu.id);
	  } else {
		parentDiv = p.getParentMenuItemList(parentMenu.id);
	  }
	  if (!parentDiv) {
		parentDiv = p.createMenuItemList(parentMenu.id);
	  }
	  if (!dom.isArray(menuItems)) {
		menuItems = [menuItems];
	  }
	  if (!parentMenu.children) {
		parentMenu.children = [];
	  }
	  newChildren = p.copyMenuData(menuItems);
	  newChildren = p.sortMenuData(newChildren);
	  newChildrenCount = newChildren.length;
	  if (parentMenu.children.length === 0) {
		for (i = 0; i < newChildrenCount; i += 1) {
		  menuItem = newChildren[i];
		  if (menuItem.id && p.getMenu(menuItem.id)) {
			p.error("Cannot add menu with ID: " + menuItem.id + ". This ID is already in use.");
			continue;
		  }
		  menuItem.parent = parentMenu;
		  if (p.createMenuItem(parentMenu.id, parentDiv, menuItem)) {
			parentMenu.children.push(menuItem);
		  }
		}
	  } else {
		merged = parentMenu.children.concat(newChildren);
		merged = p.sortMenuData(merged);
		this.clearMenu(parentMenu.id);
		this.addMenu(merged, parentMenu.id);
	  }
	  return true;
	},
	updateMenu: function(menuItem) {
	  return p.updateMenu(menuItem);
	},
	removeMenu: function(menuId) {
	  var menuElem = p.getMenuElem(menuId),
		menuItem = p.getMenu(menuId), children, child, i, j, parentElem, parentElemList, removed;
	  removed = p.removeMenuElem(menuElem);
	  if (removed) {
		if (menuItem.parent) {
		  children = menuItem.parent.children;
		  for (i = 0; i < children.length; i += 1) {
			child = children[i];
			if (child.id === menuId) {
			  children.splice(i, 1);
			}
		  }
		}
		if (menuItem.parent.children.length === 0) {
		  parentElem = p.getParentMenuItem(menuItem.parent.id);
		  if (dom.hasClass(parentElem, 'has-sub')) {
			dom.removeClass(parentElem, 'has-sub');
			parentElemList = p.getParentMenuItemList(menuItem.parent.id);
			if (parentElemList) {
			  parentElem.removeChild(parentElemList);
			  if (menuItem.children && menuItem.children.length > 0) {
				for (j = 0; j < menuItem.children.length; j += 1) {
				  child = menuItem.children[j];
				  delete p.menuList[child.id];
				}
			  }
			}
		  }
		}
		delete p.menuList[menuId];
	  }
	  return removed;
	},
	clearMenu: function(parentMenuId) {
	  var parentItem, i, childItem, childCount, children, parentElem, parentElemList;
	  if (parentMenuId) {
		parentItem = p.getMenu(parentMenuId);
		if (parentItem && parentItem.children) {
		  children = p.copyMenuData(parentItem.children);
		  childCount = children.length;
		  for (i = 0; i < childCount; i += 1) {
			childItem = children[i];
			this.removeMenu(childItem.id);
		  }
		  parentElem = p.getParentMenuItem(parentMenuId);
		  if (dom.hasClass(parentElem, 'has-sub')) {
			dom.removeClass(parentElem, 'has-sub');
			parentElemList = p.getParentMenuItemList(parentMenuId);
			if (parentElemList) {
			  parentElem.removeChild(parentElemList);
			}
		  }
		}
	  } else {
		p.error("Menu remove failed: Invalid parent menu ID:" + parentMenuId);
	  }
	  return true;
	},
	setSelectedMenu: function(menuId) {
	  var menu = p.getMenu(menuId);
	  if (menu && menu.parent && !menu.parent.isRoot) {
		this.setSelectedMenu(menu.parent.id);
	  }
	  p.setSelectedMenu(menuId);
	},
	setCurrentSelectionIndicator: function(menuId) {
	  var menu = p.getMenu(menuId), i, menuElem;
	  if (menu && menu.parent && !menu.parent.isRoot) {
		this.setCurrentSelectionIndicator(menu.parent.id);
	  } else {
		menuElem = p.getMenuElem(menuId);
		if (menu) {
		  if (menu.parent) {
			for (i = 0; i < menu.parent.children.length; i += 1) {
			  dom.removeClass(p.getMenuElem(menu.parent.children[i].id), 'highlight');
			}
		  }
		  dom.addClass(menuElem, 'highlight');
		}
	  }
	}
  };
})(window);
