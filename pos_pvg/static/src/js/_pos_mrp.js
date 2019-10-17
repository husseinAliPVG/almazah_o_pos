odoo.define('pos_pvg.pos_mrp', function (require) {
    "use strict";

    var rpc = require('web.rpc');
    var pos_models = require('point_of_sale.models')
    var pos_chrome = require('point_of_sale.chrome');
    var pos_multiprint = require('pos_restaurant.multiprint');
    var core = require('web.core');
    var screens = require('point_of_sale.screens');

    var _t = core._t;

    var field_utils = require('web.field_utils');
    var utils = require('web.utils');
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;

    var _ordered = false;

    var _pos_models = pos_models.PosModel.prototype.models;


    for (var i = 0; i < _pos_models.length; i++) {
        var model = _pos_models[i];
        if (model.model === 'product.product') {
            model.fields.push('to_make_mrp');

        }
    }
    var _super_order = pos_models.Order.prototype;
    pos_models.Order = pos_models.Order.extend({
        remove_orderline: function (line) {
            if (line.ordered) {
                this.pos.gui.show_popup('error', {
                    'title': _t('Order is in progress'),
                    'body': _t('Can not Remove order sent to kitchen'),
                });
            }
            else {
                _super_order.remove_orderline.apply(this, arguments);
            }
        },
        add_product: function (product, options) {
            if (this._printed) {
                this.destroy();
                return this.pos.get_order().add_product(product, options);
            }
            this.assert_editable();
            options = options || {};
            var attr = JSON.parse(JSON.stringify(product));
            attr.pos = this.pos;
            attr.order = this;
            var line = new pos_models.Orderline({}, { pos: this.pos, order: this, product: product });

            if (options.quantity !== undefined) {
                line.set_quantity(options.quantity);
            }

            if (options.price !== undefined) {
                line.set_unit_price(options.price);
            }

            //To substract from the unit price the included taxes mapped by the fiscal position
            this.fix_tax_included_price(line);

            if (options.discount !== undefined) {
                line.set_discount(options.discount);
            }

            if (options.extras !== undefined) {
                for (var prop in options.extras) {
                    line[prop] = options.extras[prop];
                }
            }

            var to_merge_orderline;
            for (var i = 0; i < this.orderlines.length; i++) {
                if (this.orderlines.at(i).can_be_merged_with(line) && options.merge !== false && !this.orderlines.at(i).ordered) {
                    to_merge_orderline = this.orderlines.at(i);
                }
            }
            if (to_merge_orderline) {
                to_merge_orderline.merge(line);
            } else {
                this.orderlines.add(line);
            }
            this.select_orderline(this.get_last_orderline());

            if (line.has_product_lot) {
                this.display_lot_popup();
            }
        },
    });

    var orderline_id = 1;
    var _super_orderline = pos_models.Orderline.prototype;
    pos_models.Orderline = pos_models.Orderline.extend({
        initialize: function (attr, options) {
            this.pos = options.pos;
            this.order = options.order;
            if (options.json) {
                this.init_from_JSON(options.json);
                return;
            }
            this.product = options.product;
            this.set_product_lot(this.product);
            this.set_quantity(1);
            this.discount = 0;
            this.discountStr = '0';
            this.type = 'unit';
            this.selected = false;
            this.id = orderline_id++;
            this.price_manually_set = false;
            this.ordered = false;
            this.ordered_qty = 0;

            if (options.price) {
                this.set_unit_price(options.price);
            } else {
                this.set_unit_price(this.product.get_price(this.order.pricelist, this.get_quantity()));
            }
        },
        set_quantity: function (quantity, keep_price) {
            this.order.assert_editable();
            if (quantity === 'remove') {
                this.order.remove_orderline(this);
                return;
            }
            // else if (quantity < this.ordered_qty && this.ordered) {
            //     // console.log('qty vs o_qty', this.ordered, quantity, this.ordered_qty);
            //     this.pos.gui.show_popup('error', {
            //         'title': _t('Order is in progress'),
            //         'body': _t('Can not Decrese order amount sent to kitchen'),
            //     });
            //     return;
            // }
            else if (this.ordered) {
                this.pos.gui.show_popup('error', {
                    'title': _t('Order sent to kitchen'),
                    'body': _t('Can not Modify order line sent to kitchen, you can add another order line.'),
                });
                return;
            }
            else {
                var quant = parseFloat(quantity) || 0;
                var unit = this.get_unit();
                if (unit) {
                    if (unit.rounding) {
                        this.quantity = round_pr(quant, unit.rounding);
                        var decimals = this.pos.dp['Product Unit of Measure'];
                        this.quantity = round_di(this.quantity, decimals)
                        this.quantityStr = field_utils.format.float(this.quantity, { digits: [69, decimals] });
                    }
                    else {
                        this.quantity = round_pr(quant, 1);
                        this.quantityStr = this.quantity.toFixed(0);
                    }
                }
                else {
                    this.quantity = quant;
                    this.quantityStr = '' + this.quantity;
                }
            }

            // just like in sale.order changing the quantity will recompute the unit price
            if (!keep_price && !this.price_manually_set) {
                this.set_unit_price(this.product.get_price(this.order.pricelist, this.get_quantity()));
                this.order.fix_tax_included_price(this);
            }
            this.trigger('change', this);
        },
    })

    pos_chrome.OrderSelectorWidget.include({
        deleteorder_click_handler: function (event, $el) {
            var self = this;
            var order = this.pos.get_order();
            if (!order) {
                return;
            } else if (!order.is_empty()) {
                if (_ordered) {
                    this.pos.gui.show_popup('error', {
                        'title': _t('Order is in progress ?'),
                        'body': _t('Can not delete order sent to kitchen'),
                    });
                }
                else {
                    this.pos.gui.show_popup('confirm', {
                        'title': _t('Destroy Current Order ?'),
                        'body': _t('You will lose any data associated with the current order!!'),
                        confirm: function () {
                            self.pos.delete_current_order();
                        },
                    });
                }
            } else {
                self.pos.delete_current_order();
            }
        },
    });

    pos_multiprint.SubmitOrderButton.include({
        button_click: function () {
            var self = this
            var order = self.pos.get_order();
            if (order.hasChangesToPrint()) {
                order.printChanges();
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
})