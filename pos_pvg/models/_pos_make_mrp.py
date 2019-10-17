# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import Warning
from odoo.exceptions import UserError


class MrpProduction(models.Model):
    _inherit = 'mrp.production'

    @api.multi
    def pos_get_order_line_product(self, line_id):
        line = self.env['pos.order.line'].search([('id', '=', line_id)])
        product = line.product_id
        if product:
            return True

    @api.multi
    def pos_create_mrp_from_line(self, line_id):
        line = self.env['pos.order.line'].search([('id', '=', line_id)])
        product_id = line.product_id.id
        qty = line.qty
        product_tmpl_id = line.product_id.product_tmpl_id[0].id
        pos_reference = line.order_id.pos_reference
        uom_id = line.product_id.uom_id[0].id

        if qty > 0:
            bom_count = self.env['mrp.bom'].search(
                [('product_tmpl_id', '=', product_tmpl_id)])
            if bom_count:
                bom_temp = self.env['mrp.bom'].search([('product_tmpl_id', '=', product_tmpl_id),
                                                       ('product_id', '=', False)])
                bom_prod = self.env['mrp.bom'].search(
                    [('product_id', '=', product_id)])
                if bom_prod:
                    bom = bom_prod[0]
                elif bom_temp:
                    bom = bom_temp[0]
                else:
                    bom = []
                if bom:
                    default_picking_type = self.env['stock.picking.type'].search(
                        [('code', '=', 'mrp_operation'),
                         ('warehouse_id.company_id', 'in',
                          [self.env.context.get('company_id', self.env.user.company_id.id), False])],
                        limit=1)
                    vals = {
                        'origin': 'POS-' + pos_reference,
                        'state': 'confirmed',
                        'product_id': product_id,
                        'product_tmpl_id': product_tmpl_id,
                        'product_uom_id': uom_id,
                        'product_qty': qty,
                        'bom_id': bom.id,
                        'company_id': self.env.user.company_id.id,
                        'user_id': self.env.user.id,
                        'picking_type_id': default_picking_type.id,
                        'location_src_id': default_picking_type.default_location_src_id.id,
                        'location_dest_id': default_picking_type.default_location_dest_id.id,
                    }
                    mo = self.sudo().create(vals)
                    line = line.write({'mo_id': mo.id})
                    return self.sudo().pos_check_stock(mo.id)
        return False



    @api.multi
    def pos_check_stock(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        if mo:
            res = mo.sudo().action_assign()
            assigned = mo.availability
            if assigned == 'assigned':
                return True
        return False

    @api.multi
    def pos_produce_product(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        mrp_product_produce = self.env['mrp.product.produce'].create({'production_id': mo.id, 'product_id': mo.product_id.id,
            'product_qty': mo.product_qty, 'product_uom_id': mo.product_uom_id.id})
        res = mrp_product_produce.sudo()._onchange_product_qty()
        res = mrp_product_produce.sudo().do_produce()
        if mo.state == 'progress':
            return True
        return False

    @api.multi
    def pos_production_done(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        marked_done = mo.sudo().button_mark_done()
        return marked_done

    @api.multi
    def pos_production_cancel(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        canceled = mo.sudo().action_cancel()
        if mo.state == 'cancel':
            return True
        return False

    @api.multi
    def pos_production_sate(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        if mo:
            return mo.state
        return False

    @api.multi
    def pos_production_qty(self, mo_id):
        mo = self.search([('id', '=', mo_id)])
        if mo:
            return mo.product_qty
        return False

    @api.multi
    def create_mrp_from_pos(self, products):
        product_ids = []
        mo_id = 0
        if products:
            for product in products:
                flag = 1
                if product_ids:
                    for product_id in product_ids:
                        if product_id['id'] == product['id']:
                            product_id['qty'] += product['qty']
                            flag = 0
                if flag:
                    product_ids.append(product)
            for prod in product_ids:
                qty = prod['qty']
                if qty > 0:
                    product = self.env['product.product'].search(
                        [('id', '=', prod['id'])])
                    bom_count = self.env['mrp.bom'].search(
                        [('product_tmpl_id', '=', prod['product_tmpl_id'])])
                    if bom_count:
                        bom_temp = self.env['mrp.bom'].search([('product_tmpl_id', '=', prod['product_tmpl_id']),
                                                               ('product_id', '=', False)])
                        bom_prod = self.env['mrp.bom'].search(
                            [('product_id', '=', prod['id'])])
                        if bom_prod:
                            bom = bom_prod[0]
                        elif bom_temp:
                            bom = bom_temp[0]
                        else:
                            bom = []
                        if bom:
                            default_picking_type = self.env['stock.picking.type'].search(
                                [('code', '=', 'mrp_operation'),
                                 ('warehouse_id.company_id', 'in',
                                  [self.env.context.get('company_id', self.env.user.company_id.id), False])],
                                limit=1)
                            previous_orders = self.sudo().search(
                                [('origin', '=', 'POS-' + prod['pos_reference']), ('product_id', '=', prod['id'])])
                            # previous_orders = previous_orders.distinct_field_get(field='create_date', value='')
                            if previous_orders:
                                self.order = previous_order
                                for self.order in previous_orders:
                                    qty = qty - previous_order['product_qty']
                            if qty > 0:
                                vals = {
                                    'origin': 'POS-' + prod['pos_reference'],
                                    'state': 'confirmed',
                                    'product_id': prod['id'],
                                    'product_tmpl_id': prod['product_tmpl_id'],
                                    'product_uom_id': prod['uom_id'],
                                    'product_qty': qty,
                                    'bom_id': bom.id,
                                    'company_id': self.env.user.company_id.id,
                                    'user_id': self.env.user.id,
                                    'picking_type_id': default_picking_type.id,
                                    'location_src_id': default_picking_type.default_location_src_id.id,
                                    'location_dest_id': default_picking_type.default_location_dest_id.id,
                                    # 'state': 'progress',
                                }
                                mo = self.sudo().create(vals)
                                mo_id = mo.id
                                pos_reference = prod['pos_reference']
                                order_id = self.env['pos.order'].search([('pos_reference', '=', pos_reference)]).id
                                order_line = self.env['pos.order.line'].search(
                                    [('pos_cid', '=', prod['pos_cid']), ('order_id', '=', order_id)])
                                order_line = order_line.write({'mo_id': mo_id})
                                # mo = self.create(vals)

                                if bom['type'] == 'normal':
                                    mo.button_plan()
                            # elif qty < 1:
                            #     for previous_order in previous_orders:
                            #         if previous_order['product_id'].id == prod['id']:
                            #             previous_order.sudo().action_cancel()

        return mo_id

    @api.model
    def _get_default_picking_type(self):
        return self.env['stock.picking.type'].search([
            ('code', '=', 'mrp_operation'),
            (
            'warehouse_id.company_id', 'in', [self.env.context.get('company_id', self.env.user.company_id.id), False])],
            limit=1).id

    @api.model
    def _get_default_location_src_id(self):
        location = False
        if self._context.get('default_picking_type_id'):
            location = self.env['stock.picking.type'].browse(
                self.env.context['default_picking_type_id']).default_location_src_id
        if not location:
            location = self.env.ref(
                'stock.stock_location_stock', raise_if_not_found=False)
        return location and location.id or False

    @api.model
    def _get_default_location_dest_id(self):
        location = False
        if self._context.get('default_picking_type_id'):
            location = self.env['stock.picking.type'].browse(
                self.env.context['default_picking_type_id']).default_location_dest_id
        if not location:
            location = self.env.ref(
                'stock.stock_location_stock', raise_if_not_found=False)
        return location and location.id or False


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    to_make_mrp = fields.Boolean(string='To Create MRP Order',
                                 help="Check if the product should be make mrp order")

    @api.onchange('to_make_mrp')
    def onchange_to_make_mrp(self):
        if self.to_make_mrp:
            if not self.bom_count:
                raise Warning('Please set Bill of Material for this product.')


class ProductProduct(models.Model):
    _inherit = 'product.product'

    @api.onchange('to_make_mrp')
    def onchange_to_make_mrp(self):
        if self.to_make_mrp:
            if not self.bom_count:
                raise Warning('Please set Bill of Material for this product.')
