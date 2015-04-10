module.exports = function (window) {
    "use strict";

    require('./css/i-scroller.css'); // <-- define your own itag-name here

    var margePx = 100,
        itagCore = require('itags.core')(window),
        itagName = 'i-scroller', // <-- define your own itag-name here
        DOCUMENT = window.document,
        ITSA = window.ITSA,
        IParcel = require('i-parcel')(window),
        microtemplate = require('i-parcel/lib/microtemplate.js'),
        repositionItems, Itag;

    repositionItems = function(element) {
        var listsize = element.model['list-size'],
            margeItems = Math.ceil(margePx/listsize),
            viewHeight = element.offsetHeight,
            visibleItems = Math.ceil(viewHeight/listsize);
    };

    if (!window.ITAGS[itagName]) {

        Itag = IParcel.subClass(itagName, {
            /*
             *
             * @property attrs
             * @type Object
             * @since 0.0.1
            */
            attrs: {
                'list-size': 'string',
                horizontal: 'boolean',
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
                    listsize = model['list-size'] || '2em';

                element.defineWhenUndefined('value', value)
                       .defineWhenUndefined('list-size', listsize)
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
                var element = this,
                    model = element.model,
                    items = model.items,
                    listsize = model['list-size'],
                    template = model.template,
                    scrollContainer = element.getElement('>span'),
                    cssNode = element.getElement('>style', true),
                    content, i, len, item, css;


                css = 'i-scroller[i-id="'+element['i-id']+'"] span.item{'+(model.horizontal ? 'width' : 'height')+':'+listsize+'}';
                cssNode.setText(css);

                // building the content of the itag:
                content = '';
                len = items.length;
                for (i=0; i<len; i++) {
                    item = items[i];
                    content += '<span class="item">';
                    if (typeof item==='string') {
                        content += item;
                    }
                    else {
                        if (template.indexOf('<%')!==-1) {
                            content += microtemplate(template, item);
                        }
                        else if (/{\S+}/.test(template)) {
                            content += template.substitute(item);
                        }
                        else {
                            content += template;
                        }
                    }
                    content += '</span>';
                }
                // set the content:
                scrollContainer.setHTML(content);
            },

            destroy: function() {
            }
        });

        itagCore.setLazyBinding(Itag, true);
        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};
