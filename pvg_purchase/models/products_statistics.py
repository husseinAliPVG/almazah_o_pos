from odoo import fields, models, api


class pvgPurchaseProductsStatistics(models.Model):
    _name = 'purchase.products.statistics'
    _description = 'Purchase Products Statistics'

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    company = fields.Many2one('res.company', string=u'Company', required=True)
    lines = fields.One2many(comodel='purchase.products.statistics.lines', inverse_name='purchase_products_statistics',
                            string='Lines')

    @api.multu
    def calculate_purchase_products_statistics_lines(self):
        for record in self:
            for old_line in record.lines:
                old_line.unlink()
        if record.start_date and record.end_date:
            lines = []
            products = self.env['product.template'].search(
                ['&', ('purchase_ok', '=', 1), ('company_id', '=', record.company.id)])
            for product in products:
                vendors = []
                for seller_id in product.seller_ids:
                    vendors.append(seller_id.name.id)
                for vendor in vendors:
                    pols_ids = self.env['purchase.order.line'].search(
                        ['&', ('product_id', '=', product.id), ('date_order', '>=', record.start_date),
                         ('date_order', '<=', record.end_date), ('state', 'in', ['purchase', 'done']),
                         ('partner_id', '=', vendor)]).ids
                    if pols_ids:
                        pols_ids.sort(reverse=True)
                        qty = 0.0
                        average_price = 0.0
                        last_price = self.env['purchase.order.line'].search([('id', '=', pols_ids[0])]).price_unit
                        min_price = last_price
                        max_price = last_price
                        subtotal = 0.0
                        tax = 0.0
                        gross = 0.0
                        for pol_id in pols_ids:
                            pol = self.env['purchase.order.line'].search([('id', '=', pol_id)])
                            qty += pol.product_qty
                            if pol.price_unit < min_price:
                                min_price = pol.price_unit
                            if pol.price_unit > max_price:
                                max_price = pol.price_unit
                            subtotal += pol.price_subtotal
                            tax += pol.price_tax
                            gross += pol.price_total
                        average_price = subtotal/qty
                        lines.append({
                            'product_id': product.id,
                            'partner_id': vendor,
                            'qty': qty,
                            'average_price': average_price,
                            'last_price': last_price,
                            'min_price': min_price,
                            'max_price': max_price,
                            'subtotal': subtotal,
                            'tax': tax,
                            'gross': gross,
                        })



class pvgPurchaseProductsStatistics(models.Model):
    _name = 'purchase.products.statistics.lines'
    _description = 'Purchase Products Statistics Lines'

    mode_dest_ids = fields.Many2many(
        comodel_name='stock.move',
        relation='purchase_order_line_stock_move',
        column1='stock_move_id',
        column2='purchase_order_id',
        string='uDownstream Moves')
    product_id = fields.Many2one('product.template', string='uProduct')
    product_category = fields.Many2one('product.category', string='uCategory', related='product_id.categ_id')
    product_uom = fields.Many2one(string=u'UOM', related='product_id.uom_po_id')
    partner_id = fields.Many2one('res.partner', string=u'Vendor')
    qty = fields.Float(string=u'QTY')
    average_price = fields.Float(string=u'Average Price')
    last_price = fields.Float(string=u'Last Price')
    min_price = fields.Float(string=u'MIN Price')
    max_price = fields.Float(string=u'MAX Price')
    subtotal = fields.float(string=u'NET')
    tax = fields.Float(string=u'VAT')
    gross = fields.Float(string=u'GROSS')
    purchase_products_statistics = fields.Many2one('purchase.products.statistics',
                                                   string='Purchase Products Statistics')
