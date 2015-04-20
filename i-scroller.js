module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margeItems = 1,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        AUTO_EXPAND_DELAY = 2000,
        IParcel = require('i-parcel')(window),
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
// expand has currently errors, when not expanding, but scrolled --> afterwards
// the scrollerContainer is shifted out of view
// THEREFORE comment `autoExpand()` for now:

                    // scrollers[i].autoExpand();

                }
            }, AUTO_EXPAND_DELAY, true);
        };

        Event.after('dd', function(e) {
            // start dragging
            var node = e.target,
                sourceNode = e.sourceTarget,
                iscroller = node.getParent(),
                dragPromise = e.dd;
            // store initial start-item:
            iscroller.setData('_scrollBefore', iscroller.model['start-item']);
        //            iscroller.setData('_dragging', true);
            dragPromise.finally(function() {
                iscroller.redefineStartItem(true);
                if (!iscroller.getData('_dragging')) {
                    var index;
                    sourceNode.matches('span.item') ||  (sourceNode=sourceNode.inside('span.item'));
                    index = sourceNode.getData('_index');
                    /**
                    * Emitted when a the i-select changes its value
                    *
                    * @event i-select:valuechange
                    * @param e {Object} eventobject including:
                    * @param e.target {HtmlElement} the i-select element
                    * @param e.prevValue {Number} the selected item, starting with 1
                    * @param e.newValue {Number} the selected item, starting with 1
                    * @param e.buttonText {String} the text that will appear on the button
                    * @param e.listText {String} the text as it is in the list
                    * @since 0.1
                    */
                    iscroller.emit('selected', {
                        newValue: sourceNode,
                        index: index,
                        item: iscroller.model.items[index]
                    });
                }
                iscroller.removeData('_dragging');
            });
        }, 'i-scroller >span');

        Event.before('dd-drag', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                scrollContainer = iscroller.getData('_scrollContainer'),
                model = iscroller.model,
                items = model.items,
                horizontal = model.horizontal,
                end = horizontal ? 'right' : 'bottom',
                start = horizontal ? 'left' : 'top',
                up, clientX, clientY, boundaryNode;

            if (typeof e.center==='object') {
                clientX = e.center.x;
                clientY = e.center.y;
            }
            else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            if (!iscroller.insidePos(e.xMouse, e.yMouse)) {
                e.preventDefault();
            }
            else {
                up = horizontal ? (e.clientX>e.xMouse) : (e.clientY>e.yMouse);
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
            }
        }, 'i-scroller >span');

        // also: correction if dragging was too heavy and it bounced through the limit:
        Event.after('dd-drag', function(e) {
            var node = e.target,
                iscroller = node.getParent(),
                scrollContainer = iscroller.getData('_scrollContainer'),
                model = iscroller.model,
                items = model.items,
                horizontal = model.horizontal,
                end = horizontal ? 'right' : 'bottom',
                start = horizontal ? 'left' : 'top',
                up, clientX, clientY, boundaryNode, difference, value, isDragging;
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
            up = horizontal ? (e.clientX>e.xMouse) : (e.clientY>e.yMouse);
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
            iscroller.redefineStartItem();
        }, 'i-scroller >span');

        Itag = IParcel.subClass(itagName, {
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
                'reset-value': 'string'
            },

            init: function() {
                var element = this,
                    // designNode = element.getItagContainer(),
                    model = element.model,
                    value = model.value || -1,
                    itemsize = model['item-size'] || '2em',
                    startItem = model['start-item'] || 0;

                element.defineWhenUndefined('value', value)
                       .defineWhenUndefined('item-size', itemsize)
                       .defineWhenUndefined('start-item', startItem)
                        // set the reset-value to the inital-value in case `reset-value` was not present
                       .defineWhenUndefined('reset-value', value);
                // store its current value, so that valueChange-event can fire:
                element.setData('i-scroller-value', value);

                // element.cleanupEvents();
                // element.setupEvents();

                // make it a focusable form-element:
                element.setAttr('itag-formelement', 'true', true);

                // define unique id:
                element['i-id'] = ITSA.idGenerator('i-scroller');

                element.itagReady().then(function() {
                    registerScroller(element);
                });
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
                    css = '<style type="text/css"></style>',
                    content = '<span plugin-dd="true" dd-direction="y"></span>';
                // mark element its i-id:
                element.setAttr('i-id', element['i-id']);

                // set element css:
                element.addSystemElement(css, false, true);
                // set the content:
                element.setHTML(content);
                // for quick access to the scrollcontainer, we add it as data:
                element.setData('_scrollContainer', element.getElement('>span'));

            },

            sync: function() {
                var element = this,
                    model = element.model,
                    items = model.items,
                    horizontal = model.horizontal,
                    size = horizontal ? 'width' : 'height',
                    start = horizontal ? 'left' : 'top',
                    iscrollerSize = element[size],
                    iscrollerStart = element[start],
                    scrollContainer = element.getData('_scrollContainer'),
                    startItem = model['start-item'],
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes,
                    indentNode, indentNode2, size1, shiftFromFirstRange, topNode, size2, scrolledPages, firstIsInside, lastIsInside,
                    beyondEdge, beyondEdgecount, node, shift, startItemFloor, dif, prevFirstIndex, prevLastIndex, count, noOverlap,
                    firstIndex, j, k, len, content, i, lastIndex, item, newHeight, isDragging, decreaseScrollPages, lowerNode;

                content = '';

                // if container is empty: fill it as far as needed
                if (scrollContainer.isEmpty()) {
                    firstIndex = Math.max(0, Math.floor((startItem - margeItems)));
                    lastIndex = items.length-1;
                    beyondEdgecount = 0;
                    startItemFloor = Math.floor(startItem);
                    for (i=firstIndex; (i<=lastIndex) && (beyondEdgecount<(2*margeItems)); i++) {
                        item = items[i];
                        node = scrollContainer.append(element.drawItem(item, i));
                        node.setData('_index', i);
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
                }
                // else, update content
                else {
                    isDragging = element.hasData('_dragging');
                    // figure out if the new range has items that are already drawn:
                    prevFirstIndex = scrollContainer.getData('_firstIndex');
                    prevLastIndex = scrollContainer.getData('_lastIndex');
                    count = scrollContainerVChildNodes.length;
                    firstIndex = Math.floor(startItem - margeItems);
                    lastIndex = firstIndex + count;
                    if (firstIndex<0) {
                        lastIndex -= firstIndex;
                        firstIndex = 0;
                    }
                    if (!isDragging || ((firstIndex!==prevFirstIndex) || (lastIndex!==prevLastIndex))) {
                            size2 = 0;
                            firstIsInside = ((firstIndex>=prevFirstIndex) && (firstIndex<=prevLastIndex));
                            lastIsInside = ((lastIndex>=prevFirstIndex) && (lastIndex<=prevLastIndex));
                            noOverlap = !firstIsInside && !lastIsInside;
                            startItemFloor = Math.floor(startItem);
                            if (noOverlap) {
                                // completely refill
                                for (i=firstIndex; i<lastIndex; i++) {
                                    item = items[i];
                                    node = scrollContainerVChildNodes[i-firstIndex].domNode.replace(element.drawItem(item, i));
                                    node.setData('_index', i);
                                    (i===firstIndex) && scrollContainer.setData('_upperNode', node);
                                    (i===startItemFloor) && (topNode=node);
                                    node.removeInlineStyle('margin-'+start);
                                }
                                scrollContainer.removeData('_lowerShiftNode');
                                scrollContainer.setData('_lowerNode', node);
                            }
                            else {
                                // the list is broken into 2 area's
                                // the division is at item "firstIndex", which IS NOT the first childNode!
                                // we start with the one item that we know that is already drawn and will redraw all others from that point.
                                len = scrollContainerVChildNodes.length;
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
                                        item = items[++k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, k));
                                                lowerNode = node;
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-'+start);
                                        (k===startItemFloor) && (topNode=node);
                                        (j===i) && (indentNode=node);
                                    }
                                    // now we are starting from 0 to i:
                                    for (j=0; j<i; j++) {
                                        item = items[++k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, k));
                                                lowerNode = node;
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-'+start);
                                        size2 += node[size];
                                        (k===startItemFloor) && (topNode=node);
                                        (j===0) && (indentNode2=node);
                                    }
                                    scrollContainer.setData('_lowerNode', lowerNode);
                                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    size1 = scrollContainer[size];
                                    scrollContainer.setData('_contSize', size1);
                                    if (indentNode2) {
                                        indentNode && indentNode.setInlineStyle('margin-'+start, -size1+'px');
                                        indentNode2.setInlineStyle('margin-'+start, ((1+scrolledPages)*size1)+'px');
                                        scrollContainer.setData('_lowerShiftNode', indentNode);
                                    }
                                    else {
                                        node = scrollContainerVChildNodes[i].domNode;
                                        node.setInlineStyle('margin-'+start, ((1+scrolledPages)*size1)+'px');
                                        scrolledPages++;
                                        scrollContainer.setData('_scrolledPages', scrolledPages);
                                        scrollContainer.removeData('_lowerShiftNode');
                                    }
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
                                    decreaseScrollPages = true;
                                    for (j=i; j>=0; j--) {
                                        item = items[--k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, k));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-'+start);
                                        (k===startItemFloor) && (topNode=node);
                                        (j===0) && (indentNode2=node);
                                        if (j===i) {
                                            scrollContainer.setData('_lowerNode', node);
                                        }
                                        else {
                                            decreaseScrollPages = false;
                                        }
                                    }
                                    // now we are starting from len-1 downto i:
                                    for (j=len-1; j>=i; j--) {
                                        item = items[--k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, k));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-'+start);
                                        size2 += node[size];
                                        (k===startItemFloor) && (topNode=node);
                                        (j===i) && (indentNode=node);
                                    }
                                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    size1 = scrollContainer[size];
                                    scrollContainer.setData('_contSize', size1);
                                    if (decreaseScrollPages) {
                                        scrolledPages--;
                                        scrollContainer.setData('_scrolledPages', scrolledPages);
                                        scrollContainer.removeData('_lowerShiftNode');
                                    }
                                    newHeight = ((1+scrolledPages)*size1);
                                    indentNode2 && indentNode2.setInlineStyle('margin-'+start, newHeight+'px');
                                    if (!decreaseScrollPages) {
                                        indentNode.setInlineStyle('margin-'+start, -size1+'px');
                                        scrollContainer.setData('_lowerShiftNode', indentNode);
                                    }
                                    scrollContainer.setData('_upperNode', node);
                                }
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
                            scrollContainer.setData('_firstIndex', firstIndex);
                            scrollContainer.setData('_lastIndex', lastIndex);
                    }
                }
            },

            autoExpand: function() {
                var element = this,
                    model = element.model,
                    scrollContainer = element.getData('_scrollContainer'),
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes,
                    count = scrollContainerVChildNodes.length,
                    lowerNode = scrollContainer.getData('_lowerNode'),
                    items = model.items,
                    horizontal = model.horizontal,
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    size = horizontal ? 'width' : 'height',
                    maxIndex = items.length-1,
                    isDragging = element.hasData('_dragging'),
                    item, index, firstChildNode, startShift, lowerShiftNode, lowerShift, size1, lowerNodeAtPosZero;
                if (!isDragging && (count>0)) {
                    firstChildNode = scrollContainerVChildNodes[0].domNode;
                    startShift = parseInt(firstChildNode.getInlineStyle('margin-'+start), 10);
                    lowerShiftNode = scrollContainer.getData('_lowerShiftNode');
                    lowerShiftNode && (lowerShift=parseInt(lowerShiftNode.getInlineStyle('margin-'+start), 10));
                    index = lowerNode.getData('_index');
                    lowerNodeAtPosZero = (lowerNode===firstChildNode);
                    while ((lowerNode[start]<element[end]) && (++index<=maxIndex)) {
                        item = items[index];
                        lowerNode = scrollContainer.append(element.drawItem(item, index), false, !lowerNodeAtPosZero ? lowerNode : null);
                        lowerNode.setData('_index', index);
                        scrollContainer.setData('_lastIndex', index);
                        scrollContainer.setData('_lowerNode', lowerNode);
                        size1 = lowerNode[size];
                        startShift += size1;
                        if (lowerShiftNode) {
                            lowerShift -= size1;
                            lowerShiftNode.setInlineStyle('margin-'+start, lowerShift+'px');
                            firstChildNode.setInlineStyle('margin-'+start, startShift+'px');
                            startShift = parseInt(scrollContainer.getInlineStyle(start), 10);
                            startShift -= size1;
                            scrollContainer.setInlineStyle(start, startShift+'px');
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
                    iscrollerStart = element[start],
                    highestEnd = 99999,
                    highestEndNotFound = highestEnd,
                    vChildNodes = scrollContainer.vnode.vChildNodes,
                    len = vChildNodes.length,
                    partial, i, firstVisibleNode, firstVisibleNodeNotFound, startItem, domNode, endPos, foundNode,
                    contHeight, firstNode, value, scrolledPages;
                // find the first childNode that lies within the visible area:
                for (i=0; (i<len); i++) {
                    domNode = vChildNodes[i].domNode;
                    endPos = domNode[end];
                    if ((endPos>iscrollerStart) && (endPos<highestEnd)) {
                        if (domNode[start]<=iscrollerStart) {
                            firstVisibleNode = domNode;
                            highestEnd = endPos;
                        }
                        else if (endPos<highestEndNotFound) {
                            // need to search for the highest item when there was none
                            firstVisibleNodeNotFound = domNode;
                            highestEndNotFound = endPos;
                        }
                    }
                }
                foundNode = firstVisibleNode || firstVisibleNodeNotFound;
                if (foundNode) {
                    partial = (iscrollerStart-foundNode[start])/foundNode[size];
                    startItem = foundNode.getData('_index') + partial;
                }
                else {
                    startItem = 0;
                }
                model['start-item'] = startItem;
                if (resetContainer) {
                    scrolledPages = scrollContainer.getData('_scrolledPages');
                    if (scrolledPages) {
                        contHeight = scrollContainer.getData('_contSize');
                        value = parseInt(scrollContainer.getInlineStyle(start), 10);
                        scrollContainer.setInlineStyle(start, (value+(scrolledPages*contHeight))+'px');
                        firstNode = vChildNodes[0].domNode;
                        value = parseInt(firstNode.getInlineStyle('margin-'+start), 10) || 0;
                        firstNode.setInlineStyle('margin-'+start, (value-(scrolledPages*contHeight))+'px');
                    }
                    scrollContainer.removeData('_scrolledPages');
                }
            },

            drawItem: function(oneItem, index) {
                var element = this,
                    model = element.model,
                    template = model.template,
                    odd = ((index%2)!==0),
                    itemContent = '<span class="item'+(odd ? ' odd' : '')+'">';
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
                itemContent += '</span>';
                return itemContent;
            },

            destroy: function() {
                unregisterScroller(this);
            }
        });

        itagCore.setLazyBinding(Itag, true);
        autoExpandScrollers();
        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
