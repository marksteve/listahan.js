(function($) {

$.fn.listahan = function(optionsOrMethod) {
    // Method call
    if (typeof optionsOrMethod == 'string') {
        return this.each(function() {
            $(this).trigger(optionsOrMethod + '.listahan');
        });
    }

    var options = $.extend({
        $container: $('<div/>').attr('id', 'listahan'),
        root: 0,
        showDelay: 250,
        distance: 0,
        submenuClass: 'submenu',
        menuOpen: function($container) {
        },
        menuItemHTML: function(item, $submenu, $submenus) {
            return item.title;
        },
        menuItemActive: function(item, $submenu, $submenus) {
        },
        menuItemClick: function(item, $submenu, $submenus, e) {
        }
    }, optionsOrMethod);

    var $submenus = {};
    var parents = [];
    var menuTimeout;

    var hideMenus = function(parent) {
        $('li', $submenus[parent])
            .each(function() {
                var $el = $(this).removeClass('active');
                var itemID = $el.attr('id');
                if ($submenus[itemID]) {
                    $submenus[itemID].hide();
                    hideMenus(itemID);
                }
            });
    }

    // Get parents
    $.each(options.data, function(i, item) {
        parents.push(item.parent);
    });

    // Create submenus
    $.each(options.data, function(i, item) {
        var $submenu;
        $submenu = $submenus[item.parent] = $submenus[item.parent] || $('<ul/>').addClass(options.submenuClass);
        if ($.inArray(item.id, parents) > 0) {
            item.hasChildren = true;
        }
        $('<li/>')
            .attr('id', item.id)
            .attr('parent', item.parent)
            .html(function() {
                var menuItemHTML = $.proxy(options.menuItemHTML, this);
                return menuItemHTML(item, $submenu, $submenus);
            })
            .on('mouseenter', function(e) {
                clearTimeout(menuTimeout);
                var $el = $(this);
                // Setup menu item active callback
                var menuItemActive = $.proxy(options.menuItemActive, this);
                // Highlight menu items
                var parent = item.parent;
                while (typeof parent != 'undefined') {
                    $el.siblings().removeClass('active');
                    parent = $('li#' + parent)
                        .addClass('active')
                        .attr('parent');
                }
                menuTimeout = setTimeout(function() {
                    // Hide submenus of higher level
                    hideMenus(item.parent);
                    // Show submenu
                    var $submenu = $submenus[item.id];
                    if ($submenu && !$submenu.is(':visible')) {
                        $submenu
                            .css({
                                position: 'absolute',
                                overflowY: 'hidden',
                                height: 'auto'
                            })
                            .appendTo(options.$container)
                            .show();
                        var top = $el.offset().top - parseInt($submenu.css('border-top-width'), 10);
                        var outerHeight = $el.outerHeight();
                        // Try to show aligned top
                        $submenu
                            .offset({
                                top: top,
                                left: $el.offset().left + $el.outerWidth() + options.distance
                            });
                        var overflow;
                        var topOverflow;
                        var botOverflow = $submenu.offset().top + $submenu.outerHeight() - $(window).height();
                        if (botOverflow > 0) {
                            // If bottom overflows, try to show aligned bottom
                            $submenu.offset({
                                top: top + outerHeight + parseInt($submenu.css('border-top-width'), 10) - $submenu.outerHeight()
                            });
                            topOverflow = 0 - $submenu.offset().top;
                            // If top overflows too, use w/e is less
                            if (topOverflow > botOverflow) {
                                overflow = botOverflow;
                                // Bottom shows more so revert top aligned top
                                $submenu.offset({
                                    top: top
                                });
                            } else if (topOverflow > 0) {
                                overflow = topOverflow;
                                // Adjust considering overflow
                                $submenu.offset({
                                    top: $submenu.offset().top + overflow
                                });
                            }
                            // Adjust height according to remaining height
                            if (topOverflow > 0 && botOverflow > 0) {
                                $submenu
                                    .height($submenu.height() - overflow)
                                    .css('overflow-y', 'scroll');
                            }
                        }
                    }
                    // Menu item active callback
                    menuItemActive(item, $submenu, $submenus);
                }, options.showDelay);
            })
            .on('click', function(e) {
                // Menu item click callback
                e.stopPropagation();
                var menuItemClick = $.proxy(options.menuItemClick, this);
                menuItemClick(item, $submenu, $submenus, e);
            })
            .appendTo($submenu);
    });

    // Insert container
    $('body').append(
        options.$container
            .css('position', 'absolute')
            .hide()
    );

    // Root menu
    var $root = $submenus[options.root]
        .css('position', 'absolute');

    return this.each(function() {
        $(this)
            .on('show.listahan', function(e) {
                if (!$root.is(':visible')) {
                    // Hide previously shown submenus
                    hideMenus(options.root);
                    // Show root menu
                    options.$container
                        .append($root)
                        .show();
                    // Menu open callback
                    options.menuOpen(options.$container);
                }
            })
            .on('hide.listahan', function(e) {
                // Hide container
                options.$container.hide();
            });
    });

};

})(jQuery);