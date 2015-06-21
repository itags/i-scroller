module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margeItems = 3,
        MAX_AREAS_SHIFTED = 10,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        AUTO_EXPAND_DELAY = 200,
        AUTO_REFRESH_STARTITEM_DURING_SWIPE = 15, // not higher: during high-speed swipe you could loose the items
        CAPTURE_TIMEFRAME_BEFORE_MOUSEWHEEL = 100, // ms: the time to capture mousewheel-events before starting to swipe
        NO_RESWIPE_INTERVAL = 1500,
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        scrollers = [],
        Itag, autoExpandScrollers, registerScroller, unregisterScroller;

    if (!window.ITAGS[itagName]) {

        registerScroller = function(iscroller) {
            scrollers.push(iscroller);
        };

        unregisterScroller = function(iscroller) {
            scrollers.remove(iscroller);
        };

        autoExpandScrollers = function() {
            ITSA.later(function() {
                var len = scrollers.length,
                    i;
                for (i=0; i<len; i++) {
                    scrollers[i].autoExpand();
                }
            }, AUTO_EXPAND_DELAY, true);
        };

        Event.before('mousewheel', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                scrollValue = iscroller.getData('_scroller'),
                delta = e['wheelDelta'+(iscroller.model.horizontal ? 'X' : 'Y')],
                swiper = iscroller.getData('_swiper'),
                timer, timer2;
            e.preventDefault();
            swiper && !iscroller.hasData('_noReswipe') && swiper.freeze();
            if (!scrollValue) {
                // start caching the wheeldata's
                scrollValue = 0;
                timer = ITSA.later(function() {
                    var distance = iscroller.getData('_scroller'),
                        speed = distance && Math.round(4*Math.abs(distance));
                    timer.cancel();
                    if (distance) {
                        iscroller.setData('_noReswipe', true);
                        swiper = iscroller.swipe(distance, speed, 'ease-out');
                        timer2 = ITSA.later(function() {
                            iscroller.removeData('_noReswipe');
                        }, NO_RESWIPE_INTERVAL);
                        swiper.finally(function() {
                            timer2.cancel();
                        });
                    }
                }, CAPTURE_TIMEFRAME_BEFORE_MOUSEWHEEL);
            }
            if (!iscroller.hasData('_dragging')) {
                scrollValue -= delta;
                iscroller.setData('_scroller', scrollValue);
            }
        }, 'i-scroller >span, i-table >span');

        // TODO: magicmouse cannot be detected! 'touchstart' doesn't work on desktop
        // TODO: ake it work
        Event.before('touchstart', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                swiper = iscroller.getData('_swiper');
            swiper && swiper.freeze();
        }, 'i-scroller >span, i-table >span');

        Event.before('dd', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                swiper = iscroller.getData('_swiper');
            swiper && swiper.freeze();
            iscroller.hasData('_dragging') && e.preventDefault();
        }, 'i-scroller >span, i-table >span');

        Event.after('dd', function(e) {
            // start dragging
            var node = e.target,
                sourceNode = e.sourceTarget,
                iscroller = node.getParent(),
                scrollContainer = iscroller.getData('_scrollContainer'),
                dragPromise = e.dd,
                horizontal = iscroller.model.horizontal,
                currentPos = horizontal ? e.yMouse : e.yMouse,
                prevPos = currentPos,
                timer;
            // store initial start-item:
            // iscroller.setData('_scrollBefore', iscroller.model['start-item']);

            timer = ITSA.later(function() {
                prevPos = currentPos;
                currentPos = horizontal ? e.yMouse : e.yMouse;
            }, 25, true);

            dragPromise.finally(function() {
                var distance, speed;
                scrollContainer.removeData('_dragUp')
                               .removeData('_prevPos')
                               .removeData('_prevPosX');
                timer.cancel();
                if (prevPos && currentPos && (prevPos!==currentPos)) {
                    distance = 8*(prevPos-currentPos);
                    speed = Math.round(2*Math.abs(distance));
                    iscroller.swipe(distance, speed, 'ease-out');
                }
                else {
                    iscroller.redefineStartItem(true);
                }


                // iscroller.redefineStartItem(true);


                // if (!iscroller.getData('_dragging')) {
                //     var index;
                //     sourceNode.matches('span.item') ||  (sourceNode=sourceNode.inside('span.item'));
                //     index = sourceNode.getData('_index');
                //     *
                //     * Emitted when a the i-select changes its value
                //     *
                //     * @event i-select:valuechange
                //     * @param e {Object} eventobject including:
                //     * @param e.target {HtmlElement} the i-select element
                //     * @param e.prevValue {Number} the selected item, starting with 1
                //     * @param e.newValue {Number} the selected item, starting with 1
                //     * @param e.buttonText {String} the text that will appear on the button
                //     * @param e.listText {String} the text as it is in the list
                //     * @since 0.1

                //     iscroller.emit('UI:selected', {
                //         newValue: sourceNode,
                //         index: index,
                //         item: iscroller.model.items[index]
                //     });
                // }

            });
        }, 'i-scroller >span, i-table >span');

        Event.before('dd-drag', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                scrollContainer = iscroller.getData('_scrollContainer'),
                fixedHeaderNode = iscroller.getData('_fixedHeaderNode'),
                model = iscroller.model,
                items = iscroller.getData('items'), // is the cloned version!
                horizontal = model.horizontal,
                end = horizontal ? 'right' : 'bottom',
                start = horizontal ? 'left' : 'top',
                up, clientX, clientY, boundaryNode, prevPos, currentPos, position, newPosition, prevPosX,
                rightBorderWidth, leftBorderWidth, iscrollerInnerWidth;

            if (typeof e.center==='object') {
                clientX = e.center.x;
                clientY = e.center.y;
            }
            else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            if (!iscroller.insidePos(e.xMouse, e.yMouse) || fixedHeaderNode.insidePos(e.xMouse, e.yMouse)) {
                e.preventDefault();
            }
            else {
                if (horizontal) {
                    prevPos = scrollContainer.getData('_prevPos') || e.clientX;
                    currentPos = e.xMouse;
                }
                else {
                    prevPos = scrollContainer.getData('_prevPos') || e.clientY;
                    currentPos = e.yMouse;
                }
                up = (prevPos>currentPos);
                if (up) {
                    boundaryNode = scrollContainer.getData('_lowerNode');
                    if (boundaryNode.getData('_index')===(items.length-1)) {
                        (boundaryNode[end]<=iscroller[end]) && e.preventDefault();
                    }
                }
                else {
                    boundaryNode = scrollContainer.getData('_upperNode');
                    if (boundaryNode.getData('_index')===0) {
                        (boundaryNode[start]>=iscroller[start]) && e.preventDefault();
                    }
                }

                // in case of scroller in y and movable in x (itable) --> x cannot go out of boundaries
                if (scrollContainer._plugin.dd.model.direction==='xy') {
                    prevPosX = scrollContainer.getData('_prevPosX') || e.clientX;
                    // first check lower boundary:
                    leftBorderWidth = parseInt(iscroller.getStyle('border-left-width'), 10);
                    position = scrollContainer.left - iscroller.left - leftBorderWidth;
                    newPosition = position + e.xMouse - prevPosX;
                    if (newPosition>0) {
                        e.xMouse = prevPosX - position; // --> leads to newPosition 0
                    }
                    else {
                        rightBorderWidth = parseInt(iscroller.getStyle('border-right-width'), 10);
                        iscrollerInnerWidth = iscroller.width - leftBorderWidth - rightBorderWidth;
                        if ((newPosition+scrollContainer.width) < iscrollerInnerWidth) {
                            // check upper boundary:
                            e.xMouse = iscrollerInnerWidth + prevPosX - position - scrollContainer.width; // --> leads to newPosition = max
                        }
                    }
                }
            }
        }, 'i-scroller >span, i-table >span');

        // also: correction if dragging was too heavy and it bounced through the limit:
        Event.after('dd-drag', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                scrollContainer = iscroller.getData('_scrollContainer'),
                model = iscroller.model,
                items = iscroller.getData('items'), // is the cloned version!
                horizontal = model.horizontal,
                end = horizontal ? 'right' : 'bottom',
                start = horizontal ? 'left' : 'top',
                up, clientX, clientY, boundaryNode, difference, value, isDragging, prevPos, currentPos, fixedHeaderNode;
            if (typeof e.center==='object') {
                clientX = e.center.x;
                clientY = e.center.y;
            }
            else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            isDragging = iscroller.getData('_dragging');
            if (!isDragging) {
                difference = Math.abs(horizontal ? (e.clientX-e.xMouse) : (e.clientY-e.yMouse));
                if (difference>=2) {
                    iscroller.setData('_dragging', true);
                }
            }
            if (horizontal) {
                prevPos = scrollContainer.getData('_prevPos') || e.clientX;
                currentPos = e.xMouse;
            }
            else {
                prevPos = scrollContainer.getData('_prevPos') || e.clientY;
                currentPos = e.yMouse;
            }
            up = (prevPos>currentPos);
            if (up) {
                boundaryNode = scrollContainer.getData('_lowerNode');
                if (boundaryNode.getData('_index')===(items.length-1)) {
                    difference = boundaryNode[end]-iscroller[end];
                }
            }
            else {
                boundaryNode = scrollContainer.getData('_upperNode');
                if (boundaryNode.getData('_index')===0) {
                    difference = iscroller[start]-boundaryNode[start];
                }
            }
            if (difference<0) {
                value = parseInt(scrollContainer.getInlineStyle(start), 10);
                if (up) {
                    value += difference;
                }
                else {
                    value -= difference;
                }
                scrollContainer.setInlineStyle(start, value+'px');
            }
            if (scrollContainer._plugin.dd.model.direction==='xy') {
                // we need to sync the x-position of the headernode with the containernode
                fixedHeaderNode = iscroller.getData('_fixedHeaderNode');
                fixedHeaderNode.setInlineStyle('left', scrollContainer.getInlineStyle('left'));
            }
            scrollContainer.setData('_dragUp', up)
                           .setData('_prevPos', currentPos)
                           .setData('_prevPosX', e.xMouse); // extra needed in case of xy movable containers
            iscroller.redefineStartItem();
        }, 'i-scroller >span, i-table >span');

        Itag = DOCUMENT.defineItag(itagName, {
            /*
             *
             * @property attrs
             * @type Object
             * @since 0.0.1
            */
            attrs: {
                'item-size': 'string',
                horizontal: 'boolean',
                'start-item': 'number',
                disabled: 'boolean',
                'items-focusable': 'boolean',
                scrollbar: 'boolean',
                required: 'boolean',
                value: 'string',
                multiple: 'boolean',
                'i-prop': 'string',
                'reset-value': 'string',
                'uri-property': 'string', // model's property that holds the uri --> if present, then an anchor-element is rendered
                'fixed-headers': 'string' // whether to fix the headers during scrolling. The headers should be defined by the template
            },

            init: function() {
                var element = this,
                    designNode = element.getItagContainer(),
                    headerNodes = designNode.getAll('>section[is="header"]'),
                    itemTemplate = designNode.getHTML(headerNodes),
                    model = element.model,
                    value = model.value || -1,
                    itemsize = model['item-size'] || '2em',
                    startItem = model['start-item'] || 0,
                    headers, i, len, headerNode, headerTemplate;
                // when initializing: make sure NOT to overrule model-properties that already
                // might have been defined when modeldata was boundend. Therefore, use `defineWhenUndefined`
                // element.defineWhenUndefined('someprop', somevalue); // sets element.model.someprop = somevalue; when not defined yet
                //
                // we MUST avoid circular reference: we cannot accept `template` as a property-field --> we remove those.
                // Also, because < and > are escaped by text-nodes: we need to unescape them:
                itemTemplate = itemTemplate.replaceAll('template', '')
                                           .replaceAll('&lt;', '<')
                                           .replaceAll('&gt;', '>');
                element.defineWhenUndefined('template', itemTemplate)
                       .defineWhenUndefined('value', value)
                       .defineWhenUndefined('item-size', itemsize)
                       .defineWhenUndefined('start-item', startItem)
                        // set the reset-value to the inital-value in case `reset-value` was not present
                       .defineWhenUndefined('reset-value', value)
                       .defineWhenUndefined('items', []);

                // store headernodes when defined:
                if (headerNodes && !element.headers) {
                    headers = [];
                    len = headerNodes.length;
                    for (i=0; i<len; i++) {
                        headerNode = headerNodes[i];
                        headerTemplate = headerNode.getHTML().replaceAll('template', '')
                                                             .replaceAll('&lt;', '<')
                                                             .replaceAll('&gt;', '>');
                        headers[headers.length] = headerTemplate;
                    }
                    element.model.headers = headers;
                }

                // store its current value, so that valueChange-event can fire:
                element.setData('i-scroller-value', value);

                // make it a focusable form-element:
                element.setAttr('itag-formelement', 'true', true);

                // define unique id:
                element['i-id'] = ITSA.idGenerator('i-scroller');

                element.setData('_map', new ITSA.LightMap());

                element.itagReady().then(function() {
                    registerScroller(element);
                });
                // we need to clone the items-array, because the i-table instance can sort on its own:
                element.cloneItems();
            },

            contTag: 'span',

            cloneItems: function() {
                var element = this,
                    model = element.model;
                // iscroller doesn't need to deepclone the items: it can use its reference:
                element.setData('items', model.items);
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method render
            * @chainable
            * @since 0.0.1
            */
            render: function() {
                var element = this,
                    containerTag = element.contTag,
                    content = '<section class="fixed-header"></section>';

                content += '<'+containerTag+' plugin-dd="true" dd-direction="'+element.getDirection()+'"></'+containerTag+'>';
                // mark element its i-id:
                element.setAttr('i-id', element['i-id']);

                // set the content:
                element.setHTML(content);
                // for quick access to the scrollcontainer, we add it as data:
                element.setData('_scrollContainer', element.getElement('>'+containerTag));
                // same for fixed-header:
                element.setData('_fixedHeaderNode', element.getElement('>section.fixed-header'));
            },

            getDirection: function() {
                return this.model.horizontal ? 'x' : 'y';
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method swipe
            * @param distance {Number} distance in pixels
            * @param [speed=25] {Number} pixels/sec (should be between 1-250)
            * @param [duration=3] {Number} duration of the transition in seconds
            * @since 0.0.1
            */
            swipe: function(distance, speed, timingFunction) {
                var element = this,
                    property = element.model.horizontal ? 'left' : 'top',
                    scrollContainer = element.getData('_scrollContainer'),
                    duration = Math.round(Math.abs(distance)/Math.inbetween(1, speed || 25, 250)),
                    newValue = parseInt((scrollContainer.getInlineStyle(property) || 0), 10) - distance,
                    timer, transPromise, returnPromise, swiper;

                // first freeze previous swipe:
                swiper = element.getData('_swiper');
                swiper && swiper.freeze();
                element.setData('_dragging', true);
                scrollContainer.setData('_dragUp', (distance>0));
                timer = ITSA.later(function() {
                    element.redefineStartItem();
                    // if the edgde is reached: then bounce
                }, AUTO_REFRESH_STARTITEM_DURING_SWIPE, true);
                transPromise = scrollContainer.transition({
                    property: property,
                    value: newValue+'px',
                    timingFunction: timingFunction,
                    duration: duration
                });
                returnPromise = new window.Promise(function(resolve) {
                    transPromise.finally(function() {
                        element.removeData('_swiper');
                        element.removeData('_scroller');
                        element.removeData('_noReswipe');
                        timer.cancel();
                        // go async to make model sets its new value
                        ITSA.async(function() {
                            // element.redefineStartItem(true);
                            element.redefineStartItem(!transPromise.frozen);

                            // go async again to make model sets its new value
                            ITSA.async(function() {
                                resolve();
                            });
                        });
                    });
                });
                element.setData('_swiper', returnPromise);
                // merge the transitionHandles to the new Promise:
                returnPromise.freeze = function() {
                    element.redefineStartItem();
                    element.removeData('_dragging');
                    return transPromise.freeze();
                };
                returnPromise.catch(function(err) {
                    console.info('transition: '+err);
                });
                return returnPromise;
            },

            templateHeaders: true,

// TODO: too high values of model['start-item'] throw an error

            sync: function() {
                var element = this,
                    model = element.model,
                    items = element.getData('items'), // is the cloned version!
                    horizontal = model.horizontal,
                    size = horizontal ? 'width' : 'height',
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    iscrollerSize = element[size],
                    scrollContainer = element.getData('_scrollContainer'),
                    fixedHeaderNode = element.getData('_fixedHeaderNode'),
                    borderStart = element.getStyle('border-'+start+'width'),
                    borderBottom = element.getStyle('border-'+end+'width'),
                    iscrollerStart = element[start] + (parseInt(borderStart, 10) || 0),
                    iscrollerBottom = element[end] + (parseInt(borderBottom, 10) || 0),
                    isDragging = element.hasData('_dragging'),
                    startItem = isDragging ? element.getData('_draggedStartItem') : model['start-item'], // impossible to overrule when dragging
                    startItemFloor = Math.floor(startItem),
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes,
                    indentNode, indentNode2, shiftFromFirstRange, topNode, size2, firstIsInside, lastIsInside, draggedUp, middleNodeIndex, nodeSize, contSize,
                    beyondEdge, beyondEdgecount, node, shift, dif, prevFirstIndex, prevLastIndex, count, noOverlap, middleNode, firstChildNode, headerContentDefinition,
                    firstIndex, j, k, len, i, lastIndex, item, lowerNode, prevItem, lowerShiftNodeIndex, sectionsShifted, currentShift;


                scrollContainer._plugin.dd && (scrollContainer._plugin.dd.model.direction=element.getDirection());


                firstIndex = Math.max(0, Math.round((startItem - margeItems)));

                if (element.templateHeaders) {
                    if (model.fixedHeader) {
                        headerContentDefinition = element.getData('_map').get(items[startItemFloor]);
                        headerContentDefinition && fixedHeaderNode.setHTML('<section class="header0">'+headerContentDefinition['0']+'</section>');
                        fixedHeaderNode.removeClass('itsa-hidden');
                        iscrollerStart += fixedHeaderNode[size];
                    }
                    else {
                        fixedHeaderNode.setClass('itsa-hidden');
                    }
                }
                else if (!fixedHeaderNode.hasClass('itsa-hidden')) {
                    iscrollerStart += fixedHeaderNode[size];
                }

                // if container is empty: fill it as far as needed
                contSize = 0;
                if (scrollContainer.isEmpty()) {
                    lastIndex = items.length-1;
                    middleNodeIndex = firstIndex + Math.round((lastIndex-firstIndex)/2);
                    beyondEdgecount = 0;
                    for (i=firstIndex; (i<=lastIndex) && (beyondEdgecount<(2*margeItems)); i++) {
                        item = items[i];
                        prevItem = items[i-1];
                        node = scrollContainer.append('<section>'+element.drawItem(item, prevItem, i)+'</section>');
                        node.setData('_index', i);
                        nodeSize = node[size];
                        contSize += nodeSize;
                        (i===firstIndex) && scrollContainer.setData('_upperNode', node);
                        if (i===startItemFloor) {
                            shift = node[start];
                            dif = (startItem-startItemFloor);
                            if (dif>0) {
                                shift += dif*node[size];
                            }
                        }
                        if (!beyondEdge) {
                            (scrollContainer[size]>iscrollerSize) && (beyondEdge=true);
                        }
                        else {
                            beyondEdgecount++;
                        }
                    }
                    if (shift) {
                        scrollContainer.setInlineStyle(start, (iscrollerStart-shift)+'px');
                    }
                    // now store the lowest and highest index that was drawn:
                    // we need it when updating:
                    scrollContainer.setData('_firstIndex', firstIndex);
                    scrollContainer.setData('_lastIndex', i-1);
                    scrollContainer.setData('_lowerNode', node);
                    scrollContainer.setData('_contSize', contSize);
                }
                // else, update content
                else {
                    // figure out if the new range has items that are already drawn:
                    prevFirstIndex = scrollContainer.getData('_firstIndex');
                    prevLastIndex = scrollContainer.getData('_lastIndex');
                    count = scrollContainerVChildNodes.length;
                    lastIndex = firstIndex + count - 1;
                    middleNodeIndex = firstIndex + Math.round((lastIndex-firstIndex)/2);
// TODO: size calculation might need to wait for inner i-tag elements to be rendered
                    if (!isDragging || ((firstIndex!==prevFirstIndex) || (lastIndex!==prevLastIndex))) {
                        firstChildNode = scrollContainerVChildNodes[0].domNode;
                        size2 = 0;
                        firstIsInside = ((firstIndex>=prevFirstIndex) && (firstIndex<=prevLastIndex));
                        lastIsInside = ((lastIndex>=prevFirstIndex) && (lastIndex<=prevLastIndex));
                        noOverlap = !firstIsInside && !lastIsInside;
                        if (noOverlap) {
                            // completely refill
                            for (i=firstIndex; i<=lastIndex; i++) {
                                item = items[i];
                                prevItem = items[i-1];
                                node = scrollContainerVChildNodes[i-firstIndex].domNode;
                                node.setHTML(element.drawItem(item, prevItem, i));
                                nodeSize = node[size];
                                contSize += nodeSize;
                                node.setData('_index', i);
                                (i===firstIndex) && scrollContainer.setData('_upperNode', node);
                                (i===startItemFloor) && (topNode=node);
                                (i===middleNodeIndex) && (middleNode=node);
                                (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                            }
                            scrollContainer.removeData('_lowerShiftNode');
                            scrollContainer.setData('_lowerNode', node);
                        }
                        else {
                            // the list is broken into 2 area's
                            // the division is at item "firstIndex", which IS NOT the first childNode!
                            // we start with the one item that we know that is already drawn and will redraw all others from that point.
                            len = scrollContainerVChildNodes.length;
                            draggedUp = scrollContainer.getData('_dragUp');
                            if (firstIsInside) {
                                // start with "firstIndex"
                                // first we need to find it:
                                for (i=0; i<len; i++) {
                                    node = scrollContainerVChildNodes[i].domNode;
                                    if (node.getData('_index')===firstIndex) {
                                        break;
                                    }
                                }
                                // "i" has the index of the first item to draw
                                // first, going up:
                                k = firstIndex - 1;
                                for (j=i; j<len; j++) {
                                    prevItem = items[k];
                                    item = items[++k];
                                    node = scrollContainerVChildNodes[j].domNode;
                                    // if (node.getData('_index')!==k) {
                                        if (item) {
                                            node.setHTML(element.drawItem(item, prevItem, k));
                                            lowerNode = node;
                                        }
                                        else {
                                            node.empty();
                                            node.setClass('empty');
                                        }
                                        node.setData('_index', k);
                                    // }
                                    nodeSize = node[size];
                                    contSize += nodeSize;
                                    (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                                    (k===startItemFloor) && (topNode=node);
                                    if (j===i) {
                                        indentNode = node;
                                        lowerShiftNodeIndex = i;
                                    }
                                    (k===middleNodeIndex) && (middleNode=node);
                                }
                                // now we are starting from 0 to i:
                                for (j=0; j<i; j++) {
                                    prevItem = items[k];
                                    item = items[++k];
                                    node = scrollContainerVChildNodes[j].domNode;
                                    // if (node.getData('_index')!==k) {
                                        if (item) {
                                            node.setHTML(element.drawItem(item, prevItem, k));
                                            lowerNode = node;
                                        }
                                        else {
                                            node.empty();
                                            node.setClass('empty');
                                        }
                                        node.setData('_index', k);
                                    // }
                                    (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                                    nodeSize = node[size];
                                    contSize += nodeSize;
                                    size2 += nodeSize;
                                    (k===startItemFloor) && (topNode=node);
                                    (j===0) && (indentNode2=node);
                                    (k===middleNodeIndex) && (middleNode=node);
                                }
                                scrollContainer.setData('_lowerNode', lowerNode);
                                scrollContainer.setData('_contSize', contSize);
                                scrollContainer.setData('_upperNode', indentNode);
                            }
                            else {
                                // --going down--
                                // start with "lastIndex"
                                // first we need to find it:
                                for (i=0; i<len; i++) {
                                    node = scrollContainerVChildNodes[i].domNode;
                                    if (node.getData('_index')===lastIndex) {
                                        break;
                                    }
                                }
                                // "i" has the index of the last item to draw
                                // first, going down:
                                k = lastIndex + 1;
                                for (j=i; j>=0; j--) {
                                    item = items[--k];
                                    prevItem = items[k-1];
                                    node = scrollContainerVChildNodes[j].domNode;
                                    if (node.getData('_index')!==k) {
                                        if (item) {
                                            node.setHTML(element.drawItem(item, prevItem, k));
                                        }
                                        else {
                                            node.empty();
                                            node.setClass('empty');
                                        }
                                        node.setData('_index', k);
                                    }
                                    nodeSize = node[size];
                                    contSize += nodeSize;
                                    (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                                    (k===startItemFloor) && (topNode=node);
                                    (j===0) && (indentNode2=node);
                                    if (j===i) {
                                        scrollContainer.setData('_lowerNode', node);
                                    }
                                    (k===middleNodeIndex) && (middleNode=node);
                                }
                                // now we are starting from len-1 downto i:
                                for (j=len-1; j>i; j--) {
                                    item = items[--k];
                                    prevItem = items[k-1];
                                    node = scrollContainerVChildNodes[j].domNode;
                                    if (node.getData('_index')!==k) {
                                        if (item) {
                                            node.setHTML(element.drawItem(item, prevItem, k));
                                        }
                                        else {
                                            node.empty();
                                            node.setClass('empty');
                                        }
                                        node.setData('_index', k);
                                    }
                                    (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                                    nodeSize = node[size];
                                    contSize += nodeSize;
                                    size2 += nodeSize;
                                    (k===startItemFloor) && (topNode=node);
                                    if (j===(i+1)) {
                                        indentNode = node;
                                        lowerShiftNodeIndex = i+1;
                                    }
                                    (k===middleNodeIndex) && (middleNode=node);
                                }
                                scrollContainer.setData('_contSize', contSize);
                            }
                            if (indentNode) {
                                if (indentNode2) {
                                    indentNode.setInlineStyle('margin-'+start, -contSize+'px');
                                    scrollContainer.setData('_lowerShiftNode', indentNode);
                                }
                            }
                            else {
                                scrollContainer.removeData('_lowerShiftNode');
                            }
                        }
                        // most middle element should be within the viewport.
                        // if it isn't anymore, we need to reset margin-top of the first childnode:
                        if ((middleNode[start]>iscrollerBottom) || (middleNode[end]<iscrollerStart)) {
                            sectionsShifted = -Math.floor((middleNode[start] - iscrollerStart)/contSize);
                            currentShift = parseInt((firstChildNode.getInlineStyle('margin-'+start) || 0), 10);
                            firstChildNode.setInlineStyle('margin-'+start, (currentShift+(sectionsShifted*contSize))+'px');
                        }
                        if (topNode && !isDragging) {
                            shift = topNode[start];
                            dif = (startItem-startItemFloor);
                            if (dif>0) {
                                shift += dif*topNode[size];
                            }
                            if (shiftFromFirstRange) {
                                shift -= scrollContainer[size]-size2;
                            }
                            scrollContainer.setInlineStyle(start, (scrollContainer[start]-shift)+'px');
                        }
                        scrollContainer.setData('_contSize', contSize);
                        scrollContainer.setData('_firstIndex', firstIndex);
                        scrollContainer.setData('_lastIndex', lastIndex);
                    }
                }
            },

            autoExpand: function() {
                var element = this,
                    model = element.model,
                    count = 0,
                    maxCount = 100, // if -for whatever reason- more than 100 items are added, than break
                    scrollContainer = element.getData('_scrollContainer'),
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes,
                    len = scrollContainerVChildNodes.length,
                    lowerNode = scrollContainer.getData('_lowerNode'),
                    items = element.getData('items'), // is the cloned version!
                    horizontal = model.horizontal,
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    size = horizontal ? 'width' : 'height',
                    maxIndex = items.length-1,
                    isDragging = element.hasData('_dragging'),
                    item, index, firstChildNode, startShift, lowerShiftNode, lowerShift, size1, lowerNodeAtPosZero, prevItem, startContainerShift;
                if (!isDragging && (len>0)) {
                    firstChildNode = scrollContainerVChildNodes[0].domNode;
                    startShift = parseInt(firstChildNode.getInlineStyle('margin-'+start) || 0, 10);
                    startContainerShift = parseInt(scrollContainer.getInlineStyle(start) || 0, 10);
                    lowerShiftNode = scrollContainer.getData('_lowerShiftNode');
                    lowerShiftNode && (lowerShift=parseInt(lowerShiftNode.getInlineStyle('margin-'+start) || 0, 10));
                    index = lowerNode.getData('_index');
                    lowerNodeAtPosZero = (lowerNode===firstChildNode);
// TODO: the while loop might need to wait for inner i-tag elements to be rendered
                    while ((lowerNode[start]<(element[end]+((margeItems-1)*lowerNode[size]))) && (++index<=maxIndex) && (++count<maxCount)) {
                        item = items[index];
                        prevItem = items[index-1];
                        lowerNode = scrollContainer.append('<section>'+element.drawItem(item, prevItem, index)+'</section>', false, lowerNodeAtPosZero ? null : lowerNode);
                        lowerNode.setData('_index', index);
                        scrollContainer.setData('_lastIndex', index);
                        scrollContainer.setData('_lowerNode', lowerNode);
                        if (lowerShiftNode) {
                            size1 = lowerNode[size];
                            startShift += size1;
                            lowerShift -= size1;
                            lowerShiftNode.setInlineStyle('margin-'+start, lowerShift+'px');
                            firstChildNode.setInlineStyle('margin-'+start, startShift+'px');
                            startContainerShift -= size1;
                            scrollContainer.setInlineStyle(start, startContainerShift+'px');
                        }
                    }
                }
            },

            redefineStartItem: function(resetContainer) {
                var element = this,
                    model = element.model,
                    horizontal = model.horizontal,
                    scrollContainer = element.getData('_scrollContainer'),
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    size = horizontal ? 'width' : 'height',
                    borderStart = element.getStyle('border-'+start+'width'),
                    iscrollerStart = element[start] + (parseInt(borderStart, 10) || 0),
                    vChildNodes = scrollContainer.vnode.vChildNodes,
                    len = vChildNodes.length,
                    partial, i, startItem, domNode, endPos, foundNode, corrections, highestEnd,
                    contSize, firstNode, currentStart, currentMarginStart;

                // find the first childNode that lies within the visible area:
                for (i=0; (i<len); i++) {
                    domNode = vChildNodes[i].domNode;
                    endPos = domNode[end];
                    if ((endPos>iscrollerStart) && ((highestEnd===undefined) || (endPos<highestEnd))) {
                        foundNode = domNode;
                        highestEnd = endPos;
                    }
                }
                if (foundNode) {
                    partial = (iscrollerStart-foundNode[start])/foundNode[size];
                    startItem = foundNode.getData('_index') + partial;
                    // Make it impossible to overrule when dragging by storing the data:
                    element.setData('_draggedStartItem', startItem);
                    model['start-item'] = startItem;
                    if (resetContainer) {
                        contSize = scrollContainer.getData('_contSize');
                        firstNode = vChildNodes[0].domNode;
                        currentMarginStart = parseInt(firstNode.getInlineStyle('margin-'+start) || 0, 10);
                        currentStart = parseInt(scrollContainer.getInlineStyle(start) || 0, 10);
                        corrections = Math.round(currentMarginStart/contSize);
                        if (Math.abs(corrections)>MAX_AREAS_SHIFTED) {
                            // prevent that movement gets a value that is too high for the dom to handle
                            scrollContainer.setInlineStyle(start, (currentStart+(corrections*contSize))+'px');
                            firstNode.removeInlineStyle('margin-'+start);
                        }
                        element.removeData('_dragging');
                    }
                }
            },

            drawItem: function(oneItem, prevItem, index) {
                var element = this,
                    model = element.model,
                    template = model.template,
                    headers = model.headers,
                    map = element.getData('_map'),
                    uriProperty = model['uri-property'],
                    odd = ((index%2)!==0),
                    itemContent = '',
                    generateDef, prevHeaderContentDefinition, headerContentDefinition, sameHeader;

                sameHeader = function(def1, def2, level) {
                    var iString, i;
                    for (i=level; i>=0; i--) {
                        iString = String(i);
                        if (def1[iString]!==def2[iString]) {
                            return false;
                        }
                    }
                    return true;
                };

                generateDef = function(item, addToContent) {
                    var len = headers.length,
                        def = {},
                        i, header, headerContent;
                    for (i=0; i<len; i++) {
                        header = headers[i];
                        // only process if item is an object
                        if (typeof item!=='string') {
                            if (header.indexOf('<%')!==-1) {
                                headerContent = microtemplate(header, item);
                            }
                            else {
                                headerContent = header.substitute(item);
                            }
                            def[String(i)] = headerContent;
                            if (addToContent && (!prevHeaderContentDefinition || !sameHeader(def, prevHeaderContentDefinition, i))) {
                                itemContent += '<section class="header'+(i+1)+'">'+headerContent+'</section>';
                            }
                        }
                    }
                    return def;
                };

                if (headers) {
                    headerContentDefinition = {};
                    if (prevItem) {
                        prevHeaderContentDefinition = map.get(prevItem);
                        prevHeaderContentDefinition || (prevHeaderContentDefinition=generateDef(prevItem));
                    }

                    headerContentDefinition = generateDef(oneItem, true);

                    map.set(oneItem, headerContentDefinition);
                }
                if (oneItem[uriProperty]) {
                    itemContent += '<a href="'+oneItem[uriProperty]+'">';
                }
                itemContent += '<section class="item'+(odd ? ' odd' : ' even')+'">';
                if (typeof oneItem==='string') {
                    itemContent += oneItem;
                }
                else {
                    if (template.indexOf('<%')!==-1) {
                        itemContent += microtemplate(template, oneItem);
                    }
                    else if (/{\S+}/.test(template)) {
                        itemContent += template.substitute(oneItem);
                    }
                    else {
                        itemContent += template;
                    }
                }
                itemContent += '</section>';
                if (oneItem[uriProperty]) {
                    itemContent += '</a>';
                }
                return itemContent;
            },

            destroy: function() {
                var element = this,
                    model = element.model;
                unregisterScroller(element);
                element.getData('_map').clear();
            }
        });

        itagCore.setLazyBinding(Itag, true);
        autoExpandScrollers();
        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
