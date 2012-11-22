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
                .appendTo($menu)
                .show()

            # Remove existing active classes
            $('li', $submenu).removeClass("active")

            # Get parent attributes
            parentOffset = options.$parent.offset()
            if parentOffset
                parentTop = parentOffset.top
                parentLeft = parentOffset.left
            else
                parentTop = options.$parent.scrollTop()
                parentLeft = options.$parent.scrollLeft()
            parentWidth = options.$parent.outerWidth()
            parentHeight = options.$parent.outerHeight()

            # Submenu attributes
            smBorderTop = parseInt $submenu.css("border-top-width"), 10
            smBorderBottom = parseInt $submenu.css("border-bottom-width"), 10
            smLeft = $submenu.offset().left
            smWidth = $submenu.outerWidth()
            smHeight = $submenu.outerHeight()

            # Item
            itemTop = $item.offset().top - smBorderTop
            itemLeft = $item.offset().left
            itemWidth = $item.outerWidth()
            itemHeight = $item.outerHeight()

            alignLeft = ->
                $submenu
                    .removeClass("left")
                    .offset(left: itemLeft + itemWidth + options.distance)
                return

            alignRight = ->
                $submenu
                    .addClass("left")
                    .offset(left: itemLeft - smWidth - options.distance)
                return

            # Check menu direction
            if $item.parents("ul").hasClass("left")
                # Going left
                alignRight()
                # TODO: Check left overflow
            else
                # Try to show aligned left
                alignLeft()
                # Check if there's right overflow
                rightOverflow = smLeft + smWidth - parentLeft - parentWidth
                if rightOverflow > 0
                    # Align right if there is
                    alignRight()

            # Try to show aligned top
            $submenu.offset
                top: itemTop

            # Check bottom overflow
            botOverflow = itemTop + smHeight - parentTop - parentHeight
            if botOverflow > 0
                # Check top overflow if bottom aligned
                # If overflows at top too, use w/e is less
                botAlignedTop = itemTop + itemHeight + smBorderTop + smBorderBottom - smHeight
                topOverflow = parentTop - botAlignedTop

                yOverflow = 0

                if topOverflow > botOverflow
                    # Bottom shows more so do top aligned
                    yOverflow = botOverflow
                    $submenu.offset
                        top: itemTop

                else
                    # Else do bottom aligned
                    if topOverflow > 0
                        yOverflow = topOverflow
                    $submenu.offset
                        top: botAlignedTop - yOverflow

                # Adjust height according to remaining height
                if yOverflow > 0
                    $submenu
                        .height(smHeight - yOverflow)
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