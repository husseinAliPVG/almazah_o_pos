from odoo import api, fields, models


class pvgPurchaseOrderAccruals(models.Model):
    _name = "purchase.accruals"
    _description = "Purchase Order Accrual"

    start_date = fields.Date(string=u'Start Date', required=True)
    end_date = fields.Date(string=u'End Date', required=True)
    accruals_lines = fields.One2many(comodel_name='purchase.accruals.lines', inverse_name='purchase_accruals_id',
                                     string=u'Accruals Lines')
    company = fields.Many2one('res.company', string=u'Company', required=True)

    @api.multi
    def calculate_accruals_linse(self):
        for record in self:
            for old_line in record.accruals_lines:
                old_line.unlink()

            if record.start_date and record.end_date:
                purchase_orders = self.env['purchase.order'].search(
                    ['&', ('date_order', '>=', record.start_date), ('date_order', '<=', record.end_date), ('company_id', '=', record.company.id), ('state', 'in', ['purchase', 'done'])])
                if purchase_orders:
                    accruals_lines = []
                    for po in purchase_orders:
                        po_partner_id = po.partner_id
                        accruals_lines.append({'po_id': po.id, 'po_reference': po.name, 'po_partner_id': po_partner_id.id, 'po_date_order': po.date_order,
                                               'po_amount_untaxed': po.amount_untaxed,
                                               'po_amount_total': po.amount_total})
                    record.accruals_lines = accruals_lines

class pvgPurchaseOrderAccrualsLines(models.Model):
    _name = 'purchase.accruals.lines'
    _description = 'Purchase Order Accrual Lines'

    po_id = fields.Many2one('purchase.order', string=u'Purchase Order')
    po_reference = fields.Char(string=u'Reference')
    po_partner_id = fields.Many2one('res.partner', string=u'Vendor')
    po_date_order = fields.Datetime(string=u'Date')
    po_amount_untaxed = fields.Float(string=u'Total Untaxed')
    po_amount_total = fields.Float(string=u'Total')
    purchase_accruals_id = fields.Many2one('purchase.accruals', string=u'Purchase Accruals')
