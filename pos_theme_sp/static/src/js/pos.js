odoo.define('pos_floor_base', function(require){
    var screens = require('point_of_sale.screens');
    screens.OrderWidget.include({
        update_summary: function(){
            this._super();
            var orders = this.pos.get_order();
            var qty = 0;
            if(orders != null){
                var order_lines = orders.get_orderlines()
                for(var i=0;i<order_lines.length;i++){
                    qty+=order_lines[i].quantity;
                }
                
                orders.items = qty;
            }
            $(".count_num_item").html(qty);
        },
    });
});
