from odoo import models, fields, api


class pvgPosOrder(models.Model):
    _inherit = 'pos.order'

    
    order_type = fields.Selection(
        string=u'Order Type',
        selection=[('dining', 'Dining'), ('takeaway', 'Takeaway'), ('delivery', 'Delivery')]
    )

    @api.model
    def _order_fields(self, ui_order):
        order_fields = super(pvgPosOrder, self)._order_fields(ui_order)
        order_fields['order_type'] = ui_order.get('order_type', False)
        return order_fields