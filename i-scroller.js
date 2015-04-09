module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        IFormElement = require('i-formelement')(window),
        Itag;

    if (!window.ITAGS[itagName]) {

        Itag = IFormElement.subClass(itagName, {
            /*
             *
             * @property attrs
             * @type Object
             * @since 0.0.1
            */
            attrs: {
                'list-size': 'string',
                vertical: 'boolean',
                disabled: 'boolean',
                focusable: 'boolean',
                scrollbar: 'boolean',
                required: 'boolean',
                value: 'string',
                multiple: 'boolean',
                'i-prop': 'string',
                'reset-value': 'string'
            },

            init: function() {
                var element = this,
                    designNode = element.getItagContainer(),
                    itemNodes = designNode.getAll('>option'),
                    items = [],
                    value = element.model.value || -1;
                itemNodes.forEach(function(node, i) {
                    items[items.length] = node.getHTML();
                });

                element.defineWhenUndefined('value', value)
                       .defineWhenUndefined('items', items)
                        // set the reset-value to the inital-value in case `reset-value` was not present
                       .defineWhenUndefined('reset-value', value);

                // store its current value, so that valueChange-event can fire:
                element.setData('i-scroller-value', value);

                element.cleanupEvents();
                element.setupEvents();
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
                    model = element.model,
                    items = model.items,
                    content;
                // building the template of the itag:
                content = '<span>'; // needs container-span because this always needs to have position=relative
                content += '<span'+(model.focusable ? ' plugin-fm="true" fm-manage="option" fm-keyup="38" fm-keydown="40" fm-noloop="true">' : '>');
                len = items.length;
                for (i=0; i<len; i++) {
                    item = items[i];
                    content += item;
                }

                content += '</span></span>';
                // set the content:
                element.setHTML(content);
            },

            sync: function() {
            },

            destroy: function() {
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
