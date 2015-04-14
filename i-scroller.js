module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margeItems = 5,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        IParcel = require('i-parcel')(window),
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        repositionItems, Itag;
/*
    repositionItems = function(element) {
        var itemsize = element.model['item-size'],
            margeItems = Math.ceil(margePx/itemsize),
            viewHeight = element.height,
            visibleItems = Math.ceil(viewHeight/itemsize);
    };
*/
    if (!window.ITAGS[itagName]) {
        Event.after('dd', function(e) {
            // start dragging
            var node = e.target,
                iscroller = node.getParent(),
                dragPromise = e.dd;
            // store initial start-item:
            iscroller.setData('_scrollBefore', iscroller.model['start-item']);
            dragPromise.finally(function() {
                iscroller.redefineStartItem(true);
            });
        }, 'i-scroller >span');

        Event.before('dd-drag', function(e) {
return;
            var node = e.target,
                nodeHeight = node.height,
                iscroller = node.getParent(),
                iscrollerHeight = iscroller.height,
                up, left, clientX, clientY, y, x, lasty, lastShiftedNode;
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
            var node = e.target,
                nodeHeight = node.height,
                iscroller = node.getParent(),
                iscrollerHeight = iscroller.height,
                y, lasty, lastShiftedNode, correction, currenty;
            y = parseInt(node.getInlineStyle('top'), 10);
            lastShiftedNode = iscroller.last('span.item'+(iscroller.getData('_firstShifted') ? '.shifted' : ''), iscroller);
            lasty = lastShiftedNode.top + lastShiftedNode.height;
/*
            if (y>0) {
                node.setInlineStyle('top', '0px');
            }
            else if (lasty<(iscroller.top+iscroller.height)) {
                correction = iscroller.top+iscroller.height-lasty;
                currenty = parseInt(node.getInlineStyle('top'), 10);
                // define newy:
                currenty += correction;
                node.setInlineStyle('top', Math.min(0, currenty)+'px');
            }
*/
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
                    itemsize = model['item-size'],
                    iscrollerHeight = element.height,
                    iscrollerTop = element.top,
                    scrollContainer = element.getData('_scrollContainer'),
                    cssNode = element.getElement('>style', true),
                    startItem = model['start-item'],
                    start = model.horizontal ? 'left' : 'top',
                    dimension = model.horizontal ? 'width' : 'height',
                    firstItemDrawn = element.getFirstItem(),
                    totalItemsSize, listsizeNumber, listsizeNumberString, listsizeUnit, firstIndex, lastItemDrawn, y,
                    beyondEdge, beyondEdgecount, node, shift, startItemFloor, dif,
                    totalItems, content, i, lastIndex, item, css, prevFirstItemDrawn, shiftCount, prevFirstShifted, countUpperArea;

                // start with the calculation of the current item-size in pixels: we need this

                totalItems = element.getRenderedItems(firstItemDrawn);

                listsizeNumber = parseInt(itemsize, 10);
                listsizeNumberString = String(listsizeNumber);
                listsizeUnit = itemsize.substr(listsizeNumberString.length);
                totalItemsSize = totalItems * listsizeNumber;

                css = 'i-scroller[i-id="'+element['i-id']+'"] span.item{'+(model.horizontal ? 'width' : 'height')+':'+itemsize+'}'+
                      'i-scroller[i-id="'+element['i-id']+'"] span.item.shifted{'+(model.horizontal ? 'left' : 'top')+':'+totalItemsSize+listsizeUnit+'}';
                cssNode.setText(css);

                // building the content of the itag:
                content = '';

                // if container is empty: fill it as far as needed
                if (scrollContainer.isEmpty()) {
                    firstIndex = Math.max(0, (startItem - margeItems));
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
                }
                // else, update content
                else {

                }

/*
                lastItemDrawn = firstItemDrawn + totalItems - 1;



                prevFirstItemDrawn = element.getData('_firstItem');
                prevFirstShifted = element.getData('_firstShifted') || 0;

                countUpperArea = Math.ceil(margePx/element.calculatedSize());
                shiftCount = (typeof prevFirstItemDrawn==='number') ? (firstItemDrawn-prevFirstItemDrawn+prevFirstShifted) : 0;


                y = parseInt(scrollContainer.getInlineStyle('top'), 10);
                if (shiftCount>=totalItems) {
                    // reset the containerframe
                    shiftCount = 0;
                    // define newy:
                    y += scrollContainer.height;
                    y = Math.min(0, y);
                    scrollContainer.setInlineStyle('top', y+'px');
                }


                // first draw the shifted items:
                first = lastItemDrawn-shiftCount+1;
                last = (shiftCount<=0) ? -1 : (first+shiftCount-1);
                // last = firstItemDrawn+totalItems+prevFirstShifted;

                element.setData('_firstShifted', Math.max(0,(last-first+1)));
                for (i=first; i<=last; i++) {
                    item = items[i];
                    content += element.drawItem(item, true);
                }




                // next, draw the non-shifted items:
                first = firstItemDrawn;
                last = firstItemDrawn+totalItems-1-shiftCount;
                for (i=first; i<=last; i++) {
                    item = items[i];
                    content += element.drawItem(item, false);
                }


                // set the content:
                scrollContainer.setHTML(content);
                element.setData('_firstItem', firstItemDrawn);
*/
            },

            redefineStartItem: function(resetContainer) {
                var element = this,
                    model = element.model,
                    scrollContainer = element.getData('_scrollContainer'),
                    start = [model.horizontal ? 'left' : 'top'],
                    end = [model.horizontal ? 'right' : 'bottom'],
                    iscrollerStart = element[start],
                    vChildNodes = scrollContainer.vnode.vChildNodes,
                    len = vChildNodes.length,
                    partial, i, firstVisibleNode, domNodefirstVisibleNode, startItem, domNode;
                // find the first childNode that lies within the visible area:
                for (i=0; (i<len) && !firstVisibleNode; i++) {
                    domNode = vChildNodes[i].domNode;
                    if (domNode[end]>iscrollerStart) {
                        firstVisibleNode = domNode;
                    }
                }
                if (firstVisibleNode) {
                    partial = (iscrollerStart-domNode[start])/domNode.height;
                    startItem = firstVisibleNode.getData('_index') + partial;
                }
                else {
                    startItem = 0;
                }
console.warn('startItem '+startItem);
                model['start-item'] = startItem;
            },

            getRenderedItems: function(firstItemDrawn) {
                var element = this,
                    model = element.model,
                    items = model.items,
                    contSize = element[model.horizontal ? 'width' : 'height'] + 2*margeItems,
                    count = Math.ceil(contSize/element.calculatedSize());
                return Math.min(count, items.length-firstItemDrawn);
                // return this.model.items.length;
            },

            getFirstItem: function() {
                var element = this,
                    model = element.model,
                    scrollContainer = element.getData('_scrollContainer'),
                    startItem = model['start-item'],
                    itemNodeSize = element.calculatedSize(),
                    shiftedPixels;
                shiftedPixels = Math.max(0, -parseInt(scrollContainer.getInlineStyle(model.horizontal ? 'left' : 'top') || 0, 10))-margeItems;
                return (itemNodeSize===0) ? 0 : Math.max(0, Math.floor(shiftedPixels/itemNodeSize));
            },

            calculatedSize: function() {
                var element = this,
                    model = element.model,
                    items = model.items,
                    scrollContainer = element.getData('_scrollContainer'),
                    firstItemNode, tempNode, itemNodeSize;
                firstItemNode = scrollContainer.getElement('>span');
                if (firstItemNode) {
                    itemNodeSize = firstItemNode[model.horizontal ? 'width' : 'height'];
                }
                else {
                    // draw dummyNode to calculate true size in pixels
                    if (items.length>0) {
                        tempNode = scrollContainer.append(element.drawItem(items[0], false, true));
                        itemNodeSize = tempNode[model.horizontal ? 'width' : 'height'];
                        tempNode.remove();
                    }
                    else {
                        itemNodeSize = 0;
                    }
                }
                return itemNodeSize;
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
