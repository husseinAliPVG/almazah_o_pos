odoo.define('pos_pvg.pos_screens', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var chrome = require('point_of_sale.chrome');
    var floors = require('pos_restaurant.floors');
    var gui = require('point_of_sale.gui');


    chrome.Chrome.include({
        events: {
            "click .button_takeaway": "on_click_pos_takeaway",
            "click .button_delivery": "on_click_pos_delivery",
            "click .button_dining": "on_click_pos_dining",
            "click .pos-message": "on_click_pos_message",
        },
        init: function () {
            var self = this;
            this._super(arguments[0], {});
            console.log('!', this.$('.button_takeaway'));
        },
        build_widgets: function () {
            this._super();
            this.gui.set_startup_screen('floors');
            // this.gui.set_default_screen('products');
            this.$('.button_dining').addClass('active');
        },
        on_click_pos_takeaway: function () {
            this.gui.show_screen('products');
            this.$('.button_takeaway').addClass('active');
            this.$('.button_delivery').removeClass('active');
            this.$('.button_dining').removeClass('active');
        },
        on_click_pos_delivery: function () {
            this.gui.show_screen('products');
            this.$('.button_takeaway').removeClass('active');
            this.$('.button_delivery').addClass('active');
            this.$('.button_dining').removeClass('active');
        },
        on_click_pos_dining: function () {
            this.gui.show_screen('floors');
            this.$('.button_takeaway').removeClass('active');
            this.$('.button_delivery').removeClass('active');
            this.$('.button_dining').addClass('active');
        }
    });

    // var startWidget = screens.ScreenWidget.extend({
    //     template: 'startWidget',
    //     init: function (parent, options) {
    //         this._super(parent, options);
    //         this.$('.button_dining').click(function () {
    //             self.gui.show_screen('floors');
    //         });

    //     },
    // });
    // gui.define_screen({
    //     'name': 'startWidget',
    //     'widget': startWidget,
    // });
});