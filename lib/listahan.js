// Generated by CoffeeScript 1.3.3
(function() {

  $.fn.listahan = function(optionsOrMethod) {
    var $menu, $root, $submenus, hideMenus, menuTimeout, options, parents;
    if (typeof optionsOrMethod === 'string') {
      this.each(function() {
        return $(this).trigger(optionsOrMethod + '.listahan');
      });
    }
    options = $.extend({
      $parent: $(window),
      root: 0,
      showDelay: 250,
      distance: 0,
      submenuClass: 'submenu',
      menuInit: function($menu) {},
      menuOpen: function($menu) {},
      menuItemAdd: function(item, $submenu, $submenus) {
        $(this).text(item.title);
      },
      menuItemActive: function(item, $submenu, $submenus) {},
      menuItemClick: function(item, $submenu, $submenus, e) {}
    }, optionsOrMethod);
    $menu = $(this);
    $submenus = {};
    parents = [];
    menuTimeout = null;
    hideMenus = function(parent) {
      return $('li', $submenus[parent]).each(function() {
        var $el, itemID;
        $el = $(this).removeClass('active');
        itemID = $el.attr('id');
        if ($submenus[itemID]) {
          $submenus[itemID].hide();
          return hideMenus(itemID);
        }
      });
    };
    $.each(options.menu, function(i, item) {
      return parents.push(item.parent);
    });
    $.each(options.menu, function(i, item) {
      var $menuItem, $submenu, menuItemAdd;
      $submenu = $submenus[item.parent] = $submenus[item.parent] || $('<ul/>').addClass(options.submenuClass);
      if ($.inArray(item.id, parents) > 0) {
        item.hasChildren = true;
      }
      $menuItem = $('<li/>').attr('id', item.id).attr('parent', item.parent).on('mouseenter', function(e) {
        var $el, menuItemActive, parent;
        clearTimeout(menuTimeout);
        $el = $(this);
        menuItemActive = $.proxy(options.menuItemActive, this);
        parent = item.parent;
        while (parent != null) {
          $el.siblings().removeClass('active');
          parent = $('li#' + parent, $menu).addClass('active').attr('parent');
        }
        menuTimeout = setTimeout((function() {
          var botOverflow, left, outerHeight, overflow, parentLeft, parentOffset, parentTop, rightOverflow, submenuBorderBot, submenuBorderTop, top, topOverflow;
          hideMenus(item.parent);
          $submenu = $submenus[item.id];
          if ($submenu && !$submenu.is(':visible')) {
            $submenu.css({
              position: 'absolute',
              overflowY: 'hidden',
              height: 'auto'
            }).removeClass('left').appendTo($menu).show();
            parentOffset = options.$parent.offset();
            if (parentOffset) {
              parentTop = parentOffset.top;
              parentLeft = parentOffset.left;
            } else {
              parentTop = options.$parent.scrollTop();
              parentLeft = options.$parent.scrollLeft();
            }
            if ($el.parents('ul').hasClass('left')) {
              left = $el.offset().left - $submenu.outerWidth() - options.distance;
            } else {
              left = $el.offset().left + $el.outerWidth() + options.distance;
            }
            $submenu.offset({
              left: left
            });
            rightOverflow = $submenu.offset().left + $submenu.outerWidth() - parentLeft - options.$parent.width();
            if (rightOverflow > 0) {
              $submenu.addClass('left').offset({
                left: $el.offset().left - $submenu.outerWidth()
              });
            }
            submenuBorderTop = parseInt($submenu.css('border-top-width'), 10);
            submenuBorderBot = parseInt($submenu.css('border-bottom-width'), 10);
            top = $el.offset().top - submenuBorderTop;
            outerHeight = $el.outerHeight();
            $submenu.offset({
              top: top
            });
            overflow = null;
            topOverflow = null;
            botOverflow = $submenu.offset().top + $submenu.outerHeight() - (parentTop + options.$parent.outerHeight());
            if (botOverflow > 0) {
              $submenu.offset({
                top: top + outerHeight - $submenu.outerHeight()
              });
              topOverflow = parentTop - $submenu.offset().top;
              if (topOverflow > botOverflow) {
                overflow = botOverflow;
                $submenu.offset({
                  top: top
                });
              } else if (topOverflow > 0) {
                overflow = topOverflow;
                $submenu.offset({
                  top: $submenu.offset().top + overflow
                });
              }
              if (topOverflow > 0 && botOverflow > 0) {
                $submenu.height($submenu.outerHeight() - overflow).css('overflow-y', 'scroll');
              }
            }
          }
          menuItemActive(item, $submenu, $submenus);
        }), options.showDelay);
      }).on('click', function(e) {
        var menuItemClick;
        menuItemClick = $.proxy(options.menuItemClick, this);
        menuItemClick(item, $submenu, $submenus, e);
      }).appendTo($submenu);
      menuItemAdd = $.proxy(options.menuItemAdd, $menuItem);
      menuItemAdd(item, $submenu, $submenus);
    });
    $menu.css('position', 'absolute').hide();
    $root = $submenus[options.root].css('position', 'absolute');
    options.menuInit($menu);
    return $menu.on('show.listahan', function(e) {
      var menuOpen;
      $menu.show();
      hideMenus(options.root);
      menuOpen = $.proxy(options.menuOpen, this);
      menuOpen($menu);
      if (!$root.is(':visible')) {
        $menu.append($root);
      }
    }).on('hide.listahan', function(e) {
      $menu.hide();
    });
  };

}).call(this);