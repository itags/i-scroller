module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margeItems = 2,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        IParcel = require('i-parcel')(window),
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        Itag;

    if (!window.ITAGS[itagName]) {
        Event.after('dd', function(e) {
            // start dragging
            var node = e.target,
                iscroller = node.getParent(),
                dragPromise = e.dd;
            // store initial start-item:
            iscroller.setData('_scrollBefore', iscroller.model['start-item']);
            iscroller.setData('_dragging', true);
            dragPromise.finally(function() {
console.warn('after dd-drag');
                iscroller.redefineStartItem(true);
                iscroller.removeData('_dragging');
            });
        }, 'i-scroller >span');

        Event.before('dd-drag', function(e) {
return;
            var node = e.target,
                iscroller = node.getParent(),
                up, left, clientX, clientY, y, lasty, lastShiftedNode;
            if (typeof e.center==='object') {
                clientX = e.center.x;
                clientY = e.center.y;
            }
            else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // e.xMouse = e2.clientX;
            up = (e.clientY>e.yMouse);
            left = (e.clientX>e.xMouse);

            if (up) {
                lastShiftedNode = iscroller.last('span.item'+(iscroller.getData('_firstShifted') ? '.shifted' : ''), iscroller);
                lasty = lastShiftedNode.top + lastShiftedNode.height;
                (lasty<=(iscroller.top+iscroller.height)) && e.preventDefault();
            }
            else {
                y = parseInt(node.getInlineStyle('top'), 10);
                (y>=0) && e.preventDefault();
            }
        }, 'i-scroller >span');

        // also: correction if dragging was too heavy and it bounced through the limit:
        Event.after('dd-drag', function(e) {
            e.target.getParent().redefineStartItem();
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
console.warn('startItem '+startItem);
                // store its current value, so that valueChange-event can fire:
                element.setData('i-scroller-value', value);

                // element.cleanupEvents();
                // element.setupEvents();

                // make it a focusable form-element:
                element.setAttr('itag-formelement', 'true', true);

                // define unique id:
                element['i-id'] = ITSA.idGenerator('i-scroller');
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
console.warn('sync');
                var element = this,
                    model = element.model,
                    items = model.items,
                    iscrollerHeight = element.height,
                    iscrollerTop = element.top,
                    scrollContainer = element.getData('_scrollContainer'),
                    startItem = model['start-item'],
                    start = model.horizontal ? 'left' : 'top',
                    dimension = model.horizontal ? 'width' : 'height',
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes, isDragging,
                    indentNode, indentNode2, height, shiftFromFirstRange, topNode, height2, scrolledPages, firstIsInside, lastIsInside,
                    beyondEdge, beyondEdgecount, node, shift, startItemFloor, dif, prevFirstIndex, prevLastIndex, count, noOverlap,
                    firstIndex, j, k, len, content, i, lastIndex, item, newHeight;

                content = '';

                // if container is empty: fill it as far as needed
                if (scrollContainer.isEmpty()) {
                    firstIndex = Math.max(0, Math.floor((startItem - margeItems)));
                    lastIndex = items.length-1;
                    beyondEdgecount = 0;
                    startItemFloor = Math.floor(startItem);
                    for (i=firstIndex; (i<=lastIndex) && (beyondEdgecount<(2*margeItems)); i++) {
                        item = items[i];
                        node = scrollContainer.append(element.drawItem(item, false));
                        node.setData('_index', i);
                        if (i===startItemFloor) {
                            shift = node[start];
                            dif = (startItem-startItemFloor);
                            if (dif>0) {
                                shift += dif*node[dimension];
                            }
                        }
                        if (!beyondEdge) {
                            (scrollContainer.height>iscrollerHeight) && (beyondEdge=true);
                        }
                        else {
                            beyondEdgecount++;
                        }
                    }
                    if (shift) {
                        scrollContainer.setInlineStyle(start, (iscrollerTop-shift)+'px');
                    }
                    // now store the lowest and highest index that was drawn:
                    // we need it when updating:
                    scrollContainer.setData('_firstIndex', firstIndex);
                    scrollContainer.setData('_lastIndex', i-1);
                    scrollContainer.setData('_count', i-1-firstIndex);
                }
                // else, update content
                else {
                    isDragging = element.hasData('_dragging');
                    // figure out if the new range has items that are already drawn:
                    prevFirstIndex = scrollContainer.getData('_firstIndex');
                    prevLastIndex = scrollContainer.getData('_lastIndex');
                    count = scrollContainer.getData('_count');
                    firstIndex = Math.floor(startItem - margeItems);
                    lastIndex = firstIndex + count;
                    if (firstIndex<0) {
                        lastIndex -= firstIndex;
                        firstIndex = 0;
                    }
console.warn('firstIndex '+firstIndex);
console.warn('lastIndex '+lastIndex);
console.warn('prevFirstIndex '+prevFirstIndex);
console.warn('prevLastIndex '+prevLastIndex);
                    if ((firstIndex!==prevFirstIndex) || (lastIndex!==prevLastIndex)) {
                            height2 = 0;
                            firstIsInside = ((firstIndex>=prevFirstIndex) && (firstIndex<=prevLastIndex));
                            lastIsInside = ((lastIndex>=prevFirstIndex) && (lastIndex<=prevLastIndex));
                            noOverlap = !firstIsInside && !lastIsInside;
                            startItemFloor = Math.floor(startItem);
                            if (noOverlap) {
console.warn('noOverlap');
                                // completely refill
                                for (i=firstIndex; i<=lastIndex; i++) {
                                    item = items[i];
                                    node = scrollContainerVChildNodes[i-firstIndex].domNode.replace(element.drawItem(item, false));
                                    node.setData('_index', i);
                                    (i===startItemFloor) && (topNode=node);
                                    node.removeInlineStyle('margin-top');
                                }
                            }
                            else {
                                // the list is broken into 2 area's
                                // the division is at item "firstIndex", which IS NOT the first childNode!
                                // we start with the one item that we know that is already drawn and will redraw all others from that point.
                                len = scrollContainerVChildNodes.length;
                                if (firstIsInside) {
console.warn('firstIsInside');
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
                                                node = node.replace(element.drawItem(item, false));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-top');
                                        (k===startItemFloor) && (topNode=node);
                                        (j===i) && (indentNode=node);
                                    }
                                    // now we are starting from 0 to i:
                                    for (j=0; j<i; j++) {
                                        item = items[++k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, false));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-top');
                                        height2 += node.height;
                                        (k===startItemFloor) && (topNode=node);
                                        (j===0) && (indentNode2=node);
                                    }
                                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    height = scrollContainer.height;
                                    if (indentNode2) {
                                        indentNode && indentNode.setInlineStyle('margin-top', -height+'px');
                                        indentNode2.setInlineStyle('margin-top', ((1+scrolledPages)*height)+'px');
                                    }
                                    else {
                                        node = scrollContainerVChildNodes[i].domNode;
                                        node.setInlineStyle('margin-top', ((1+scrolledPages)*height)+'px');
                                        scrolledPages++;
                                        scrollContainer.setData('_scrolledPages', scrolledPages);
                                    }
                                }
                                else if (lastIsInside) {
console.warn('lastIsInside');
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
console.warn('lastIndex '+lastIndex);
                                    for (j=i; j>=0; j--) {
console.warn('fase A');
                                        item = items[--k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, false));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-top');
                                        (k===startItemFloor) && (topNode=node);
                                        (j===0) && (indentNode2=node);
                                    }
                                    // now we are starting from len-1 downto i:
                                    for (j=len-1; j>i; j--) {
console.warn('fase B');
                                        item = items[--k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.replace(element.drawItem(item, false));
                                            }
                                            else {
                                                node.empty();
                                                node.setClass('empty');
                                            }
                                            node.setData('_index', k);
                                        }
                                        node.removeInlineStyle('margin-top');
                                        height2 += node.height;
                                        (k===startItemFloor) && (topNode=node);
                                        (j===(i+1)) && (indentNode=node);
                                    }
                                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    height = scrollContainer.height;
                                    if (len===i+2) {
console.warn('fase C');
                                        scrolledPages--;
                                        scrollContainer.setData('_scrolledPages', scrolledPages);
                                    }
                                    if (indentNode) {
console.warn('fase D');
                                        newHeight = ((1+scrolledPages)*height);
                                        indentNode2 && indentNode2.setInlineStyle('margin-top', newHeight+'px');
                                        indentNode.setInlineStyle('margin-top', -height+'px');
                                    }
                                    else {
console.warn('fase E');
                                        indentNode2 && indentNode2.setInlineStyle('margin-top', (scrolledPages*height)+'px');
                                    }
                                }
                            }
                            if (topNode && !isDragging) {
                                shift = topNode[start];
                                dif = (startItem-startItemFloor);
                                if (dif>0) {
                                    shift += dif*topNode[dimension];
                                }
                                if (shiftFromFirstRange) {
                                    shift -= scrollContainer.height-height2;
                                }
                                scrollContainer.setInlineStyle(start, (scrollContainer.top-shift)+'px');
                            }
                            scrollContainer.setData('_firstIndex', firstIndex);
                            scrollContainer.setData('_lastIndex', lastIndex);
                    }
                }
            },

            redefineStartItem: function(resetContainer) {
                var element = this,
                    model = element.model,
                    scrollContainer = element.getData('_scrollContainer'),
                    start = model.horizontal ? 'left' : 'top',
                    end = model.horizontal ? 'right' : 'bottom',
                    iscrollerStart = element[start],
                    highestEnd = 99999,
                    vChildNodes = scrollContainer.vnode.vChildNodes,
                    len = vChildNodes.length,
                    partial, i, firstVisibleNode, startItem, domNode, shift, height, scrolledPages, endPos;
                // find the first childNode that lies within the visible area:
                for (i=0; (i<len); i++) {
                    domNode = vChildNodes[i].domNode;
                    endPos = domNode[end];
                    if ((domNode[start]<=iscrollerStart) && (endPos>iscrollerStart) && (endPos<highestEnd)) {
                        firstVisibleNode = domNode;
                        highestEnd = endPos;
                    }
                }
                if (firstVisibleNode) {
                    partial = (iscrollerStart-firstVisibleNode[start])/domNode.height;
                    startItem = firstVisibleNode.getData('_index') + partial;
                }
                else {
                    startItem = 0;
                }
                model['start-item'] = startItem;
                if (resetContainer) {
                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                    if (scrolledPages!==0) {
                        height = scrollContainer.height;
                        // find the childNode with the first index
                        domNode = vChildNodes[0].domNode;
                        shift = parseInt(domNode.getInlineStyle('margin-'+start), 10) || 0;
                        shift -= (height*scrolledPages);
                        if (shift===0) {
                            domNode.removeInlineStyle('margin-'+start);
                        }
                        else {
                            domNode.setInlineStyle('margin-'+start, shift+'px');
                        }
                        // also for the container:
                        shift = parseInt(scrollContainer.getInlineStyle(start), 10) || 0;
                        shift += (height*scrolledPages);
                        scrollContainer.setInlineStyle(start, shift+'px');
                        scrollContainer.removeData('_scrolledPages');
                    }
                }
            },

            drawItem: function(oneItem, shifted, hidden) {
                var element = this,
                    model = element.model,
                    template = model.template,
                    itemContent = '<span class="item'+(shifted ? ' shifted' : '')+(hidden ? ' hidden' : '')+'">';
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
            }
        });

        itagCore.setLazyBinding(Itag, true);
        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
