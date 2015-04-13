module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margePx = 100,
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
            viewHeight = element.offsetHeight,
            visibleItems = Math.ceil(viewHeight/itemsize);
    };
*/
    if (!window.ITAGS[itagName]) {

        Event.before('dd-drag', function(e) {
            var node = e.target,
                nodeHeight = node.offsetHeight,
                iscroller = node.getParent(),
                iscrollerHeight = iscroller.offsetHeight,
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
                nodeHeight = node.offsetHeight,
                iscroller = node.getParent(),
                iscrollerHeight = iscroller.offsetHeight,
                y, lasty, lastShiftedNode, correction, currenty;
            y = parseInt(node.getInlineStyle('top'), 10);
            lastShiftedNode = iscroller.last('span.item'+(iscroller.getData('_firstShifted') ? '.shifted' : ''), iscroller);
            lasty = lastShiftedNode.top + lastShiftedNode.height;
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
            if (iscroller.getFirstItem()!==iscroller.getData('_firstItem')) {
                iscroller.syncUI();
            }
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
                'scroll-amount': 'number',
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
                    scrollamount = model['scroll-amount'] || 0;

                element.defineWhenUndefined('value', value)
                       .defineWhenUndefined('item-size', itemsize)
                       .defineWhenUndefined('scroll-amount', scrollamount)
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
            },

            sync: function() {
console.warn('sync');
                var element = this,
                    model = element.model,
                    items = model.items,
                    itemsize = model['item-size'],
                    scrollContainer = element.getElement('>span'),
                    cssNode = element.getElement('>style', true),
                    firstItemDrawn = element.getFirstItem(),
                    totalItemsSize, listsizeNumber, listsizeNumberString, listsizeUnit, first, lastItemDrawn, y,
                    totalItems, content, i, last, item, css, prevFirstItemDrawn, shiftCount, prevFirstShifted;

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


                lastItemDrawn = firstItemDrawn + totalItems - 1;



                prevFirstItemDrawn = element.getData('_firstItem');
                prevFirstShifted = element.getData('_firstShifted') || 0;

                shiftCount = (typeof prevFirstItemDrawn==='number') ? (firstItemDrawn-prevFirstItemDrawn+prevFirstShifted) : 0;

                if (shiftCount>=totalItems) {
                    // reset the containerframe
                    shiftCount = 0;
                    y = parseInt(scrollContainer.getInlineStyle('top'), 10);
                    // define newy:
                    y += element.height;
                    scrollContainer.setInlineStyle('top', Math.min(0, y)+'px');
                }


                // first draw the shifted items:
                first = lastItemDrawn-shiftCount+1;
                last = (shiftCount===0) ? -1 : (first+shiftCount-1);
                // last = firstItemDrawn+totalItems+prevFirstShifted;
console.warn('shiftCount '+shiftCount);
console.warn('first '+first);
console.warn('last '+last);

                element.setData('_firstShifted', Math.max(0,(last-first+1)));
                for (i=first; i<=last; i++) {
                    item = items[i];
                    content += element.drawItem(item, true);
                }




                // next, draw the non-shifted items:
                first = firstItemDrawn;
                last = firstItemDrawn+totalItems-1-shiftCount;
console.warn('2. first '+first);
console.warn('2. last '+last);
                for (i=first; i<=last; i++) {
                    item = items[i];
                    content += element.drawItem(item, false);
                }


                // set the content:
                scrollContainer.setHTML(content);
                element.setData('_firstItem', firstItemDrawn);
            },

            getRenderedItems: function(firstItemDrawn) {
                var element = this,
                    model = element.model,
                    items = model.items,
                    count = 12;
                return Math.min(count, items.length-firstItemDrawn);
                // return this.model.items.length;
            },

            getFirstItem: function() {
                var element = this,
                    model = element.model,
                    items = model.items,
                    scrollContainer = element.getElement('>span'),
                    shiftedPixels, firstItemNode, itemNodeSize, tempNode;
                shiftedPixels = Math.max(0, -parseInt(scrollContainer.getInlineStyle(model.horizontal ? 'left' : 'top') || 0, 10));
                firstItemNode = scrollContainer.getElement('>span');
                if (firstItemNode) {
                    itemNodeSize = firstItemNode['offset'+(model.horizontal ? 'Width' : 'Height')];
                }
                else {
                    // draw dummyNode to calculate true size in pixels
                    if (items.length>0) {
                        tempNode = scrollContainer.append(element.drawItem(items[0], false, true));
                        itemNodeSize = tempNode['offset'+(model.horizontal ? 'Width' : 'Height')];
                        tempNode.remove();
                    }
                    else {
                        itemNodeSize = 0;
                    }
                }
console.warn('getFirstItem '+((itemNodeSize===0) ? 0 : Math.floor(shiftedPixels/itemNodeSize)));
                return (itemNodeSize===0) ? 0 : Math.floor(shiftedPixels/itemNodeSize);
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
