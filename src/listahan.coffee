$.fn.listahan = (optionsOrMethod, params...) ->
    # Method call
    if typeof optionsOrMethod == "string"
        @.each ->
            $(@).trigger optionsOrMethod + ".listahan", params
        return

    options = $.extend(
        $parent: $(window)
        root: 0
        showDelay: 250
        distance: 0
        submenuClass: "submenu"
        menuInit: ($menu) ->
            return
        menuOpen: ($menu) ->
            return
        menuItemAdd: (item, $submenu, $submenus) ->
            $(@).text item.title
            return
        menuItemParent: (item, $submenu, $submenus) ->
            return
        menuItemActive: (item, $submenu, $submenus) ->
            return
        menuItemClick: (item, $submenu, $submenus, e) ->
            return
    , optionsOrMethod)

    $menu = $(@)
    $submenus = {}

    hideMenus = (parent) ->
        $("li", $submenus[parent])
            .each( ->
                itemID = $(@).attr "id"
                if $submenus[itemID]
                    $submenus[itemID].hide()
                    hideMenus(itemID)
            )

    menuTimeout = null
    showMenu = (item, $item) ->
        # Show submenu
        $submenu = $submenus[item.id]
        if $submenu and !$submenu.is(":visible")
            $submenu
                .css(
                    position: "absolute"
                    overflowY: "hidden"
                    height: "auto"
                )
                .removeClass("left")
                .appendTo($menu)
                .show()

            # Remove existing active classes
            $('li', $submenu).removeClass("active")

            # Get parent offsets
            parentOffset = options.$parent.offset()
            if parentOffset
                parentTop = parentOffset.top
                parentLeft = parentOffset.left
            else
                parentTop = options.$parent.scrollTop()
                parentLeft = options.$parent.scrollLeft()

            if $item.parents("ul").hasClass("left")
                # Current one is already left
                left = $item.offset().left - $submenu.outerWidth() - options.distance
            else
                # Try to show aligned left
                left = $item.offset().left + $item.outerWidth() + options.distance
            $submenu.offset
                left: left
            # Check if there"s right overflow
            rightOverflow = $submenu.offset().left + $submenu.outerWidth() - parentLeft - options.$parent.width()
            if rightOverflow > 0
                # Align right if there is
                $submenu
                    .addClass("left")
                    .offset(left: $item.offset().left - $submenu.outerWidth())
            submenuBorderTop = parseInt $submenu.css("border-top-width"), 10
            submenuBorderBot = parseInt $submenu.css("border-bottom-width"), 10
            top = $item.offset().top - submenuBorderTop
            outerHeight = $item.outerHeight()

            # Try to show aligned top
            $submenu.offset
                top: top

            overflow = null
            topOverflow = null
            botOverflow = $submenu.offset().top + $submenu.outerHeight() - (parentTop + options.$parent.outerHeight())

            if botOverflow > 0
                # If bottom overflows, try to show aligned bottom
                $submenu.offset
                    top: top + outerHeight - $submenu.outerHeight()
                topOverflow = parentTop - $submenu.offset().top
                # If top overflows too, use w/e is less
                if topOverflow > botOverflow
                    overflow = botOverflow
                    # Bottom shows more so revert top aligned top
                    $submenu.offset
                        top: top
                else if topOverflow > 0
                    overflow = topOverflow
                    # Adjust considering overflow
                    $submenu.offset
                        top: $submenu.offset().top + overflow
                # Adjust height according to remaining height
                if topOverflow > 0 and botOverflow > 0
                    $submenu
                        .height($submenu.outerHeight() - overflow)
                        .css("overflow-y", "scroll")

    items = {}

    for item in options.menu
        items[item.id] = item

    addMenuItem = (item) ->
        items[item.id] = item
        $submenu = $submenus[item.parent]

        # New submenu
        unless $submenu
            $submenu = $submenus[item.parent] = $("<ul/>").addClass options.submenuClass

            # Get parent element for context
            parentItem = items[item.parent]
            parentSubmenu = parentItem?.parent or options.root
            $parentSubmenu = $submenus[parentSubmenu]
            $parentMenuItem = $("#" + item.parent, $submenus[parentSubmenu])

            # Proclaim parenthood!
            menuItemParent = $.proxy options.menuItemParent, $parentMenuItem
            menuItemParent parentItem or 'root', $parentSubmenu, $submenus

        $menuItem = $("<li/>")
            .attr("id", item.id)
            .data("item", item)
            .on("mouseenter", (e) ->
                clearTimeout(menuTimeout)
                $item = $(@)
                # Highlight menu items
                parent = item.parent
                while parent?
                    $item
                        .addClass("active")
                        .siblings()
                            .removeClass("active")
                    $parent = $("li#" + parent, $menu)
                        .addClass("active")
                    parent = if $parent.size() then $parent.data("item").parent else null
                # Set active item
                $menu.data "active", $item.attr("id")
                # Setup menu item active callback
                menuItemActive = $.proxy options.menuItemActive, @
                # Delay showing of menu
                menuTimeout = setTimeout (->
                    # Hide submenus of higher level
                    hideMenus item.parent
                    # Show submenu
                    showMenu item, $item
                    # Menu item active callback
                    menuItemActive item, $submenu, $submenus
                    return
                ), options.showDelay
                return
            )
            .on("click", (e) ->
                # Menu item click callback
                menuItemClick = $.proxy options.menuItemClick, @
                menuItemClick item, $submenu, $submenus, e
                return
            )
            .appendTo($submenu)

        # Menu item add callback
        menuItemAdd = $.proxy options.menuItemAdd, $menuItem
        menuItemAdd item, $submenu, $submenus

        return

    # Add menu items
    addMenuItem(item) for item in options.menu

    # Func to remove menu item recursively
    removeMenuItem = (item) ->
        # Remove item
        $("##{item.id}", $submenus[item.parent]).remove()
        # Then its submenus
        $submenu = $submenus[item.id]
        if $submenu?
            $("li", $submenu).each ->
                $item = $(@)
                removeMenuItem($item.data("item"))
                $item.remove()
            $submenu.remove()
        return

    # Hide menu initially
    $menu
        .css("position", "absolute")
        .hide()

    # Root menu
    $root = $submenus[options.root]
        .css("position", "absolute")

    # Bind data
    $menu.data('options', options)
    $menu.data('$submenus', $submenus)

    # Menu init callback
    options.menuInit $menu

    $menu
        .on("add.listahan", (e, item) ->
            addMenuItem item
            return
            )
        .on("remove.listahan", (e, item) ->
            removeMenuItem item
            return
            )
        .on("clear.listahan", (e, parent) ->
            if $submenus[parent]?
                $submenus[parent].empty()
            return
            )
        .on("show.listahan", (e) ->
            # Show menu
            $menu.show()
            # Hide previously shown submenus
            hideMenus options.root
            # Append root menu
            unless $root.is(":visible")
                $menu.append $root
            # Menu open callback
            menuOpen = $.proxy options.menuOpen, @
            menuOpen $menu
            # Keyboard events
            ["up", "down", "left", "right"].forEach (dir) ->
                Mousetrap.bind dir, (e) ->
                    e.preventDefault()
                    $menu.trigger dir + ".listahan"
                    return
            return
            )
        .on("hide.listahan", (e) ->
            # Hide menu
            $menu.hide()
            # Remove keyboard events
            ["up", "down", "left", "right"].forEach (dir) ->
                Mousetrap.unbind dir
                return
            return
            )
        .on("up.listahan", (e) ->
            $item = $("#" + $menu.data("active"), $menu)
            $prev = $item.prev()
            if $prev.size()
                hideMenus $item.data("item").parent
                showMenu $prev.data("item"), $prev
                $prev.addClass("active").siblings().removeClass("active")
                $menu.data "active", $prev.attr("id")
            return
            )
        .on("down.listahan", (e) ->
            $item = $("#" + $menu.data("active"), $menu)
            if $item.size()
                $next = $item.next()
            else
                $next = $("li", $root).first()
            if $next.size()
                hideMenus $item.data("item").parent if $item.size()
                showMenu $next.data("item"), $next
                $next.addClass("active").siblings().removeClass("active")
                $menu.data "active", $next.attr("id")
            return
            )
        .on("left.listahan", (e) ->
            $item = $("#" + $menu.data("active"), $menu)
            item = $item.data("item")
            $prev = $("#" + item.parent, $menu)
            if $prev.size()
                hideMenus item.parent
                $prev.addClass("active")
                $submenus[item.parent].hide()
                $menu.data "active", $prev.attr("id")
            return
            )
        .on("right.listahan", (e) ->
            $item = $("#" + $menu.data("active"), $menu)
            item = $item.data("item")
            $submenu = $submenus[item.id]
            unless $submenu?
                return
            $next = $('li', $submenu).first()
            if $next.size()
                showMenu item, $item
                showMenu $next.data("item"), $next
                $next.addClass("active")
                $menu.data "active", $next.attr("id")
            return
            )