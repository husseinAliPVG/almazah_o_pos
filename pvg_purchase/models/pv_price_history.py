from odoo import api, fields, models


class pvgPurchasePriceQuoteHistory(models.Model):
    _name = "purchase.vendors.price.history"
    _description = "Purchase Vendors Price History"

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    pv_price_history_vendors = fields.One2many(comodel_name='purchase.vendors.price.history.vendor',
                                                 inverse_name='pv_price_history_id',
                                                 string=u'Vendors')
    company = fields.Many2one('res.company', string=u'Company', required=True)

    @api.multi
    def calculate_pv_price_history_vendors(self):
        for record in self:
            for old_pv_h_vendors in record.pv_price_history_vendors:
                for old_pv_h_line in old_pv_h_vendors.pv_price_history_lines:
                    old_pv_h_line.unlink()
                old_pv_h_vendors.unlink()

            if record.start_date and record.end_date:
                pv_history_vendors = []
                vendors_ids = self.env['res.partner'].search(
                    ['&', ('supplier', '=', 1), ('company_id', '=', record.company.id)]).ids
                for vendor_id in vendors_ids:
                    pv_history_lines = []
                    supplierinfos = self.env['product.supplierinfo'].search([('name', '=', vendor_id)])
                    for supplierinfo_id in supplierinfos:
                        product_id = supplierinfo_id.product_tmpl_id.id
                        pols_ids = self.env['purchase.order.line'].search(
                            ['&', ('product_id', '=', product_id), ('date_order', '>=', record.start_date),
                             ('date_order', '<=', record.end_date), ('state', 'in', ['purchase', 'done']),
                             ('partner_id', '=', vendor_id)]).ids
                        if pols_ids:
                            pols_ids.sort(reverse=True)
                            pol = self.env['purchase.order.line'].search([('id', '=', pols_ids[0])])
                            pv_history_lines.append({
                                'partner_id': vendor_id,
                                'product_id': product_id,
                                'product_uom': pol.product_uom,
                                'price': pol.price_unit,
                                'date': pol.date_order.date(),
                            })
                    pv_history_vendors.append({
                        'partner_id': vendor_id,
                        'pv_price_history_lines': pv_history_lines
                    })
                record.pv_price_history_vendors = pv_history_vendors


class pvgPurchasePriceQuoteHistoryVendors(models.Model):
    _name = 'purchase.vendors.price.history.vendor'
    _description = 'Purchase vendors Price History Vendor'

    partner_id = fields.Many2one('res.partner', string=u'Vendor')
    pv_price_history_lines = fields.One2many(comodel_name='purchase.vendors.price.history.lines',
                                                inverse_name='pv_price_history_vendor_id',
                                                string=u'PO Price History Lines')
    pv_price_history_id = fields.Many2one('purchase.vendors.price.history',
                                                      string=u'History Lines')


class pvgPurchasePriceQuoteHistoryLines(models.Model):
    _name = 'purchase.vendors.price.history.lines'
    _description = 'Purchase vendors Price History Lines'

    partner_id = fields.Many2one('res.partner', string=u'Vendor')
    product_id = fields.Many2one('product.template')
    product_uom = fields.Many2one(string=u'UOM', related='product_id.uom_id')
    price = fields.Float(string=u'Price')
    date = fields.Date(string=u'Date')
    pv_price_history_vendor_id = fields.Many2one('purchase.vendors.price.history.vendor',
                                                             string=u'PO Price Vendor')
