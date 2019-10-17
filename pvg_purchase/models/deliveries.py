from odoo import api, fields, models


class pvgPurchaseDeliveries(models.Model):
    _name = "purchase.deliveries"
    _description = "Purchase Deliveries"

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    deliveries_lines = fields.One2many(comodel_name='purchase.deliveries.lines', inverse_name='purchase_deliveries_id',
                                       string=u'Deliveries Lines')
    company = fields.Many2one('res.company', string=u'Company', required=True)

    @api.multi
    def calculate_deliveries_lines(self):
        for record in self:
            for old_line in record.deliveries_lines:
                old_line.unlink()

            if record.start_date and record.end_date:
                vendors = self.env['res.partner'].search(['&', ('supplier', '=', 1), ('company_id', '=', record['company'].id)])
                if vendors:
                    deliveries_lines = []
                    for vendor in vendors:
                        deliveries = 0
                        positions = 0
                        amount_untaxed = 0.0
                        amount_total = 0.0
                        po_id = None
                        purchase_orders = self.env['purchase.order'].search(
                            ['&', ('date_order', '>=', record.start_date), ('date_order', '<=', record.end_date),
                             ('company_id', '=', record.company.id), ('partner_id', '=', vendor.id),
                             ('state', 'in', ['purchase', 'done'])])
                        if purchase_orders:
                            for po in purchase_orders:
                                po_id = po.id
                                deliveries += len(po.picking_ids.search(['&', ('state', '=', 'done'),('id', 'in', po.picking_ids.ids)]).ids)
                                positions += len(po.order_line.search([('id', 'in', po.order_line.ids)]))
                                amount_untaxed += po.amount_untaxed
                                amount_total += po.amount_total
                            deliveries_lines.append(
                                {'partner_id': vendor.id, 'deliveries': deliveries, 'positions': positions,
                                 'amount_untaxed': amount_untaxed, 'amount_total': amount_total})
                    record.deliveries_lines = deliveries_lines


class pvgPurchaseDeliveriesLines(models.Model):
    _name = 'purchase.deliveries.lines'
    _description = 'Purchase Deliveries Lines'

    partner_id = fields.Many2one('res.partner', string=u'Vendor')
    deliveries = fields.Integer(string=u'Deliveries')
    positions = fields.Integer(string=u'Positions')
    amount_untaxed = fields.Float(string=u'Total Untaxed')
    amount_total = fields.Float(string=u'Total')
    purchase_deliveries_id = fields.Many2one('purchase.deliveries', string=u'Purchase Deliveries')
