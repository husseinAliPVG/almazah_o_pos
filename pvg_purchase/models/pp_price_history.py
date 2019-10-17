from odoo import api, fields, models

class pvgPurchaseProductsPriceHistory(models.Model):
    _name = 'purchase.products.price.history'
    _description = 'Purchase Products Price History'

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    company = fields.Many2one('res.company', string=u'Company', required=True)
    pp_price_history_lines = fields.One2many(comodel_name = 'purchase.products.price.history.lines', inverse_name = 'pp_price_history', string=u'Lines')

    @api.multi
    def claculate_pp_history_lines(self):
        for record in self:
            for old_line in record.pp_price_history_lines:
                old_line.unlink();

            if record.start_date and record.end_date:
                products = self.env['product.template'].search(['&', ('purchase_ok', '=', 1), ('company_id', '=', record.company.id)])
                lines = []
                for product in products:
                    pols_ids = self.env['purchase.order.line'].search(
                        ['&', ('product_id', '=', product.id), ('date_order', '>=', record.start_date),
                         ('date_order', '<=', record.end_date), ('state', 'in', ['purchase', 'done']), ]).ids
                    if pols_ids:
                        pols_ids.sort(reverse=True)
                        l_po = self.env['purchase.order.line'].search([('id', '=', pols_ids[0])])
                        if len(pols_ids) > 1:
                            bl_po = self.env['purchase.order.line'].search([('id', '=', pols_ids[1])])
                        else:
                            bl_po = l_po
                    lines.append({
                        'product_id': product.id,
                        'l_partner_id': l_po.partner_id,
                        'bl_partner_id': bl_po.partner_id,
                        'l_price': l_po.price_unit,
                        'bl_price': bl_po.price_unit,
                        'l_date_order': l_po.date_order.date(),
                        'bl_date_order': bl_po.date_order.date(),
                    })
                if lines:
                    record.pp_price_history_lines = lines




class pvgPurchaseProductsPriceHistoryLines(models.Model):
    _name = 'purchase.products.price.history.lines'
    _description = 'Purchase Products Price History Lines'

    product_id = fields.Many2one('product.template')
    product_uom = fields.Many2one(string=u'UOM', related='product_id.uom_po_id')
    l_partner_id = fields.Many2one('res.partner', string=u'Last Vendor')
    bl_partner_id = fields.Many2one('res.partner', string=u'Before Last Vendor')
    l_price = fields.Float(string=u'Last Price')
    bl_price = fields.Float(string=u'Before Last Price')
    l_date_order = fields.Date(string=u'Last Order Date')
    bl_date_order = fields.Date(string=u'Before Last Order Date')
    pp_price_history = fields.Many2one('purchase.products.price.history', string=u'Purchase Products Price History')
