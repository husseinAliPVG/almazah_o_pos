odoo.define('aspl_pos_kitchen_screen_ee.pos', function (require) {
	"use strict";

	require('bus.BusService');
	var bus = require('bus.Longpolling');
	var cross_tab = require('bus.CrossTab').prototype;
	var models = require('point_of_sale.models');
	var chrome = require('point_of_sale.chrome');
	var screens = require('point_of_sale.screens');
	var session = require('web.session');
	var gui = require('point_of_sale.gui');
	var core = require('web.core');
	var rpc = require('web.rpc');
	var DB = require('point_of_sale.DB');
	var PopupWidget = require('point_of_sale.popups');
	var framework = require('web.framework');
	var Widget = require('web.Widget');
	var _t = core._t;
	var QWeb = core.qweb;

	models.load_fields("res.users", ['kitchen_screen_user', 'pos_category_ids']);
	models.load_fields("pos.order.line", ['state']);

	chrome.Chrome.include({
		build_widgets: function () {
			var self = this;
			this._super();
			self.call('bus_service', 'updateOption', 'pos.order.line', session.uid);
			self.call('bus_service', 'startPolling');
			self.call('bus_service', 'onNotification', self, self._onNotification);
			self.call('bus_service', 'startPolling');
			cross_tab._isRegistered = true;
			cross_tab._isMasterTab = true;
			self.call('bus_service', '_poll');
			if (self.pos.user.kitchen_screen_user === 'cook') {
				self.gui.set_startup_screen('kitchen_screen');
				self.gui.show_screen('kitchen_screen');
			} else {
				self.gui.show_screen('products');
			}
		},
		_onNotification: function (notifications) {
			var self = this;
			for (var notif of notifications) {
				if (notif[1].screen_display_data) {
					if (notif[1].screen_display_data.new_order) {
						self.pos.gui.play_sound('bell');
					}
					var screen_data = [];
					_.each(notif[1].screen_display_data.orders, function (order) {
						_.each(order.order_lines, function (line) {
							if (line.state != 'done' && line.state != 'cancel') {
								screen_data.push(line);
							}
						});
					});
					self.pos.gui.screen_instances.kitchen_screen.screen_data = screen_data;
					var screen_order_lines = [];
					_.each(notif[1].screen_display_data.orders, function (order) {
						_.each(order.order_lines, function (line) {
							if (self.pos.gui.screen_instances.kitchen_screen.categ_id == 0 && line.state != 'done' && line.state != 'cancel') {
								screen_order_lines.push(line);
							} else if (line.categ_id == self.pos.gui.screen_instances.kitchen_screen.categ_id && line.state != 'done' && line.state != 'cancel') {
								screen_order_lines.push(line);
							}
						});
					});
					self.pos.gui.screen_instances.kitchen_screen.render_screen_order_lines(screen_order_lines);
					self.pos.gui.screen_instances.kitchen_screen.render_table_data(notif[1].screen_display_data.orders);
				} else if (notif[1].order_line_state) {
					if (self.pos.get_order_list().length !== 0) {
						var collection_orders = self.pos.get_order_list()[0].collection.models;
						for (var i = 0; i < collection_orders.length; i++) {
							var collection_order_lines = collection_orders[i].orderlines.models;
							_.each(collection_order_lines, function (line) {
								if (line.cid === notif[1].order_line_state.pos_cid && line.order.name === notif[1].order_line_state.pos_reference) {
									line.state = notif[1].order_line_state.state;
									self.pos.gui.screen_instances.products.order_widget.renderElement();
								}
							});
						}
					}
				}
			}
		},
	});

	var _super_posmodel = models.PosModel;
	models.PosModel = models.PosModel.extend({
		mirror_kitchen_orders: function (new_order) {
			rpc.query({
				model: 'pos.order',
				method: 'broadcast_order_data',
				args: [new_order]
			}, { async: false }).done(function (result) {
				setTimeout(function () {
					$('.kitchen-buttons .button.category.selected').trigger('click');
				}, 1000);
			});
		},
	});

	chrome.HeaderButtonWidget.include({
		renderElement: function () {
			var self = this;
			this._super();
			if (this.action) {
				self.$el.click(function () {
					if (self.pos.user.kitchen_screen_user === 'cook') {
						self.gui.show_popup('confirm', {
							'title': _t('Confirmation'),
							'body': _t('Do you want to close screen ?'),
							confirm: function () {
								framework.redirect('/web/session/logout');
							},
						});
					}
				});
			}
		},
	});

	var kitchenScreenButton = screens.ActionButtonWidget.extend({
		template: 'kitchenScreenButton',
		button_click: function () {
			this.gui.show_screen('kitchen_screen');
		},
	});

	screens.define_action_button({
		'name': 'kitchenScreenButton',
		'widget': kitchenScreenButton,
		'condition': function () {
			return this.pos.user.kitchen_screen_user === 'manager' && this.pos.config.send_to_kitchen;
		},
	});

	//    Send order to kitchen
	// var SendOrderToKitchenButton = screens.ActionButtonWidget.extend({
	//     template : 'SendOrderToKitchenButton',
	//     button_click : function() {
	//         var self = this;
	//         var selectedOrder = this.pos.get_order();
	//         selectedOrder.initialize_validation_date();
	//         var currentOrderLines = selectedOrder.get_orderlines();
	//         var orderLines = [];
	//         _.each(currentOrderLines,function(item) {
	//             return orderLines.push(item.export_as_JSON());
	//         });
	//         if (orderLines.length === 0) {
	//             return alert ('Please select product !');
	//         } else {
	//             self.pos.push_order(selectedOrder);
	//         }
	//     },
	// });

	 var SendOrderToKitchenButton = screens.ActionButtonWidget.extend({
	 	template: 'SendOrderToKitchenButton',
	 	button_click: function () {
	 		var self = this;
	 		var selectedOrder = this.pos.get_order();
	 		selectedOrder.initialize_validation_date();
	 		var currentOrderLines = selectedOrder.get_orderlines();
	 		var orderLines = [];
	 		_.each(currentOrderLines, function (item) {
	 			return orderLines.push(item.export_as_JSON());
	 		});
	 		if (orderLines.length === 0) {
	 			return alert('Please select product !');
	 		} else {
	 			// console.log('currentOrderLines', currentOrderLines);
	 			if (selectedOrder.hasChangesToPrint()) {
	 			    self.pos.push_order(selectedOrder);
	 				selectedOrder.saveChanges();
	 				for (var i in currentOrderLines) {
	 					currentOrderLines[i].was_printed = true;
	 					currentOrderLines[i].ordered = true;
	                    currentOrderLines[i].ordered_qty = currentOrderLines[i].quantity;
	 					currentOrderLines[i].set_selected(true);
	                    currentOrderLines[i].selected = false;
	 				}
	 			}
	 		}
	 	},
	 });

//	var SendOrderToKitchenButton = screens.ActionButtonWidget.extend({
//		template: 'SendOrderToKitchenButton',
//		button_click: function () {
//			var self = this;
//			var selectedOrder = this.pos.get_order();
//			selectedOrder.initialize_validation_date();
//			var currentOrderLines = selectedOrder.get_orderlines();
//			var orderLines = [];
//			_.each(currentOrderLines, function (item) {
//				return orderLines.push(item.export_as_JSON());
//			});
//			if (orderLines.length === 0) {
//				return alert('Please select product !');
//			} else {
//				// console.log('currentOrderLines', currentOrderLines);
//				if (selectedOrder.hasChangesToPrint()) {
//				    self.pos.push_order(selectedOrder);
//					selectedOrder.saveChanges();
//					setTimeout(
//					    function() {
//                            for (var i in currentOrderLines) {
//                                var list_product = []
//                                if (currentOrderLines[i].product.to_make_mrp) {
//                                    if (currentOrderLines[i].quantity > 0) {
//                                        var product_dict = {
//                                            'id': currentOrderLines[i].product.id,
//                                            'qty': currentOrderLines[i].quantity,
//                                            'product_tmpl_id': currentOrderLines[i].product.product_tmpl_id[0],
//                                            'pos_reference': selectedOrder.name,
//                                            'uom_id': currentOrderLines[i].product.uom_id[0],
//                                            'pos_cid': currentOrderLines[i].cid,
//                                        };
//                                        list_product.push(product_dict);
//                                        currentOrderLines[i].ordered = true;
//                                        currentOrderLines[i].ordered_qty = currentOrderLines[i].quantity;
//                                        currentOrderLines[i].set_selected(true);
//                                    }
//                                    currentOrderLines[i].selected = false;
//                                }
//                                currentOrderLines[i].was_printed = true;
//                                // console.log('list_product', list_product);
//                                if (list_product.length) {
//                                    rpc.query({
//                                        model: 'mrp.production',
//                                        method: 'create_mrp_from_pos',
//                                        args: [1, list_product],
//                                    });
//                                }
//                                // console.log('order_line_id', currentOrderLines[i]);
//                            }
//                        },
//                         5000 )
//				}
//			}
//		},
//	});

	screens.define_action_button({
		'name': 'SendOrderToKitchen',
		'widget': SendOrderToKitchenButton,
		'condition': function () {
			return this.pos.config.send_to_kitchen;
		},
	});

	screens.OrderWidget.include({
		update_summary: function () {
			this._super();
			var order = this.pos.get_order()
			if (order) {
                var changes = order.hasChangesToPrint();
                var skipped = changes ? false : this.pos.get_order().hasSkippedChanges();
                var buttons = this.getParent().action_buttons;

                if (buttons && buttons.submit_order && buttons.SendOrderToKitchen) {
                    buttons.submit_order.highlight(changes);
                    buttons.submit_order.altlight(skipped);
                    buttons.SendOrderToKitchen.highlight(changes);
                    buttons.SendOrderToKitchen.altlight(skipped);
                }
			}
		},
	});

	//    order line note for product screen
	var OrderLineNotePopupWidget = PopupWidget.extend({
		template: 'OrderLineNotePopupWidget',
		show: function (options) {
			var self = this;
			options = options || {};
			this._super(options);
			this.renderElement();
			var order = this.pos.get_order();
			var selected_line = order.get_selected_orderline();
			if (selected_line && selected_line.get_note()) {
				var note = selected_line.get_note();
				$('#textarea_note').text(note);
			} else {
				$('#textarea_note').text('');
			}

		},
		click_confirm: function () {
			var order = this.pos.get_order();
			var selected_line = order.get_selected_orderline();
			var value = $('#textarea_note').val();
			selected_line.set_note(value);
			this.gui.close_popup();
		},
		renderElement: function () {
			this._super();
		},
	});
	gui.define_popup({ name: 'orderline_note_popup', widget: OrderLineNotePopupWidget });

	var _super_orderline = models.Orderline.prototype;
	models.Orderline = models.Orderline.extend({
		initialize: function (attr, options) {
		    var order_line = this
		    this.state = 'waiting'
		    if (options.order && options.json){
		        var order_name = options.order.name
                var order_line_cid = options.json.pos_cid
                rpc.query({
                    model: 'pos.order.line',
                    method: 'get_order_line_state',
                    args: [order_name, options.json.product_id, options.json.qty]
                })
                    .then(function (result) {
                        if (result) {
                            order_line.state = result
                            order_line.was_printed = true
                            order_line.order.ask_cancel_reason = true
                            order_line.order.saveChanges();
                        }
                     });
		    }
            _super_orderline.initialize.call(order_line, attr, options);
		},
		can_be_merged_with: function (orderline) {
			var result = _super_orderline.can_be_merged_with.call(this, orderline);
			if (orderline.product.id == this.product.id && this.state != 'waiting') {
				return false;
			}
			return result;
		},
		export_as_JSON: function () {
			var lines = _super_orderline.export_as_JSON.call(this);
			var new_attr = {
				order_line_note: this.get_note(),
				state: this.state,
				pos_cid: this.cid,
			}
			$.extend(lines, new_attr);
			return lines;
		},
		export_for_printing: function () {
			var self = this;
			var line = _super_orderline.export_for_printing.call(this);
			line.note = this.note;
			return line;
		},
		set_quantity: function (quantity, keep_price) {
		    var self = this
		    var state = self.state
		    if (state && state != 'waiting' && state != 'check availability' && state !='cancel') {
                this.pos.gui.show_popup('error', {
                    'title': _t('Order sent to kitchen'),
                    'body': _t('Can not Modify order line sent to kitchen, you can add another order line.'),
                });
                return;
		    }
            _super_orderline.set_quantity.call(self, quantity, keep_price);
		}
//		set_quantity: function (quantity, keep_price) {
//		    var self = this;
//		    self.old_quantity = self.quantity
//		    var mo_id
//		    var mo_state
//		    var mo_qty = 0
//            rpc.query({
//                model: 'pos.order.line',
//                method: 'get_order_line_mo',
//                args: [self.order.name, self.product.id, self.quantity]
//            })
//                .then(function(result){
//                    mo_id = result
//                    if (mo_id) {
//                        rpc.query({
//                            model: 'mrp.production',
//                            method: 'pos_production_sate',
//                            args: [1, mo_id]
//                        })
//                            .then(function(result){
//                                mo_state = result
//                                if (mo_state == 'confirmed') {
//                                    rpc.query({
//                                        model: 'mrp.production',
//                                        method: 'pos_production_qty',
//                                        args: [1, mo_id]
//                                    })
//                                        .then(function(result){
//                                            mo_qty = result
//                                            if ((quantity - mo_qty) == 0.0) {
//                                                rpc.query({
//                                                    model: 'mrp.production',
//                                                    method: 'pos_production_cancel',
//                                                    args: [1, mo_id]
//                                                })
//                                                    .then(function(result){
//                                                        mo_state = 'cancel'
//                                                    });
//                                            }
//                                            else {
//                                                this.pos.gui.show_popup('error', {
//                                                'title': _t('Order sent to kitchen'),
//                                                'body': _t('Can not Modify order line sent to kitchen, you can add another order line.'),
//                                            });
//                                            return;
//                                            }
//                                        });
//                                }
//                            });
//                     }
//                });
//             _super_orderline.set_quantity.call(self, quantity, keep_price);
//		},
	});

	//    order note for order
	var _super_order = models.Order.prototype;
	models.Order = models.Order.extend({
	    remove_orderline: function (line) {
	        if (line.cancelled_line) {
	            rpc.query({
                model: 'pos.order.line',
                method: 'get_order_line_mo',
                args: [line.order.name, line.product.id, line.quantity]
            })
                .then(function (result){
                    if (result) {
                        rpc.query({
                        model: 'mrp.production',
                        method: 'pos_production_cancel',
                        args: [1, result],
                    })
                        .then(function (result) {
                            if (result) {
//                                return
                            }
                         });
                    }
                });
	        }
            _super_order.remove_orderline.apply(this, arguments);
	    },
		set_order_note: function (order_note) {
			this.order_note = order_note;
		},
		get_order_note: function () {
			return this.order_note;
		},
		export_as_JSON: function () {
			var submitted_order = _super_order.export_as_JSON.call(this);
			var new_val = {
				order_note: this.get_order_note(),
			}
			$.extend(submitted_order, new_val);
			return submitted_order;
		},
		export_for_printing: function () {
			var self = this;
			var orders = _super_order.export_for_printing.call(this);
			var new_val = {
				order_note: this.get_order_note() || false,
			};
			$.extend(orders, new_val);
			return orders;
		},
	});

	screens.PaymentScreenWidget.include({
		show: function () {
			self = this;
			this._super();
			$("textarea#order_note").focus(function () {
				$('body').off('keypress', self.keyboard_handler);
				$('body').off('keydown', self.keyboard_keydown_handler);
				window.document.body.removeEventListener('keypress', self.keyboard_handler);
				window.document.body.removeEventListener('keydown', self.keyboard_keydown_handler);
			});
			$("textarea#order_note").focusout(function () {
				window.document.body.addEventListener('keypress', self.keyboard_handler);
				window.document.body.addEventListener('keydown', self.keyboard_keydown_handler);
			});
		},
		validate_order: function (force_validation) {
			var currentOrder = this.pos.get_order();
			currentOrder.set_order_note($('#order_note').val());
			this._super(force_validation);
		},
	});

	var kitchenScreenWidget = screens.ScreenWidget.extend({
		template: 'kitchenScreenWidget',
		init: function (parent, options) {
			var self = this;
			this._super(parent, options);
			this.categ_id = 0;
			this.category_list = [];
			this.screen_data = false;
			this.config_categ_ids = self.pos.user.pos_category_ids;
			this.config_categ_ids.map(function (id) {
				var object = self.pos.db.get_category_by_id(id);
				self.category_list.push(object);
			});
		},
		show: function () {
			this._super();
			var self = this;
			this.categ_id = 0;
			this.renderElement();
			if (self.pos.user.kitchen_screen_user === 'cook') {
				this.categ_id = self.pos.user.pos_category_ids[0];
				this.$el.find('span.category:first').addClass('selected');
			}
			this.pos.mirror_kitchen_orders();
			if (self.pos.user.kitchen_screen_user == 'manager') {
//				$('.order-list,.kitchen-buttons').addClass('disappear');
//				$('.order-kanban').removeClass('disappear');
                $('.order-list').removeClass('disappear');
				$('.order-kanban,.kitchen-buttons').addClass('disappear');
			}
		},
		render_screen_order_lines: function (screen_data) {
			if (screen_data) {
				var contents = this.$el[0].querySelector('.order-list-contents');
				contents.innerHTML = "";
				for (var i = 0, len = Math.min(screen_data.length, 1000); i < len; i++) {
					var order_line_data = screen_data[i];
					if (order_line_data.state != 'done') {
						var orderline_html = QWeb.render('KitchenOrderlistLine', { widget: this, order_line_data: order_line_data });
						var orderlines = document.createElement('div');
						orderlines.innerHTML = orderline_html;
						orderlines = orderlines.childNodes[1];
						contents.appendChild(orderlines);
					}
				}
			}
		},
		render_table_data: function (table_data) {
			if (table_data) {
				var contents = this.$el[0].querySelector('.table-order-contents');
				contents.innerHTML = "";
				for (var i = 0, len = Math.min(table_data.length, 1000); i < len; i++) {
					var order_data = table_data[i];
					order_data.order_lines = _(order_data.order_lines).filter(function (line) {
						if (line.state != 'done') {
							return line;
						}
					});
					_.each(order_data.order_lines, function (each_line) {
						if (each_line && each_line.state != 'waiting') {
							order_data['cancel_order'] = true;
						}
					});
					var order_html = QWeb.render('TableOrders', { widget: this, order_data: order_data });
					var order = document.createElement('div');
					order.innerHTML = order_html;
					order = order.childNodes[1];
					contents.appendChild(order);
				}
			} else {
				var contents = this.$el[0].querySelector('.table-order-contents');
				contents.innerHTML = "";
			}
		},
		events: {
			'click .button.back': 'click_back',
			'click div.kitchen-buttons span.category': 'click_categ_button',
			'click div.state-button ': 'change_state_click',
			'click div.cancel-order ': 'cancel_order_click',
			'click div.remove_whole_order ': 'cancel_pos_order',
			'click span#view_note ': 'show_order_note',
			'click .btn-list': 'list_view_click',
			'click .btn-kanban': 'kanban_view_click',
			'click .kitchen-order-note': 'show_order_note',
			'click .kanban_btn_stage_changes': 'kanban_btn_stage_changes',
			'click .line-print-receipt': 'line_print_receipt',
			'click .order-print-receipt': 'order_print_receipt',
		},
		click_back: function () {
			this.gui.back();
		},
		list_view_click: function (event) {
			$(event.currentTarget).addClass('selected');
			$('.btn-kanban').removeClass('selected');
			$('.order-list,.kitchen-buttons').removeClass('disappear');
			$('.order-kanban').addClass('disappear');
			this.$el.find('span.category:first').trigger('click');
		},
		kanban_view_click: function (event) {
			$(event.currentTarget).addClass('selected');
			$('.btn-list').removeClass('selected');
			$('.order-list,.kitchen-buttons').addClass('disappear');
			$('.order-kanban').removeClass('disappear');
		},
		show_order_note: function (event) {
			var self = this;
			var note = $(event.currentTarget).data('note');
			self.gui.show_popup('line_note_popup', { 'note': note });
		},
		click_categ_button: function (event) {
			var self = this;
			this.categ_id = parseInt($(event.currentTarget).data('id'));
			$('span.category').removeClass('selected');
			$(event.currentTarget).addClass('selected');
			var screen_data = [];
			_.each(self.screen_data, function (line) {
				if (self.categ_id == 0) {
					screen_data.push(line);
				} else if (line.categ_id && line.categ_id == self.categ_id) {
					screen_data.push(line);
				}
			});
			self.render_screen_order_lines(screen_data);
		},
		change_state_click: function (event) {
			var self = this;
			var state_id = $(event.currentTarget).data('state');
			var order_line_id = parseInt($(event.currentTarget).data('id'));
			var route = $(event.currentTarget).data('route');
			if (route) {
				if (state_id == 'waiting') {
					rpc.query({
						model: 'pos.order.line',
						method: 'update_orderline_state',
						args: [{ 'state': 'check availability', 'order_line_id': order_line_id }],
					})
						.then(function (result) {
							if (result) {
								self.pos.mirror_kitchen_orders();
							}
						});
				}

//				else if (state_id == 'check availability') {
//				    var update_state = false
//                    var check_stock = false
//                    var mo_id = parseInt($(event.currentTarget).data('mo'));
////                    console.log('mo_id', mo_id)
//                    rpc.query({
//					    model: 'mrp.production',
//					    method: 'pos_check_stock',
//					    args: [1, mo_id],
//					})
//					    .then(function (result) {
//                            if (result) {
//                                check_stock = true
//                                rpc.query({
//                                    model: 'pos.order.line',
//                                    method: 'update_orderline_state',
//                                    args: [{ 'state': 'available', 'order_line_id': order_line_id }],
//                                })
//                                    .then(function (result) {
//                                        if (result) {
//                                            update_state = true
//                                            self.pos.mirror_kitchen_orders();
//                                        }
//                                    });
//                            }
//                            else {
//                                check_stock = result
//                                rpc.query({
//                                    model: 'pos.order.line',
//                                    method: 'update_orderline_state',
//                                    args: [{ 'state': 'not available', 'order_line_id': order_line_id }],
//                                })
//                                    .then(function (result) {
//                                        if (result) {
//                                            update_state = true
//                                            self.pos.mirror_kitchen_orders();
//                                        }
//                                    });
//                            }
//                        });
//                     console.log('check_stock, update_state', check_stock, update_state);
//				}

				else if (state_id == 'check availability') {
				    var update_state = false
                    var check_stock = false
                    var mo_id
                    var line_id = parseInt($(event.currentTarget).data('id'))

                    rpc.query({
                        model: 'mrp.production',
                        method: 'pos_create_mrp_from_line',
                        args: [1, line_id]
                    })
                        .then(function (result) {
                            if (result) {
                                rpc.query({
                                    model: 'pos.order.line',
                                    method: 'update_orderline_state',
                                    args: [{ 'state': 'available', 'order_line_id': order_line_id }],
                                })
                                    .then(function (result) {
                                        if (result) {
                                            update_state = true
                                            self.pos.mirror_kitchen_orders();
                                        }
                                    });
                            }
                            else {
                                rpc.query({
                                    model: 'pos.order.line',
                                    method: 'update_orderline_state',
                                    args: [{ 'state': 'not available', 'order_line_id': order_line_id }],
                                })
                                    .then(function (result) {
                                        if (result) {
                                            update_state = true
                                            self.pos.mirror_kitchen_orders();
                                        }
                                    });
                            }
                        });
				}

				else if (state_id == 'available') {
				    var update_state = false
                    var produce = false
                    var mo_id = parseInt($(event.currentTarget).data('mo'));
                    rpc.query({
					    model: 'mrp.production',
					    method: 'pos_produce_product',
					    args: [1, mo_id],
					})
					    .then(function (result) {
                            console.log(result);
                            if (result) {
                                produce = true
                                    rpc.query({
                                        model: 'pos.order.line',
                                        method: 'update_orderline_state',
                                        args: [{ 'state': 'preparing', 'order_line_id': order_line_id }],
                                    })
                                        .then(function (result) {
                                            if (result) {
                                                self.pos.mirror_kitchen_orders();
                                            }
                                        });
                            }
                        });
				}
				else if(state_id == 'preparing') {
                    var update_state = false
                    var production_done = false
                    var mo_id = parseInt($(event.currentTarget).data('mo'));
                    rpc.query({
					    model: 'mrp.production',
					    method: 'pos_production_done',
					    args: [1, mo_id],
					})
                        .then(function (result) {
                            if (result) {
                                rpc.query({
                                    model: 'pos.order.line',
                                    method: 'update_orderline_state',
                                    args: [{ 'state': 'delivering', 'order_line_id': order_line_id }],
                                })
                                    .then(function (result) {
                                        if (result) {
                                            self.pos.mirror_kitchen_orders();
                                        }
                                    });
                            }
                         });
				}
				else if (state_id == 'delivering') {
					rpc.query({
						model: 'pos.order.line',
						method: 'update_orderline_state',
						args: [{ 'state': 'done', 'order_line_id': order_line_id }],
					})
						.then(function (result) {
							if (result) {
								self.pos.mirror_kitchen_orders();
								if (self.screen_data) {
									var record = _.find(self.screen_data, function (data) {
										return order_line_id === data.id;
									});
									if (record) {
										record.state = 'done';
									}
								}
							}
						});
				}
			}
			else {
				if (state_id == 'waiting') {
					rpc.query({
						model: 'pos.order.line',
						method: 'update_orderline_state',
						args: [{ 'state': 'delivering', 'order_line_id': order_line_id }],
					})
						.then(function (result) {
							if (result) {
								self.pos.mirror_kitchen_orders();
							}
						});
				} else if (state_id == 'delivering') {
					rpc.query({
						model: 'pos.order.line',
						method: 'update_orderline_state',
						args: [{ 'state': 'done', 'order_line_id': order_line_id }],
					})
						.then(function (result) {
							if (result) {
								self.pos.mirror_kitchen_orders();
								if (self.screen_data) {
									var record = _.find(self.screen_data, function (data) {
										return order_line_id === data.id;
									});
									if (record) {
										record.state = 'done';
									}
								}
							}
						});
				}
			}
		},
		kanban_btn_stage_changes: function (event) {
			var self = this;
			var order_state_records = [];
			var order_id = Number($(event.currentTarget).data('order-id'));
			var $el = $('.order-container[data-pos-order-id="' + order_id + '"]');
			$el.find('.table-order-line').each(function () {
				var line_id = Number($(this).find('div.state-button').data('id'));
				var state = $(this).find('div.state-button').data('state');
				var route = $(this).find('div.state-button').data('route');
				if (line_id && state) {
					order_state_records.push({
						'order_line_id': line_id,
						'state': state,
						'route': route,
					});
				}
			});
			if (order_state_records && order_state_records[0]) {
				$el.addClass('show_loading');
				rpc.query({
					model: 'pos.order.line',
					method: 'update_all_orderline_state',
					args: [order_state_records],
				})
					.then(function (result) {
						if (result) {
							self.pos.mirror_kitchen_orders();
							if (self.screen_data) {
								self.screen_data.map(function (s_data) {
									if (s_data.state == 'delivering') {
										s_data.state = 'done';
										$el.remove();
									}
								});
							}
						}
						$el.removeClass('show_loading');
					});
			}
			//        	self.pos.mirror_kitchen_orders();
		},
		cancel_order_click: function (event) {
			var self = this;
			var order_line_id = parseInt($(event.currentTarget).data('id'));
			var update_state = false
            var production_canceled = false
            var mo_id = parseInt($(event.currentTarget).data('mo'));
			if (order_line_id && mo_id) {
                rpc.query({
                    model: 'mrp.production',
                    method: 'pos_production_cancel',
                    args: [1, mo_id],
                })
                    .then(function (result) {
                        if (result) {
                            production_canceled = true
                            rpc.query({
                                model: 'pos.order.line',
                                method: 'update_orderline_state',
                                args: [{ 'state': 'cancel', 'order_line_id': order_line_id }],
                            })
                                .then(function (result) {
                                    if (result) {
                                        update_state = true
                                        self.pos.mirror_kitchen_orders();
                                    }
                                });
                        }
                     });
			}
			else if (order_line_id) {
			    rpc.query({
                    model: 'pos.order.line',
                    method: 'update_orderline_state',
                    args: [{ 'state': 'cancel', 'order_line_id': order_line_id }],
                })
                    .then(function (result) {
                        if (result) {
                            update_state = true
                            self.pos.mirror_kitchen_orders();
                        }
                    });
			}
		},
		cancel_pos_order: function (event) {
			var self = this;
			var cancel_order_id = parseInt($(event.currentTarget).attr('data-pos-order-id'));;
			if (cancel_order_id) {
				rpc.query({
					model: 'pos.order',
					method: 'cancel_pos_order',
					args: [Number(cancel_order_id)],
				}, { async: false }).then(function (result) {
					if (result) {
						self.pos.mirror_kitchen_orders();
					}
				}).fail(function () {
					alert("Connection lost !");
				});
			}
		},
		line_print_receipt: function (ev) {
			var line_id = $(ev.currentTarget).data('id');
			if (line_id) {
				this.get_pos_orderline_by_id(line_id);
			}
		},
		get_pos_orderline_by_id: function (line_id) {
			var self = this;
			rpc.query({
				model: 'pos.order',
				method: 'load_order_line_details',
				args: [line_id],
			}, { async: false }).done(function (lines) {
				if (lines && lines[0]) {
					var receipt = QWeb.render('KitchenLineReceipt', {
						widget: self,
						lines: lines,
					});
					self.pos.proxy.print_receipt(receipt);
				}
			});
		},
		order_print_receipt: function (ev) {
			var self = this;
			var order_id = $(ev.currentTarget).data('pos-order-id');
			if (order_id) {
				rpc.query({
					model: 'pos.order',
					method: 'load_order_details',
					args: [order_id],
				}, { async: false }).done(function (lines) {
					if (lines && lines[0]) {
						var receipt = QWeb.render('KitchenLineReceipt', {
							widget: self,
							lines: lines,
						});
						self.pos.proxy.print_receipt(receipt);
					}
				});
			}
		},
	});
	gui.define_screen({ name: 'kitchen_screen', widget: kitchenScreenWidget });

	//    order note popup for kitchen screen
	var ProductNotePopupWidget = PopupWidget.extend({
		template: 'ProductNotePopupWidget',
		show: function (options) {
			var self = this;
			options = options || {};
			this._super(options);
			this.renderElement();
			var order_note = options.note || ' ';
			if (order_note) {
				$('#Order_line_note').text(order_note);
			}
		},
		click_confirm: function () {
			this.gui.close_popup();
		},
	});
	gui.define_popup({ name: 'line_note_popup', widget: ProductNotePopupWidget });

});