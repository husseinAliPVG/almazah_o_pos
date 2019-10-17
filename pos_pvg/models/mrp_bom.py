from odoo import api, fields, models, _
from odoo.addons import decimal_precision as dp
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_round

from itertools import groupby


class PVGMrpBomLine(models.Model):
    _inherit = 'mrp.bom.line'

    total_product_qty = fields.Float(
        'Total Quantity', default=0.0,
        digits=dp.get_precision('Unit of Measure'), required=True)

    scrap_product_qty = fields.Float(
        'Scrap Quantity', default=0.0,
        digits=dp.get_precision('Unit of Measure'), required=True)

    @api.onchange('product_qty', 'scrap_product_qty')
    def onchange_product_qty(self):
        self.total_product_qty = self.product_qty + self.scrap_product_qty


class PVGProduct(models.Model):
    _inherit = 'product.product'

    def _compute_bom_price(self, bom, boms_to_recompute=False):
        self.ensure_one()
        if not boms_to_recompute:
            boms_to_recompute = []
        total = 0
        quant_quantity = bom.product_uom_id._compute_quantity(bom.product_qty, bom.product_tmpl_id.uom_id)
        for opt in bom.routing_id.operation_ids:
            duration_expected = (
                    opt.workcenter_id.time_start +
                    opt.workcenter_id.time_stop +
                    quant_quantity * opt.time_cycle)
            total += (duration_expected / 60) * opt.workcenter_id.costs_hour
        for line in bom.bom_line_ids:
            if line._skip_bom_line(self):
                continue

            # Compute recursive if line has `child_line_ids`
            if line.child_bom_id and line.child_bom_id in boms_to_recompute:
                child_total = line.product_id._compute_bom_price(line.child_bom_id, boms_to_recompute=boms_to_recompute)
                total += line.product_id.uom_id._compute_price(child_total,
                                                               line.product_uom_id) * line.total_product_qty
            else:
                total += line.product_id.uom_id._compute_price(line.product_id.standard_price,
                                                               line.product_uom_id) * line.total_product_qty
        return bom.product_uom_id._compute_price(total / bom.product_qty, self.uom_id)


class MrpProductProduce(models.TransientModel):
    _inherit = "mrp.product.produce"

    @api.multi
    def do_produce(self):
        super().do_produce()
        scrapped = False
        bol_line_ids = self.production_id.bom_id.bom_line_ids
        for line_id in bol_line_ids:
            line = line_id
            scrapped = self.env['stock.scrap'].create(
                {'product_id': line.product_id.id, 'scrap_qty': line.scrap_product_qty,
                 'production_id': self.production_id.id, 'product_uom_id': line.product_uom_id.id,
                 'location_id': self.production_id.location_src_id.id})
            scrapped.action_validate()
            scrapped.move_id.write({'production_id': self.production_id.id})
        return True
