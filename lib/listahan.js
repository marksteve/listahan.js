/**
 * Copyright 2012 Craig Campbell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Mousetrap is a simple keyboard shortcut library for Javascript with
 * no external dependencies
 *
 * @version 1.1.4
 * @url craig.is/killing/mice
 */
(function() {

    /**
     * mapping of special keycodes to their corresponding keys
     *
     * everything in this dictionary cannot use keypress events
     * so it has to be here to map to the correct keycodes for
     * keyup/keydown events
     *
     * @type {Object}
     */
    var _MAP = {
            8: 'backspace',
            9: 'tab',
            13: 'enter',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            45: 'ins',
            46: 'del',
            91: 'meta',
            93: 'meta',
            224: 'meta'
        },

        /**
         * mapping for special characters so they can support
         *
         * this dictionary is only used incase you want to bind a
         * keyup or keydown event to one of these keys
         *
         * @type {Object}
         */
        _KEYCODE_MAP = {
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111 : '/',
            186: ';',
            187: '=',
            188: ',',
            189: '-',
            190: '.',
            191: '/',
            192: '`',
            219: '[',
            220: '\\',
            221: ']',
            222: '\''
        },

        /**
         * this is a mapping of keys that require shift on a US keypad
         * back to the non shift equivelents
         *
         * this is so you can use keyup events with these keys
         *
         * note that this will only work reliably on US keyboards
         *
         * @type {Object}
         */
        _SHIFT_MAP = {
            '~': '`',
            '!': '1',
            '@': '2',
            '#': '3',
            '$': '4',
            '%': '5',
            '^': '6',
            '&': '7',
            '*': '8',
            '(': '9',
            ')': '0',
            '_': '-',
            '+': '=',
            ':': ';',
            '\"': '\'',
            '<': ',',
            '>': '.',
            '?': '/',
            '|': '\\'
        },

        /**
         * this is a list of special strings you can use to map
         * to modifier keys when you specify your keyboard shortcuts
         *
         * @type {Object}
         */
        _SPECIAL_ALIASES = {
            'option': 'alt',
            'command': 'meta',
            'return': 'enter',
            'escape': 'esc'
        },

        /**
         * variable to store the flipped version of _MAP from above
         * needed to check if we should use keypress or not when no action
         * is specified
         *
         * @type {Object|undefined}
         */
        _REVERSE_MAP,

        /**
         * a list of all the callbacks setup via Mousetrap.bind()
         *
         * @type {Object}
         */
        _callbacks = {},

        /**
         * direct map of string combinations to callbacks used for trigger()
         *
         * @type {Object}
         */
        _direct_map = {},

        /**
         * keeps track of what level each sequence is at since multiple
         * sequences can start out with the same sequence
         *
         * @type {Object}
         */
        _sequence_levels = {},

        /**
         * variable to store the setTimeout call
         *
         * @type {null|number}
         */
        _reset_timer,

        /**
         * temporary state where we will ignore the next keyup
         *
         * @type {boolean|string}
         */
        _ignore_next_keyup = false,

        /**
         * are we currently inside of a sequence?
         * type of action ("keyup" or "keydown" or "keypress") or false
         *
         * @type {boolean|string}
         */
        _inside_sequence = false;

    /**
     * loop through the f keys, f1 to f19 and add them to the map
     * programatically
     */
    for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = 'f' + i;
    }

    /**
     * loop through to map numbers on the numeric keypad
     */
    for (i = 0; i <= 9; ++i) {
        _MAP[i + 96] = i;
    }

    /**
     * cross browser add event method
     *
     * @param {Element|HTMLDocument} object
     * @param {string} type
     * @param {Function} callback
     * @returns void
     */
    function _addEvent(object, type, callback) {
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
            return;
        }

        object.attachEvent('on' + type, callback);
    }

    /**
     * takes the event and returns the key character
     *
     * @param {Event} e
     * @return {string}
     */
    function _characterFromEvent(e) {

        // for keypress events we should return the character as is
        if (e.type == 'keypress') {
            return String.fromCharCode(e.which);
        }

        // for non keypress events the special maps are needed
        if (_MAP[e.which]) {
            return _MAP[e.which];
        }

        if (_KEYCODE_MAP[e.which]) {
            return _KEYCODE_MAP[e.which];
        }

        // if it is not in the special map
        return String.fromCharCode(e.which).toLowerCase();
    }

    /**
     * checks if two arrays are equal
     *
     * @param {Array} modifiers1
     * @param {Array} modifiers2
     * @returns {boolean}
     */
    function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(',') === modifiers2.sort().join(',');
    }

    /**
     * resets all sequence counters except for the ones passed in
     *
     * @param {Object} do_not_reset
     * @returns void
     */
    function _resetSequences(do_not_reset) {
        do_not_reset = do_not_reset || {};

        var active_sequences = false,
            key;

        for (key in _sequence_levels) {
            if (do_not_reset[key]) {
                active_sequences = true;
                continue;
            }
            _sequence_levels[key] = 0;
        }

        if (!active_sequences) {
            _inside_sequence = false;
        }
    }

    /**
     * finds all callbacks that match based on the keycode, modifiers,
     * and action
     *
     * @param {string} character
     * @param {Array} modifiers
     * @param {Event|Object} e
     * @param {boolean=} remove - should we remove any matches
     * @param {string=} combination
     * @returns {Array}
     */
    function _getMatches(character, modifiers, e, remove, combination) {
        var i,
            callback,
            matches = [],
            action = e.type;

        // if there are no events related to this keycode
        if (!_callbacks[character]) {
            return [];
        }

        // if a modifier key is coming up on its own we should allow it
        if (action == 'keyup' && _isModifier(character)) {
            modifiers = [character];
        }

        // loop through all callbacks for the key that was pressed
        // and see if any of them match
        for (i = 0; i < _callbacks[character].length; ++i) {
            callback = _callbacks[character][i];

            // if this is a sequence but it is not at the right level
            // then move onto the next match
            if (callback.seq && _sequence_levels[callback.seq] != callback.level) {
                continue;
            }

            // if the action we are looking for doesn't match the action we got
            // then we should keep going
            if (action != callback.action) {
                continue;
            }

            // if this is a keypress event and the meta key and control key
            // are not pressed that means that we need to only look at the
            // character, otherwise check the modifiers as well
            //
            // chrome will not fire a keypress if meta or control is down
            // safari will fire a keypress if meta or meta+shift is down
            // firefox will fire a keypress if meta or control is down
            if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

                // remove is used so if you change your mind and call bind a
                // second time with a new function the first one is overwritten
                if (remove && callback.combo == combination) {
                    _callbacks[character].splice(i, 1);
                }

                matches.push(callback);
            }
        }

        return matches;
    }

    /**
     * takes a key event and figures out what the modifiers are
     *
     * @param {Event} e
     * @returns {Array}
     */
    function _eventModifiers(e) {
        var modifiers = [];

        if (e.shiftKey) {
            modifiers.push('shift');
        }

        if (e.altKey) {
            modifiers.push('alt');
        }

        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }

        if (e.metaKey) {
            modifiers.push('meta');
        }

        return modifiers;
    }

    /**
     * actually calls the callback function
     *
     * if your callback function returns false this will use the jquery
     * convention - prevent default and stop propogation on the event
     *
     * @param {Function} callback
     * @param {Event} e
     * @returns void
     */
    function _fireCallback(callback, e) {
        if (callback(e) === false) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            if (e.stopPropagation) {
                e.stopPropagation();
            }

            e.returnValue = false;
            e.cancelBubble = true;
        }
    }

    /**
     * handles a character key event
     *
     * @param {string} character
     * @param {Event} e
     * @returns void
     */
    function _handleCharacter(character, e) {

        // if this event should not happen stop here
        if (Mousetrap.stopCallback(e, e.target || e.srcElement)) {
            return;
        }

        var callbacks = _getMatches(character, _eventModifiers(e), e),
            i,
            do_not_reset = {},
            processed_sequence_callback = false;

        // loop through matching callbacks for this key event
        for (i = 0; i < callbacks.length; ++i) {

            // fire for all sequence callbacks
            // this is because if for example you have multiple sequences
            // bound such as "g i" and "g t" they both need to fire the
            // callback for matching g cause otherwise you can only ever
            // match the first one
            if (callbacks[i].seq) {
                processed_sequence_callback = true;

                // keep a list of which sequences were matches for later
                do_not_reset[callbacks[i].seq] = 1;
                _fireCallback(callbacks[i].callback, e);
                continue;
            }

            // if there were no sequence matches but we are still here
            // that means this is a regular match so we should fire that
            if (!processed_sequence_callback && !_inside_sequence) {
                _fireCallback(callbacks[i].callback, e);
            }
        }

        // if you are inside of a sequence and the key you are pressing
        // is not a modifier key then we should reset all sequences
        // that were not matched by this key event
        if (e.type == _inside_sequence && !_isModifier(character)) {
            _resetSequences(do_not_reset);
        }
    }

    /**
     * handles a keydown event
     *
     * @param {Event} e
     * @returns void
     */
    function _handleKey(e) {

        // normalize e.which for key events
        // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
        if (typeof e.which !== 'number') {
            e.which = e.keyCode;
        }

        var character = _characterFromEvent(e);

        // no character found then stop
        if (!character) {
            return;
        }

        if (e.type == 'keyup' && _ignore_next_keyup == character) {
            _ignore_next_keyup = false;
            return;
        }

        _handleCharacter(character, e);
    }

    /**
     * determines if the keycode specified is a modifier key or not
     *
     * @param {string} key
     * @returns {boolean}
     */
    function _isModifier(key) {
        return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
    }

    /**
     * called to set a 1 second timeout on the specified sequence
     *
     * this is so after each key press in the sequence you have 1 second
     * to press the next key before you have to start over
     *
     * @returns void
     */
    function _resetSequenceTimer() {
        clearTimeout(_reset_timer);
        _reset_timer = setTimeout(_resetSequences, 1000);
    }

    /**
     * reverses the map lookup so that we can look for specific keys
     * to see what can and can't use keypress
     *
     * @return {Object}
     */
    function _getReverseMap() {
        if (!_REVERSE_MAP) {
            _REVERSE_MAP = {};
            for (var key in _MAP) {

                // pull out the numeric keypad from here cause keypress should
                // be able to detect the keys from the character
                if (key > 95 && key < 112) {
                    continue;
                }

                if (_MAP.hasOwnProperty(key)) {
                    _REVERSE_MAP[_MAP[key]] = key;
                }
            }
        }
        return _REVERSE_MAP;
    }

    /**
     * picks the best action based on the key combination
     *
     * @param {string} key - character for key
     * @param {Array} modifiers
     * @param {string=} action passed in
     */
    function _pickBestAction(key, modifiers, action) {

        // if no action was picked in we should try to pick the one
        // that we think would work best for this key
        if (!action) {
            action = _getReverseMap()[key] ? 'keydown' : 'keypress';
        }

        // modifier keys don't work as expected with keypress,
        // switch to keydown
        if (action == 'keypress' && modifiers.length) {
            action = 'keydown';
        }

        return action;
    }

    /**
     * binds a key sequence to an event
     *
     * @param {string} combo - combo specified in bind call
     * @param {Array} keys
     * @param {Function} callback
     * @param {string=} action
     * @returns void
     */
    function _bindSequence(combo, keys, callback, action) {

        // start off by adding a sequence level record for this combination
        // and setting the level to 0
        _sequence_levels[combo] = 0;

        // if there is no action pick the best one for the first key
        // in the sequence
        if (!action) {
            action = _pickBestAction(keys[0], []);
        }

        /**
         * callback to increase the sequence level for this sequence and reset
         * all other sequences that were active
         *
         * @param {Event} e
         * @returns void
         */
        var _increaseSequence = function(e) {
                _inside_sequence = action;
                ++_sequence_levels[combo];
                _resetSequenceTimer();
            },

            /**
             * wraps the specified callback inside of another function in order
             * to reset all sequence counters as soon as this sequence is done
             *
             * @param {Event} e
             * @returns void
             */
            _callbackAndReset = function(e) {
                _fireCallback(callback, e);

                // we should ignore the next key up if the action is key down
                // or keypress.  this is so if you finish a sequence and
                // release the key the final key will not trigger a keyup
                if (action !== 'keyup') {
                    _ignore_next_keyup = _characterFromEvent(e);
                }

                // weird race condition if a sequence ends with the key
                // another sequence begins with
                setTimeout(_resetSequences, 10);
            },
            i;

        // loop through keys one at a time and bind the appropriate callback
        // function.  for any key leading up to the final one it should
        // increase the sequence. after the final, it should reset all sequences
        for (i = 0; i < keys.length; ++i) {
            _bindSingle(keys[i], i < keys.length - 1 ? _increaseSequence : _callbackAndReset, action, combo, i);
        }
    }

    /**
     * binds a single keyboard combination
     *
     * @param {string} combination
     * @param {Function} callback
     * @param {string=} action
     * @param {string=} sequence_name - name of sequence if part of sequence
     * @param {number=} level - what part of the sequence the command is
     * @returns void
     */
    function _bindSingle(combination, callback, action, sequence_name, level) {

        // make sure multiple spaces in a row become a single space
        combination = combination.replace(/\s+/g, ' ');

        var sequence = combination.split(' '),
            i,
            key,
            keys,
            modifiers = [];

        // if this pattern is a sequence of keys then run through this method
        // to reprocess each pattern one key at a time
        if (sequence.length > 1) {
            _bindSequence(combination, sequence, callback, action);
            return;
        }

        // take the keys from this pattern and figure out what the actual
        // pattern is all about
        keys = combination === '+' ? ['+'] : combination.split('+');

        for (i = 0; i < keys.length; ++i) {
            key = keys[i];

            // normalize key names
            if (_SPECIAL_ALIASES[key]) {
                key = _SPECIAL_ALIASES[key];
            }

            // if this is not a keypress event then we should
            // be smart about using shift keys
            // this will only work for US keyboards however
            if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                key = _SHIFT_MAP[key];
                modifiers.push('shift');
            }

            // if this key is a modifier then add it to the list of modifiers
            if (_isModifier(key)) {
                modifiers.push(key);
            }
        }

        // depending on what the key combination is
        // we will try to pick the best event for it
        action = _pickBestAction(key, modifiers, action);

        // make sure to initialize array if this is the first time
        // a callback is added for this key
        if (!_callbacks[key]) {
            _callbacks[key] = [];
        }

        // remove an existing match if there is one
        _getMatches(key, modifiers, {type: action}, !sequence_name, combination);

        // add this call back to the array
        // if it is a sequence put it at the beginning
        // if not put it at the end
        //
        // this is important because the way these are processed expects
        // the sequence ones to come first
        _callbacks[key][sequence_name ? 'unshift' : 'push']({
            callback: callback,
            modifiers: modifiers,
            action: action,
            seq: sequence_name,
            level: level,
            combo: combination
        });
    }

    /**
     * binds multiple combinations to the same callback
     *
     * @param {Array} combinations
     * @param {Function} callback
     * @param {string|undefined} action
     * @returns void
     */
    function _bindMultiple(combinations, callback, action) {
        for (var i = 0; i < combinations.length; ++i) {
            _bindSingle(combinations[i], callback, action);
        }
    }

    // start!
    _addEvent(document, 'keypress', _handleKey);
    _addEvent(document, 'keydown', _handleKey);
    _addEvent(document, 'keyup', _handleKey);

    var Mousetrap = {

        /**
         * binds an event to mousetrap
         *
         * can be a single key, a combination of keys separated with +,
         * an array of keys, or a sequence of keys separated by spaces
         *
         * be sure to list the modifier keys first to make sure that the
         * correct key ends up getting bound (the last key in the pattern)
         *
         * @param {string|Array} keys
         * @param {Function} callback
         * @param {string=} action - 'keypress', 'keydown', or 'keyup'
         * @returns void
         */
        bind: function(keys, callback, action) {
            _bindMultiple(keys instanceof Array ? keys : [keys], callback, action);
            _direct_map[keys + ':' + action] = callback;
            return this;
        },

        /**
         * unbinds an event to mousetrap
         *
         * the unbinding sets the callback function of the specified key combo
         * to an empty function and deletes the corresponding key in the
         * _direct_map dict.
         *
         * the keycombo+action has to be exactly the same as
         * it was defined in the bind method
         *
         * TODO: actually remove this from the _callbacks dictionary instead
         * of binding an empty function
         *
         * @param {string|Array} keys
         * @param {string} action
         * @returns void
         */
        unbind: function(keys, action) {
            if (_direct_map[keys + ':' + action]) {
                delete _direct_map[keys + ':' + action];
                this.bind(keys, function() {}, action);
            }
            return this;
        },

        /**
         * triggers an event that has already been bound
         *
         * @param {string} keys
         * @param {string=} action
         * @returns void
         */
        trigger: function(keys, action) {
            _direct_map[keys + ':' + action]();
            return this;
        },

        /**
         * resets the library back to its initial state.  this is useful
         * if you want to clear out the current keyboard shortcuts and bind
         * new ones - for example if you switch to another page
         *
         * @returns void
         */
        reset: function() {
            _callbacks = {};
            _direct_map = {};
            return this;
        },

       /**
        * should we stop this event before firing off callbacks
        *
        * @param {Event} e
        * @param {Element} element
        * @return {boolean}
        */
        stopCallback: function(e, element) {

            // if the element has the class "mousetrap" then no need to stop
            if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
                return false;
            }

            // stop for input, select, and textarea
            return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true');
        }
    };

    // expose mousetrap to the global object
    window.Mousetrap = Mousetrap;

    // expose mousetrap as an AMD module
    if (typeof define == 'function' && define.amd) {
        define('mousetrap', function() { return Mousetrap; });
    }
}) ();
// Generated by CoffeeScript 1.3.3
(function() {
  var __slice = [].slice;

  $.fn.listahan = function() {
    var $menu, $root, $submenus, addMenuItem, hideMenus, item, items, menuTimeout, options, optionsOrMethod, params, removeMenuItem, showMenu, _i, _j, _len, _len1, _ref, _ref1;
    optionsOrMethod = arguments[0], params = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (typeof optionsOrMethod === "string") {
      this.each(function() {
        return $(this).trigger(optionsOrMethod + ".listahan", params);
      });
      return;
    }
    options = $.extend({
      $parent: $(window),
      root: 0,
      showDelay: 250,
      distance: 0,
      submenuClass: "submenu",
      menuInit: function($menu) {},
      menuOpen: function($menu) {},
      menuItemAdd: function(item, $submenu, $submenus) {
        $(this).text(item.title);
      },
      menuItemParent: function(item, $submenu, $submenus) {},
      menuItemActive: function(item, $submenu, $submenus) {},
      menuItemClick: function(item, $submenu, $submenus, e) {}
    }, optionsOrMethod);
    $menu = $(this);
    $submenus = {};
    hideMenus = function(parent) {
      return $("li", $submenus[parent]).each(function() {
        var itemID;
        itemID = $(this).attr("id");
        if ($submenus[itemID]) {
          $submenus[itemID].hide();
          return hideMenus(itemID);
        }
      });
    };
    menuTimeout = null;
    showMenu = function(item, $item) {
      var $submenu, alignLeft, alignRight, botAlignedTop, botOverflow, itemHeight, itemLeft, itemTop, itemWidth, parentHeight, parentLeft, parentOffset, parentTop, parentWidth, rightOverflow, smBorderBottom, smBorderTop, smHeight, smLeft, smWidth, topOverflow, yOverflow;
      $submenu = $submenus[item.id];
      if ($submenu && !$submenu.is(":visible")) {
        $submenu.css({
          position: "absolute",
          overflowY: "hidden",
          height: "auto"
        }).appendTo($menu).show();
        $("li", $submenu).removeClass("active");
        parentOffset = options.$parent.offset();
        if (parentOffset) {
          parentTop = parentOffset.top;
          parentLeft = parentOffset.left;
        } else {
          parentTop = options.$parent.scrollTop();
          parentLeft = options.$parent.scrollLeft();
        }
        parentWidth = options.$parent.outerWidth();
        parentHeight = options.$parent.outerHeight();
        smBorderTop = parseInt($submenu.css("border-top-width"), 10);
        smBorderBottom = parseInt($submenu.css("border-bottom-width"), 10);
        smWidth = $submenu.outerWidth();
        smHeight = $submenu.outerHeight();
        itemTop = $item.offset().top - smBorderTop;
        itemLeft = $item.offset().left;
        itemWidth = $item.outerWidth();
        itemHeight = $item.outerHeight();
        alignLeft = function() {
          var left;
          left = itemLeft + itemWidth + options.distance;
          $submenu.removeClass("left").offset({
            left: left
          });
          return left;
        };
        alignRight = function() {
          $submenu.addClass("left").offset({
            left: itemLeft - smWidth - options.distance
          });
        };
        if ($item.parents("ul").hasClass("left")) {
          alignRight();
        } else {
          smLeft = alignLeft();
          rightOverflow = smLeft + smWidth - parentLeft - parentWidth;
          if (rightOverflow > 0) {
            alignRight();
          }
        }
        $submenu.offset({
          top: itemTop
        });
        botOverflow = itemTop + smHeight - parentTop - parentHeight;
        if (botOverflow > 0) {
          botAlignedTop = itemTop + itemHeight + smBorderTop + smBorderBottom - smHeight;
          topOverflow = parentTop - botAlignedTop;
          yOverflow = 0;
          if (topOverflow > botOverflow) {
            yOverflow = botOverflow;
            $submenu.offset({
              top: itemTop
            });
          } else {
            if (topOverflow > 0) {
              yOverflow = topOverflow;
            }
            $submenu.offset({
              top: botAlignedTop + yOverflow
            });
          }
          if (yOverflow > 0) {
            return $submenu.height(smHeight - yOverflow).css("overflow-y", "scroll");
          }
        }
      }
    };
    items = {};
    _ref = options.menu;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      item = _ref[_i];
      items[item.id] = item;
    }
    addMenuItem = function(item) {
      var $menuItem, $parentMenuItem, $parentSubmenu, $submenu, menuItemAdd, menuItemParent, parentItem, parentSubmenu;
      items[item.id] = item;
      $submenu = $submenus[item.parent];
      if (!$submenu) {
        $submenu = $submenus[item.parent] = $("<ul/>").addClass(options.submenuClass);
        parentItem = items[item.parent];
        parentSubmenu = (parentItem != null ? parentItem.parent : void 0) || options.root;
        $parentSubmenu = $submenus[parentSubmenu];
        $parentMenuItem = $("#" + item.parent, $submenus[parentSubmenu]);
        menuItemParent = $.proxy(options.menuItemParent, $parentMenuItem);
        menuItemParent(parentItem || 'root', $parentSubmenu, $submenus);
      }
      $menuItem = $("<li/>").attr("id", item.id).data("item", item).on("mouseenter", function(e) {
        var $item, $parent, menuItemActive, parent;
        clearTimeout(menuTimeout);
        $item = $(this);
        $item.addClass("active").siblings().removeClass("active");
        parent = item.parent;
        while (parent != null) {
          $parent = $("li#" + parent, $menu).addClass("active").siblings().removeClass("active");
          parent = $parent.size() ? $parent.data("item").parent : null;
        }
        $menu.data("active", $item.attr("id"));
        menuItemActive = $.proxy(options.menuItemActive, this);
        menuTimeout = setTimeout((function() {
          hideMenus(item.parent);
          showMenu(item, $item);
          menuItemActive(item, $submenu, $submenus);
        }), options.showDelay);
      }).on("click", function(e) {
        var menuItemClick;
        menuItemClick = $.proxy(options.menuItemClick, this);
        menuItemClick(item, $submenu, $submenus, e);
      }).appendTo($submenu);
      menuItemAdd = $.proxy(options.menuItemAdd, $menuItem);
      menuItemAdd(item, $submenu, $submenus);
    };
    _ref1 = options.menu;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      item = _ref1[_j];
      addMenuItem(item);
    }
    removeMenuItem = function(item) {
      var $submenu;
      $("#" + item.id, $submenus[item.parent]).remove();
      $submenu = $submenus[item.id];
      if ($submenu != null) {
        $("li", $submenu).each(function() {
          var $item;
          $item = $(this);
          removeMenuItem($item.data("item"));
          return $item.remove();
        });
        $submenu.remove();
      }
    };
    $menu.css("position", "absolute").hide();
    $root = $submenus[options.root].css("position", "absolute");
    $menu.data('options', options);
    $menu.data('$submenus', $submenus);
    options.menuInit($menu);
    return $menu.on("add.listahan", function(e, item) {
      addMenuItem(item);
    }).on("remove.listahan", function(e, item) {
      removeMenuItem(item);
    }).on("clear.listahan", function(e, parent) {
      if ($submenus[parent] != null) {
        $submenus[parent].empty();
      }
    }).on("show.listahan", function(e) {
      var menuOpen;
      $menu.show();
      hideMenus(options.root);
      if (!$root.is(":visible")) {
        $menu.append($root);
      }
      menuOpen = $.proxy(options.menuOpen, this);
      menuOpen($menu);
      ["up", "down", "left", "right"].forEach(function(dir) {
        return Mousetrap.bind(dir, function(e) {
          e.preventDefault();
          $menu.trigger(dir + ".listahan");
        });
      });
    }).on("hide.listahan", function(e) {
      $menu.hide();
      ["up", "down", "left", "right"].forEach(function(dir) {
        Mousetrap.unbind(dir);
      });
    }).on("up.listahan", function(e) {
      var $item, $prev;
      $item = $("#" + $menu.data("active"), $menu);
      $prev = $item.prev();
      if ($prev.size()) {
        hideMenus($item.data("item").parent);
        showMenu($prev.data("item"), $prev);
        $prev.addClass("active").siblings().removeClass("active");
        $menu.data("active", $prev.attr("id"));
      }
    }).on("down.listahan", function(e) {
      var $item, $next;
      $item = $("#" + $menu.data("active"), $menu);
      if ($item.size()) {
        $next = $item.next();
      } else {
        $next = $("li", $root).first();
      }
      if ($next.size()) {
        if ($item.size()) {
          hideMenus($item.data("item").parent);
        }
        showMenu($next.data("item"), $next);
        $next.addClass("active").siblings().removeClass("active");
        $menu.data("active", $next.attr("id"));
      }
    }).on("left.listahan", function(e) {
      var $item, $prev;
      $item = $("#" + $menu.data("active"), $menu);
      item = $item.data("item");
      $prev = $("#" + item.parent, $menu);
      if ($prev.size()) {
        hideMenus(item.parent);
        $prev.addClass("active");
        $submenus[item.parent].hide();
        $menu.data("active", $prev.attr("id"));
      }
    }).on("right.listahan", function(e) {
      var $item, $next, $submenu;
      $item = $("#" + $menu.data("active"), $menu);
      item = $item.data("item");
      $submenu = $submenus[item.id];
      if ($submenu == null) {
        return;
      }
      $next = $('li', $submenu).first();
      if ($next.size()) {
        showMenu(item, $item);
        showMenu($next.data("item"), $next);
        $next.addClass("active");
        $menu.data("active", $next.attr("id"));
      }
    });
  };

}).call(this);
