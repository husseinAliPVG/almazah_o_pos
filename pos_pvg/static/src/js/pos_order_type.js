odoo.define('pos_pvg.pos_order_type', function (require) {
    "use strict";

    var floors = require('pos_restaurant.floors');
    var models = require('point_of_sale.models');
    // var chrome = require('point_of_sale.chrome');

    // var core = require('web.core');
    // var QWeb = core.qweb;

    models.load_models({
        model: 'restaurant.floor',
        fields: ['name', 'background_color', 'table_ids', 'sequence'],
        domain: function (self) { return [['pos_config_id', '=', self.config.id]]; },
        loaded: function (self, floors) {
            var takeawayF = {
                'id': 1000, 'name': 'Takeaway', 'background_color': 'rgb(210, 210, 210)',
                'table_ids': [1001], 'sequence': 1000, 'tables': []
            };
            self.floors_by_id[1000] = takeawayF;
            var takeawayT = {
                'id': 1001,
                'name': 'Orders', 'width': 1000, 'height': 500, 'position_h': 10, 'position_v': 10, 'shape': 'squeare',
                'floor_id': 1000, 'color': 'rgb(235, 191, 109)', 'seats': '', 'floor': {}
            };
            self.tables_by_id[1001] = takeawayT;
            takeawayF.tables.push(takeawayT);
            takeawayT.floor = takeawayF;
            self.floors.push(takeawayF);

            var deliveryF = {
                'id': 2000, 'name': 'Delivery', 'background_color': 'rgb(255, 214, 136)',
                'table_ids': [2001], 'sequence': 2000, 'tables': []
            };
            self.floors_by_id[2000] = deliveryF;
            var deliveryT = {
                'id': 2001,
                'name': 'Orders', 'width': 1000, 'height': 500, 'position_h': 10, 'position_v': 10, 'shape': 'squeare',
                'floor_id': 2000, 'color': 'rgb(210, 210, 210)', 'seats': '', 'floor': {}
            };
            self.tables_by_id[2001] = deliveryT;
            deliveryF.tables.push(deliveryT);
            deliveryT.floor = deliveryF;
            self.floors.push(deliveryF);
        }
    });
    
    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        _save_to_server: function (orders, options) {
            if (orders) {
                for (var i in orders) {
                    if (orders[i].data.table_id == 1001) {
                        orders[i].data.table = null;
                        orders[i].data.table_id = null;
                        orders[i].data.order_type = 'takeaway';
                    }
                    else if (orders[i].data.table_id == 2001) {
                        orders[i].data.table = null;
                        orders[i].data.table_id = null;
                        orders[i].data.order_type = 'delivery';
                    }
                    else {
                        orders[i].data.order_type = 'dining';
                    }
                }
            }
            // self.postMessage.orders = orders;
            var def = _super_posmodel._save_to_server.apply(this, arguments);
            return def;
        }
    });

    // // floorplan.pos.set_table(this.table);
    // chrome.OrderSelectorWidget.include({
    //     floor_button_click_handler: function () {
    //         console.log('this', this);
    //         if (this.floor.id == 1000) {
    //             table = self.tables_by_id[1001];
    //         }
    //         else if (this.floor.id == 2000) {
    //             table = self.tables_by_id[2001];
    //         }
    //         else {
    //             table = null;
    //         }
    //         this.pos.set_table(table);
    //     },
    //     renderElement: function () {
    //         var self = this;
    //         this._super();
    //         if (this.pos.config.iface_floorplan) {
    //             if (this.pos.get_order()) {
    //                 if (this.pos.table && this.pos.table.floor) {
    //                     this.$('.orders').prepend(QWeb.render('BackToFloorButton', { table: this.pos.table, floor: this.pos.table.floor }));
    //                     this.$('.floor-button').click(function () {
    //                         self.floor_button_click_handler();
    //                     });
    //                 }
    //                 this.$el.removeClass('oe_invisible');
    //             } else {
    //                 this.$el.addClass('oe_invisible');
    //             }
    //         }
    //     },
    // });
})