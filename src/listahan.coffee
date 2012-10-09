$.fn.listahan = (optionsOrMethod) ->
    # Method call
    if typeof optionsOrMethod == "string"
        this.each ->
            $(this).trigger optionsOrMethod + ".listahan"

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
            $(this).text item.title
            return
        menuItemActive: (item, $submenu, $submenus) ->
            return
        menuItemClick: (item, $submenu, $submenus, e) ->
            return
    , optionsOrMethod)

    $menu = $(this)
    $submenus = {}
    parents = []
    menuTimeout = null

    hideMenus = (parent) ->
        $("li", $submenus[parent])
            .each( ->
                $el = $(this).removeClass "active"
                itemID = $el.attr "id"
                if $submenus[itemID]
                    $submenus[itemID].hide()
                    hideMenus(itemID)
            )

    # Get parents
    $.each options.menu, (i, item) ->
        parents.push item.parent

    # Create submenus
    $.each options.menu, (i, item) ->
        $submenu = $submenus[item.parent] = $submenus[item.parent] or $("<ul/>").addClass options.submenuClass
        if $.inArray(item.id, parents) > 0
            item.hasChildren = true
        $menuItem = $("<li/>")
            .attr("id", item.id)
            .attr("parent", item.parent)
            .on("mouseenter", (e) ->
                clearTimeout(menuTimeout)
                $el = $(this)
                # Setup menu item active callback
                menuItemActive = $.proxy options.menuItemActive, this
                # Highlight menu items
                parent = item.parent
                while parent?
                    $el.siblings().removeClass("active")
                    parent = $("li#" + parent, $menu)
                        .addClass("active")
                        .attr("parent")
                menuTimeout = setTimeout (->
                    # Hide submenus of higher level
                    hideMenus item.parent
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

                        # Get parent offsets
                        parentOffset = options.$parent.offset()
                        if parentOffset
                            parentTop = parentOffset.top
                            parentLeft = parentOffset.left
                        else
                            parentTop = options.$parent.scrollTop()
                            parentLeft = options.$parent.scrollLeft()

                        if $el.parents("ul").hasClass("left")
                            # Current one is already left
                            left = $el.offset().left - $submenu.outerWidth() - options.distance
                        else
                            # Try to show aligned left
                            left = $el.offset().left + $el.outerWidth() + options.distance
                        $submenu.offset
                            left: left
                        # Check if there"s right overflow
                        rightOverflow = $submenu.offset().left + $submenu.outerWidth() - parentLeft - options.$parent.width()
                        if rightOverflow > 0
                            # Align right if there is
                            $submenu
                                .addClass("left")
                                .offset(
                                    left: $el.offset().left - $submenu.outerWidth()
                                )

                        submenuBorderTop = parseInt $submenu.css("border-top-width"), 10
                        submenuBorderBot = parseInt $submenu.css("border-bottom-width"), 10
                        top = $el.offset().top - submenuBorderTop
                        outerHeight = $el.outerHeight()

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
                    # Menu item active callback
                    menuItemActive item, $submenu, $submenus
                    return
                ), options.showDelay
                return
            )
            .on("click", (e) ->
                # Menu item click callback
                menuItemClick = $.proxy options.menuItemClick, this
                menuItemClick item, $submenu, $submenus, e
                return
            )
            .appendTo($submenu)
        # Menu item add callback
        menuItemAdd = $.proxy options.menuItemAdd, $menuItem
        menuItemAdd item, $submenu, $submenus
        return

    # Hide menu initially
    $menu
        .css("position", "absolute")
        .hide()

    # Root menu
    $root = $submenus[options.root]
        .css("position", "absolute")

    # Menu init callback
    options.menuInit $menu

    $menu
        .on("show.listahan", (e) ->
            # Show menu
            $menu.show()
            # Hide previously shown submenus
            hideMenus options.root
            # Menu open callback
            menuOpen = $.proxy options.menuOpen, this
            menuOpen $menu
            # Append root menu
            if !$root.is(":visible")
                $menu.append $root
            return
        )
        .on("hide.listahan", (e) ->
            # Hide menu
            $menu.hide()
            return
        )