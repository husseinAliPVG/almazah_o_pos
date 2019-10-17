from odoo import api, models, fields, registry\

class product_template(models.Model):

    _inherit = 'product.template'

    pos_categ_ids = fields.Many2many('pos.category', string='POS Categories')