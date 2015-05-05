module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margeItems = 3,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        Event = ITSA.Event,
        AUTO_EXPAND_DELAY = 2000,
        AUTO_REFRESH_STARTITEM_DURING_SWIPE = 50,
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
            dragPromise.finally(function() {
                iscroller.redefineStartItem(true);


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


                iscroller.removeData('_dragging');
            });
        }, 'i-scroller >span, i-table >span');

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
        }, 'i-scroller >span, i-table >span');

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
            scrollContainer.setData('_dragUp', up);
            iscroller.redefineStartItem();
        }, 'i-scroller >span, i-table >span');

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
                'reset-value': 'string',
                'uri-property': 'string', // model's property that holds the uri --> if present, then an anchor-element is rendered
                'fixed-headers': 'string' // whether to fix the headers during scrolling. The headers should be defined by the template
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

            contTag: 'span',

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
                    content = '<'+containerTag+' plugin-dd="true" dd-direction="y"></'+containerTag+'>';
                // mark element its i-id:
                element.setAttr('i-id', element['i-id']);

                // set the content:
                element.setHTML(content);
                // for quick access to the scrollcontainer, we add it as data:
                element.setData('_scrollContainer', element.getElement('>'+containerTag));

            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method swipe
            * @param distance {Number} distance in pixels
            * @param [duration=3] {Number} duration of the transition in seconds
            * @since 0.0.1
            */
            swipe: function(distance, duration) {
console.info('SWIPE');
                var element = this,
                    property = element.model.horizontal ? 'left' : 'top',
                    scrollContainer = element.getData('_scrollContainer'),
                    newValue = parseInt((scrollContainer.getInlineStyle(property) || 0), 10) - distance,
                    timer, transPromise, returnPromise;

                element.setData('_dragging', true);
                scrollContainer.setData('_dragUp', (distance>0));
                timer = ITSA.later(function() {
                    element.redefineStartItem();
                }, AUTO_REFRESH_STARTITEM_DURING_SWIPE, true);
                transPromise = scrollContainer.transition({
                    property: property,
                    value: newValue+'px',
                    duration: duration || 3
                });
                returnPromise = new window.Promise(function(resolve) {
                    transPromise.then(function() {
                        // go async to make model sets its new value
                        ITSA.async(function() {
                            timer.cancel();
                            element.redefineStartItem(true);
                            // go async again to make model sets its new value
                            ITSA.async(resolve);
                        });
                    });
                });
                // merge the transitionHandles to the new Promise:
                returnPromise.cancel = transPromise.cancel.bind(transPromise);
                returnPromise.freeze = transPromise.freeze.bind(transPromise);
                returnPromise.finish = transPromise.finish.bind(transPromise);
                return returnPromise;
            },

            sync: function() {
// console.warn('SYNC');
                var element = this,
                    model = element.model,
                    items = model.items,
                    horizontal = model.horizontal,
                    size = horizontal ? 'width' : 'height',
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    iscrollerSize = element[size],
                    borderStart = element.getStyle('border-'+start+'width'),
                    borderBottom = element.getStyle('border-'+end+'width'),
                    iscrollerStart = element[start] + (parseInt(borderStart, 10) || 0),
                    iscrollerBottom = element[end] + (parseInt(borderBottom, 10) || 0),
                    scrollContainer = element.getData('_scrollContainer'),
                    isDragging = element.hasData('_dragging'),
                    startItem = isDragging ? element.getData('_draggedStartItem') : model['start-item'], // impossible to overrule when dragging
                    startItemFloor = Math.floor(startItem),
                    scrollContainerVChildNodes = scrollContainer.vnode.vChildNodes,
                    indentNode, indentNode2, shiftFromFirstRange, topNode, size2, scrolledPages, firstIsInside, lastIsInside, draggedUp, middleNodeIndex, nodeSize, contSize,
                    beyondEdge, beyondEdgecount, node, shift, dif, prevFirstIndex, prevLastIndex, count, noOverlap, prevLowerShiftNodeIndex, middleNode, firstChildNode,
                    firstIndex, j, k, len, content, i, lastIndex, item, newHeight, lowerNode, prevItem, lowerShiftNodeIndex, sectionsShifted, currentStart, currentShift;

// console.warn('SYNC isDragging: '+isDragging+' | startItem: '+startItem);
                content = '';
                // if container is empty: fill it as far as needed
                firstIndex = Math.max(0, Math.round((startItem - margeItems)));
                contSize = 0;
                if (scrollContainer.isEmpty()) {
console.warn('container is empty');
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
// console.warn('firstIndex '+prevFirstIndex+' --> '+firstIndex);
// console.warn('lastIndex '+prevLastIndex+' --> '+lastIndex);

                    if (!isDragging || ((firstIndex!==prevFirstIndex) || (lastIndex!==prevLastIndex))) {
                            firstChildNode = scrollContainerVChildNodes[0].domNode;
                            size2 = 0;
                            firstIsInside = ((firstIndex>=prevFirstIndex) && (firstIndex<=prevLastIndex));
                            lastIsInside = ((lastIndex>=prevFirstIndex) && (lastIndex<=prevLastIndex));
                            noOverlap = !firstIsInside && !lastIsInside;
                            if (noOverlap) {
console.warn('no overlap');
                                // completely refill
                                for (i=firstIndex; i<=lastIndex; i++) {
                                    item = items[i];
                                    prevItem = items[i-1];
                                    node = scrollContainerVChildNodes[i-firstIndex].domNode.setHTML(element.drawItem(item, prevItem, i));
                                    nodeSize = node[size];
                                    contSize += nodeSize;
                                    node.setData('_index', i);
                                    (i===firstIndex) && scrollContainer.setData('_upperNode', node);
                                    (i===startItemFloor) && (topNode=node);
                                    (i===middleNodeIndex) && (middleNode=node);
                                    (firstChildNode===node) || node.removeInlineStyle('margin-'+start);
                                }
                                scrollContainer.removeData('_lowerShiftNode');
                                scrollContainer.removeData('_lowerShiftNodeIndex');
                                scrollContainer.setData('_lowerNode', node);
                                scrollContainer.removeData('_scrolledPages');
                            }
                            else {
                                // the list is broken into 2 area's
                                // the division is at item "firstIndex", which IS NOT the first childNode!
                                // we start with the one item that we know that is already drawn and will redraw all others from that point.
                                len = scrollContainerVChildNodes.length;
                                draggedUp = scrollContainer.getData('_dragUp');
                                if (firstIsInside) {
console.warn('first inside');
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
console.warn('fase 1.a');
                                        prevItem = items[k];
                                        item = items[++k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.setHTML(element.drawItem(item, prevItem, k));
                                                lowerNode = node;
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
                                        if (j===i) {
                                            indentNode = node;
                                            lowerShiftNodeIndex = i;
                                        }
                                        (k===middleNodeIndex) && (middleNode=node);
                                    }
                                    // now we are starting from 0 to i:
                                    for (j=0; j<i; j++) {
console.warn('fase 1.b');
                                        prevItem = items[k];
                                        item = items[++k];
                                        node = scrollContainerVChildNodes[j].domNode;
                                        if (node.getData('_index')!==k) {
                                            if (item) {
                                                node = node.setHTML(element.drawItem(item, prevItem, k));
                                                lowerNode = node;
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
                                        (j===0) && (indentNode2=node);
                                        (k===middleNodeIndex) && (middleNode=node);
                                    }
                                    scrollContainer.setData('_lowerNode', lowerNode);
                                    scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    scrollContainer.setData('_contSize', contSize);



                                    indentNode2 && indentNode && indentNode.setInlineStyle('margin-'+start, -contSize+'px');
indentNode2 && indentNode && console.warn('indentNode: '+indentNode.getOuterHTML());

//                                     prevLowerShiftNodeIndex = scrollContainer.getData('_lowerShiftNodeIndex');



// console.warn('scrollContainer.getInlineStyle(start) '+scrollContainer.getInlineStyle(start));

// newHeight = size1*((indentNode2 ? 1 : 0)-Math.ceil(parseInt(scrollContainer.getInlineStyle(start) || 0, 10)/size1));
// console.warn('newHeight '+(indentNode2 ? size1 : 0)+'+'+(size1*(-Math.ceil(parseInt(scrollContainer.getInlineStyle(start) || 0, 10)/size1)))+' --> '+newHeight);


                                    // if (indentNode2) {
// console.warn('Fase 2');
// if (indentNode) {
//     console.warn('indentNode: '+indentNode.getOuterHTML());
// }
// else {
//     console.warn(' NO indentNode ?!?');
// }
// console.warn('indentNode2: '+indentNode2.getOuterHTML());

//                                         indentNode && indentNode.setInlineStyle('margin-'+start, -size1+'px');
//                                         // indentNode2.setInlineStyle('margin-'+start, ((1+scrolledPages)*size1)+'px');

//                                         indentNode2.setInlineStyle('margin-'+start, newHeight+'px');

//                                         scrollContainer.setData('_lowerShiftNode', indentNode);
//                                         scrollContainer.setData('_lowerShiftNodeIndex', lowerShiftNodeIndex);
// console.info(scrollContainer.getOuterHTML());
//                                     }
//                                     else {
// console.warn('Fase 3');
//                                         node = scrollContainerVChildNodes[i].domNode;
//                                         // node.setInlineStyle('margin-'+start, (scrolledPages*size1)+'px');

//                                         node.setInlineStyle('margin-'+start, newHeight+'px');

//                                         scrollContainer.removeData('_lowerShiftNode');
//                                         scrollContainer.removeData('_lowerShiftNodeIndex');
//                                     }
// // console.warn('scrolledpages: '+scrolledPages);




                                    scrollContainer.setData('_upperNode', indentNode);
                                }
                                else {
console.warn('first not inside');
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
                                                node = node.setHTML(element.drawItem(item, prevItem, k));
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
                                                node = node.setHTML(element.drawItem(item, prevItem, k));
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


                                    indentNode && indentNode.setInlineStyle('margin-'+start, -contSize+'px');
                                    // prevLowerShiftNodeIndex = scrollContainer.getData('_lowerShiftNodeIndex');
                                    // scrolledPages = scrollContainer.getData('_scrolledPages') || 0;
                                    // size1 = scrollContainer[size];
                                    scrollContainer.setData('_contSize', contSize);


//                                     newHeight = (scrolledPages*size1);

// console.warn('scrollContainer.getInlineStyle(start) '+scrollContainer.getInlineStyle(start));

// newHeight = size1*((indentNode ? 1 : 0)-Math.ceil(parseInt(scrollContainer.getInlineStyle(start) || 0, 10)/size1));
// console.warn('newHeight '+(indentNode ? size1 : 0)+'+'+(size1*(-Math.ceil(parseInt(scrollContainer.getInlineStyle(start) || 0, 10)/size1)))+' --> '+newHeight);
//                                     // newHeight = ((1+scrolledPages)*size1);
//                                     indentNode2 && indentNode2.setInlineStyle('margin-'+start, newHeight+'px');
//                                     if (indentNode) {
// console.warn('fase F');
//                                         indentNode.setInlineStyle('margin-'+start, -size1+'px');
//                                         scrollContainer.setData('_lowerShiftNode', indentNode);
//                                         scrollContainer.setData('_lowerShiftNodeIndex', lowerShiftNodeIndex);
//                                     }
//                                     else {
// console.warn('fase G');
//                                         scrollContainer.removeData('_lowerShiftNode');
//                                         scrollContainer.removeData('_lowerShiftNodeIndex');
//                                     }
                                    scrollContainer.setData('_upperNode', node);
                                }



                            }


                            // most middle element should be within the viewport.
                            // if it isn't anymore, we need to reset margin-top of the first childnode:
                            if ((middleNode[start]>iscrollerBottom) || (middleNode[end]<iscrollerStart)) {
                    console.warn('SYNC FOUND NO FIRST VISIBLE NODE --> (middleNode[start]>iscrollerBottom): '+(middleNode[start]>iscrollerBottom)+' | (middleNode[end]<iscrollerStart): '+(middleNode[end]<iscrollerStart));
                                sectionsShifted = -Math.floor((middleNode[start] - iscrollerStart)/contSize);

                                // currentStart = parseInt(scrollContainer.getInlineStyle(start), 10);
console.warn('middleNode: '+middleNode.getHTML());
console.warn('middleNode[end]: '+middleNode[end]);
console.warn('iscrollerStart: '+iscrollerStart);
console.warn('scrollContSize: '+contSize);
console.warn('sectionsShifted: '+sectionsShifted);
// console.warn('currentStart: '+currentStart);
// console.warn('new currentStart: '+(currentStart+(sectionsShifted*size1)));
console.warn('first childnode: '+firstChildNode.getOuterHTML());
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
                        lowerNode = scrollContainer.append('<section>'+element.drawItem(item, index)+'</section>', false, !lowerNodeAtPosZero ? lowerNode : null);
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

            redefineStartItem: function(resetContainer, second) {
                var element = this,
                    model = element.model,
                    horizontal = model.horizontal,
                    scrollContainer = element.getData('_scrollContainer'),
                    start = horizontal ? 'left' : 'top',
                    end = horizontal ? 'right' : 'bottom',
                    size = horizontal ? 'width' : 'height',
                    borderStart = element.getStyle('border-'+start+'width'),
                    iscrollerStart = element[start] + (parseInt(borderStart, 10) || 0),
                    dragUp = scrollContainer.getData('_dragUp'),
                    scrollContSize = scrollContainer.getData('_contSize'),
                    MAX_HEIGHT = 9999999,
                    highestEnd = MAX_HEIGHT,
                    highestEndNotFound = MAX_HEIGHT,
                    vChildNodes = scrollContainer.vnode.vChildNodes,
                    len = vChildNodes.length,
                    partial, i, firstVisibleNode, firstVisibleNodeNotFound, startItem, domNode, endPos, foundNode, middleNode,
                    contHeight, firstNode, value, scrolledPages, sectionsShifted, currentStart, middleNodeIndex, currentShift;

                // find the first childNode that lies within the visible area:
                middleNodeIndex = (Math.round(len-1)/2);
                for (i=0; (i<len); i++) {
                    domNode = vChildNodes[i].domNode;
                    endPos = domNode[end];
                    if ((endPos>iscrollerStart) && (endPos<highestEnd)) {
                        // if (domNode[start]<=iscrollerStart) {
                            firstVisibleNode = domNode;
                            highestEnd = endPos;
                        // }
                        // else if (endPos<highestEndNotFound) {
                            // need to search for the highest item when there was none
                            // firstVisibleNodeNotFound = domNode;
                            // highestEndNotFound = endPos;
                        // }
                    }
                    (i===middleNodeIndex) && (middleNode=domNode);
                }
// console.warn('scrollContainer.top '+scrollContainer.top);
                foundNode = firstVisibleNode;


                if (!firstVisibleNode) {


if (second) {
console.warn('AGAIN NO FIRST VISIBLE NODE --> exit');
    return;
}
                    console.warn('NO FIRST VISIBLE NODE --> reset container-top');
                    sectionsShifted = -Math.floor((middleNode[start] - iscrollerStart)/scrollContSize);
                    // currentStart = parseInt(scrollContainer.getInlineStyle(start), 10) || 0;
console.warn('middleNode: '+middleNode.getHTML());
console.warn('middleNode[start]: '+middleNode[start]);
console.warn('iscrollerStart: '+iscrollerStart);
console.warn('scrollContSize: '+scrollContSize);
console.warn('sectionsShifted: '+sectionsShifted);
// console.warn('currentStart: '+currentStart);
// console.warn('new currentStart: '+(currentStart+(sectionsShifted*scrollContSize)));
                    domNode = vChildNodes[0].domNode;
                    currentShift = parseInt((domNode.getInlineStyle('margin-'+start) || 0), 10);
                    domNode.setInlineStyle('margin-'+start, (currentShift+(sectionsShifted*scrollContSize))+'px');
                    return element.redefineStartItem(resetContainer, true);
                }


                if (foundNode) {
// console.warn('foundNode '+foundNode.getOuterHTML());
                    partial = (iscrollerStart-foundNode[start])/foundNode[size];
                    startItem = foundNode.getData('_index') + partial;
if (!firstVisibleNode) {
    // console.warn('OOPS: firstVisibleNode not Found: will take '+firstVisibleNodeNotFound.getOuterHTML()+' --> startitem: '+startItem);
    // console.warn(scrollContainer.getOuterHTML());
}
// console.warn('setting startitem to: '+foundNode.getData('_index')+'+'+partial+' = '+startItem);
                }
                else {
                    // try again asynchronously:
console.warn('redefineStartItem found RETRY SETTING STARTITEM');
                    ITSA.async(function() {
                        element.redefineStartItem(resetContainer);
                    });
                    return;
                }
                // Make it impossible to overrule when dragging by storing the data:
// console.warn('setting dragged startitem: '+element.getData('_draggedStartItem')+' --> '+startItem);
                element.setData('_draggedStartItem', startItem);
                model['start-item'] = startItem;
                if (resetContainer) {
                    scrolledPages = scrollContainer.getData('_scrolledPages');
console.warn('resetContainer, scrolledPages: '+scrolledPages+' | dragUp: '+dragUp);
                    if (scrolledPages) {
                        // (scrolledPages<0) && (scrolledPages++);
                        contHeight = scrollContainer.getData('_contSize');
console.warn('contHeight '+contHeight);
                        value = parseInt(scrollContainer.getInlineStyle(start), 10);
console.warn('value '+value+' --> '+(value+(scrolledPages*contHeight)));
                        scrollContainer.setInlineStyle(start, (value+(scrolledPages*contHeight))+'px');
                        firstNode = vChildNodes[0].domNode;
                        value = parseInt(firstNode.getInlineStyle('margin-'+start), 10) || 0;
                        firstNode.setInlineStyle('margin-'+start, (value-(scrolledPages*contHeight))+'px');
                    }
                    scrollContainer.removeData('_scrolledPages');
                    // ITSA.async(function() {
                        element.removeData('_dragging');
                    // });
                }
            },

            drawItem: function(oneItem, prevItem, index) {
                var element = this,
                    model = element.model,
                    template = model.template,
                    headers = model.headers,
                    uriProperty = model['uri-property'],
                    odd = ((index%2)!==0),
                    itemContent = '',
                    len, i, header, headerContent, prevHeaderContent;

                if (headers) {
                    len = headers.length;
                    for (i=0; i<len; i++) {
                        header = headers[i];
                        // only process if item is an object
                        if (typeof oneItem!=='string') {
                            if (header.indexOf('<%')!==-1) {
                                headerContent = microtemplate(header, oneItem);
                            }
                            else {
                                headerContent += header.substitute(oneItem);
                            }
                            oneItem.setData('_header'+i, headerContent);
                            prevHeaderContent = prevItem && prevItem.getData('_header'+i);
                            if (headerContent !== prevHeaderContent) {
                                itemContent += '<section class="header'+i+'">'+headerContent+'</section>';
                            }
                        }
                    }
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
                unregisterScroller(this);
            }
        });

        itagCore.setLazyBinding(Itag, true);
        autoExpandScrollers();
        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
