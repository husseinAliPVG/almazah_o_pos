from odoo import api, fields, models


class posSalesCostReport(models.Model):
    _name = "pos.sales.cost.report"
    _description = "Point of sale sales and cost report"

    name = fields.Char(
        string=u'Name',
        compute="compute_name",
    )
    start_date_time = fields.Datetime(
        string=u'Start Date & Time',
    )
    end_date_time = fields.Datetime(
        string=u'End Date & Time',
    )
    products = fields.Many2many(
        string=u'Products',
        comodel_name='product.product',
        relation='pos_sales_caost_report_product_rel',
        column1='product_id',
        column2='pos_sales_caost_report_id',
    )
    pos_orders = fields.Many2many(
        string=u'POS Orders',
        comodel_name='pos.order',
        relation='pos_sales_caost_report_pos_order_rel',
        column1='pos_order_id',
        column2='pos_sales_caost_report_id',
        compute='compute_pos_orders',
    )

    report_lines_ids = fields.One2many(
        string=u'Report Lines',
        comodel_name='pos.sales.cost.report.line',
        inverse_name='pos_sales_cost_report',
    )

    sales = fields.Float(
        string=u'Sales',
    )

    @api.onchange('start_date_time', 'end_date_time')
    def compute_name(self):
        for record in self:
            if record.start_date_time and record.end_date_time:
                record.name = 'From: ' + record.start_date_time.strftime(
                    "%Y-%m-%d %H:%M:%S") + ' To: ' + record.end_date_time.strftime("%Y-%m-%d %H:%M:%S")

    @api.onchange('start_date_time', 'end_date_time')
    def compute_pos_orders(self):
        for record in self:
            pos_orders = self.env['pos.order'].search(
                ['&', ('date_order', '>=', record.start_date_time), ('date_order', '<=', record.end_date_time)])
            ids = []
            for pos_order in pos_orders:
                ids.append(pos_order.id)
            record.pos_orders = [(6, 0, ids)]

    @api.multi
    def calculate_report_linse(self):
        for record in self:
            if record.report_lines_ids:
                for report_line in record.report_lines_ids:
                    report_line.unlink()

            # if record.products:
            #     for product in record.products:
            #         product.unlink()

            report_lines = []
            t_quantity = 0.0
            t_sales_price = 0.0
            t_sales = 0.0
            t_discount = 0.0
            t_discount_per = 0.0
            t_total_cost = 0.0
            t_cost = 0.0
            t_cost_per = 0.0

            company_id = self.env.user.company_id.id
            products = record.products
            if not products:
                products = self.env['product.product'].search(
                    ['&', ('available_in_pos', '=', 1), ('company_id', '=', company_id)])

            for product in products:
                quantity = 0.0
                sales = 0.0
                discount = 0.0
                discount_per = 0.0
                total_cost = 0.0
                cost_per = 0.0
                for order in record.pos_orders:
                    for order_line in order.lines:
                        if product.id == order_line.product_id.id:
                            quantity += order_line.qty
                            sales += order_line.price_subtotal
                discount = (product.lst_price * quantity) - sales
                if quantity != 0 and product.lst_price != 0:
                    discount_per = 100 - ((sales / (quantity * product.lst_price)) * 100)

                total_cost = quantity * product.standard_price
                if quantity != 0 and product.standard_price != 0:
                    cost_per = ((quantity * product.standard_price) / sales) * 100

                if quantity != 0.0:
                    report_lines.append({'product': product.id, 'quantity': quantity, 'sales_price': product.lst_price,
                                         'total_sales': sales, 'total_discount': discount, 'discount_per': discount_per,
                                         'cost': product.standard_price, 'total_cost': total_cost,
                                         'cost_per': cost_per})
            if len(report_lines) != 0:
                record.report_lines_ids = report_lines
                record.sales = t_sales


class posSalesCostReportLine(models.Model):
    _name = "pos.sales.cost.report.line"
    _description = "POS Sales Cost Report Line"

    name = fields.Char(
        string=u'Name',
    )
    pos_sales_cost_report = fields.Many2one(
        string=u'POS Sales Cost Report',
        comodel_name='pos.sales.cost.report',
        ondelete='CASCADE',
    )
    product = fields.Many2one(
        string=u'Product',
        comodel_name='product.product',
        ondelete='set NULL',
    )
    quantity = fields.Float(
        string=u'Quantity',
    )
    sales_price = fields.Float(
        string=u'Sales Price',
    )
    total_sales = fields.Float(
        string=u'Total Sales',
    )
    total_discount = fields.Float(
        string=u'Total Discount',
    )
    discount_per = fields.Float(
        string=u'Discount %',
    )
    cost = fields.Float(
        string=u'Cost',
    )
    total_cost = fields.Float(
        string=u'Total Cost',
    )
    cost_per = fields.Float(
        string=u'Cost %',
    )
