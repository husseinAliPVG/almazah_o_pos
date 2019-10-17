import dateutil
from odoo import api, fields, models


class pvgPurchasePriceChanges(models.Model):
    _name = "purchase.price.changes"
    _description = "Purchase Price Changes"

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    price_changes_lines = fields.One2many(comodel_name='purchase.price.changes.lines',
                                          inverse_name='purchase_price_changes_id',
                                          string=u'Price Changes Lines')
    company = fields.Many2one('res.company', string=u'Company', required=True)

    @api.multi
    def calculate_price_changes_lines(self):
        for record in self:
            for old_line in record.price_changes_lines:
                old_line.unlink()

            if record.start_date and record.end_date:
                price_changes_lines = []
                products = self.env['product.template'].search(['&', ('purchase_ok', '=', 1), ('company_id', '=', record.company.id)])
                for product in products:
                    vendors = []
                    for seller_id in product.seller_ids:
                        vendors.append(seller_id.name.id)
                    for vendor in vendors:
                        pols_ids = self.env['purchase.order.line'].search(
                            ['&', ('product_id', '=', product.id), ('date_order', '>=', record.start_date),
                             ('date_order', '<=', record.end_date), ('state', 'in', ['purchase', 'done']),
                             ('partner_id', '=', vendor)]).ids
                        if len(pols_ids) >= 2:
                            pols_ids.sort(reverse=True)
                            pol_old = self.env['purchase.order.line'].search([('id', '=', pols_ids[1])])
                            pol_new = self.env['purchase.order.line'].search([('id', '=', pols_ids[0])])
                            price_changes_lines.append({
                                'partner_id': vendor,
                                'product_id': product.id,
                                'old_qty': pol_old.product_qty,
                                'new_qty': pol_new.product_qty,
                                'old_price': pol_old.price_unit,
                                'new_price': pol_new.price_unit,
                                'old_date': pol_old.date_order.date(),
                                'new_date': pol_new.date_order.date(),
                                'diff': pol_new.price_unit - pol_old.price_unit,
                            })
                if price_changes_lines:
                    record.price_changes_lines = price_changes_lines



class pvgPurchasePriceChangesLines(models.Model):
    _name = 'purchase.price.changes.lines'
    _description = 'Purchase Price Changes Lines'

    partner_id = fields.Many2one('res.partner', string=u'Vendor')
    product_id = fields.Many2one('product.template')
    product_uom = fields.Many2one(string=u'UOM', related='product_id.uom_po_id')
    old_qty = fields.Float(string=u'#1 Quantity')
    new_qty = fields.Float(string=u'#2 Quantity')
    old_price = fields.Float(string=u'#1 Price')
    new_price = fields.Float(string=u'#2 Price')
    old_date = fields.Date(string=u'#1 Date')
    new_date = fields.Date(string=u'#2 Date')
    diff = fields.Float(string=u'Difference')
    purchase_price_changes_id = fields.Many2one('purchase.price.changes', string=u'Purchase Price Changes')
