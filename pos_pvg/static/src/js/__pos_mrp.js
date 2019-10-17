odoo.define('pos_pvg.pos_mrp', function (require) {
    "use strict";

    
    var pos_models = require('point_of_sale.models');
    var pos_multiprint = require('pos_restaurant.multiprint');
    var rpc = require('web.rpc');

    var _pos_models = pos_models.PosModel.prototype.models;

    var _ordered = false;

    // var pos_kitchen = require('aspl_pos_kitchen_screen_ee.pos');



    for (var i = 0; i < _pos_models.length; i++) {
        var model = _pos_models[i];
        if (model.model === 'product.product') {
            model.fields.push('to_make_mrp');

        }
    }

    // console.log('pos_kitchen', pos_kitchen);
    // pos_kitchen.SendOrderToKitchenButton.include({
    //     button_click: function () {
    //         var self = this;
    //         var selectedOrder = this.pos.get_order();
    //         selectedOrder.initialize_validation_date();
    //         var currentOrderLines = selectedOrder.get_orderlines();
    //         var orderLines = [];
    //         _.each(currentOrderLines, function (item) {
    //             return orderLines.push(item.export_as_JSON());
    //         });
    //         if (orderLines.length === 0) {
    //             return alert('Please select product !');
    //         } else {
    //             console.log('currentOrderLines', currentOrderLines);
    //             for (var i in currentOrderLines){
    //                 currentOrderLines[i].was_printed = true;
    //             }
    //             self.pos.push_order(selectedOrder);
    //         }
    //         _ordered = true;
    //     },
    // });

    // pos_kitchen.SendOrderToKitchenButton.include({
    //     button_click: function () {
    //         var self = this;
    //         this._super();
    //         _ordered = true;
    //     },
    // });

    pos_multiprint.SubmitOrderButton.include({
        button_click: function () {
            var self = this
            var order = self.pos.get_order();
            if (order.hasChangesToPrint()) {
                order.printChanges();
                // console.log('changes?', order.hasChangesToPrint());
                // console.log('order', order);
                order.saveChanges();
                var order_line = order.orderlines.models;
                var due = order.get_due();
                for (var i in order_line) {
                    var list_product = []
                    if (order_line[i].product.to_make_mrp) {
                        if (order_line[i].quantity > 0) {
                            var product_dict = {
                                'id': order_line[i].product.id,
                                'qty': order_line[i].quantity,
                                'product_tmpl_id': order_line[i].product.product_tmpl_id,
                                'pos_reference': order.name,
                                'uom_id': order_line[i].product.uom_id[0],
                            };
                            list_product.push(product_dict);
                            order_line[i].ordered = true;
                            order_line[i].ordered_qty = order_line[i].quantity;
                            order_line[i].set_selected(true);
                        }
                        order_line[i].selected = false;
                    }
                    order_line[i].was_printed = true;

                    if (list_product.length) {
                        rpc.query({
                            model: 'mrp.production',
                            method: 'create_mrp_from_pos',
                            args: [1, list_product],
                        });
                    }
                }
                _ordered = true;
            }
        },
    });


    // pos_multiprint.SubmitOrderButton.include({
    //     button_click: function () {
    //         var self = this
    //         var order = self.pos.get_order();
    //         if (order.hasChangesToPrint()) {
    //             // order.printChanges();
    //             console.log('changes?', order.hasChangesToPrint());
    //             console.log('order', order);
    //             order.saveChanges();
    //             var order_line = order.orderlines.models;
    //             var due = order.get_due();
    //             for (var i in order_line) {
    //                 var list_product = []
    //                 if (order_line[i].product.to_make_mrp) {
    //                     if (order_line[i].quantity > 0) {
    //                         var product_dict = {
    //                             'id': order_line[i].product.id,
    //                             'qty': order_line[i].quantity,
    //                             'product_tmpl_id': order_line[i].product.product_tmpl_id,
    //                             'pos_reference': order.name,
    //                             'uom_id': order_line[i].product.uom_id[0],
    //                         };
    //                         list_product.push(product_dict);
    //                         order_line[i].ordered = true;
    //                         order_line[i].ordered_qty = order_line[i].quantity;
    //                         order_line[i].set_selected(true);
    //                     }
    //                     order_line[i].selected = false;
    //                 }

    //                 if (list_product.length) {
    //                     rpc.query({
    //                         model: 'mrp.production',
    //                         method: 'create_mrp_from_pos',
    //                         args: [1, list_product],
    //                     });
    //                 }
    //             }
    //             _ordered = true;
    //         }
    //     },
    // });
})