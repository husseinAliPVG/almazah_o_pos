from odoo import models, fields, api


class pvgPosOrder(models.Model):
    _inherit = 'pos.order'

    order_type = fields.Many2one('pos.order.type', string=u'Order Type')



class pvgPosOrderType (models.Model):
    _name = 'pos.order.type'
    _description = 'Type for pos orders'

    name = fields.Char(
        string=u'Order Type',
    )

# pos_order_type_user,pos.order.type.user,model_pos_order_type,point_of_sale.group_pos_user,1,0,0,0
# pos_order_type_manager,pos.order.type.manager,model_pos_order_type,point_of_sale.group_pos_manager,1,1,1,0