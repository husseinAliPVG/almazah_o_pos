from odoo import api, fields, models


class posCustomerOrdersReport(models.Model):
    _name = "pos.customers.orders.report"
    _description = "PoS customers orders report"

    name = fields.Char(
        string=u'Name',
        compute='compute_name',
    )
    start_date = fields.Datetime(
        string=u'Start Date',
    )
    end_date = fields.Datetime(
        string=u'End Date',
    )

    customers = fields.Many2many(
        string=u'Customers',
        comodel_name='res.partner',
        relation='pos_customers_orders_report_res_partner_rel',
        column1='res_partner_id',
        column2='pos_customers_orders_reprot_id',
        domain=[('customer', '=', 1)]
    )

    products = fields.Many2many(
        string=u'Products',
        comodel_name='product.product',
        relation='pos_customers_orders_report_product_rel',
        column1='product_id',
        column2='pos_customers_orders_report_id',
    )
    pos_orders = fields.Many2many(
        string=u'POS Orders',
        comodel_name='pos.order',
        relation='customers_orders_report_pos_order_pos_rel',
        column1='pos_order_id',
        column2='pos_customers_orders_report_id',
        compute='compute_pos_orders',
    )

    pos_customer_orders_report = fields.Many2many(
        string=u'POS Customer Order Reports',
        comodel_name='pos.customer.orders.report',
        relation='pos_customers_report_customer_orders_rel',
        column1='pos_customer_orders_report_id',
        column2='pos_customers_orders_report_id',
    )

    @api.onchange('start_date', 'end_date')
    def compute_name(self):
        for record in self:
            if record.start_date and record.end_date:
                record.name = 'From: ' + record.start_date.strftime(
                    "%Y-%m-%d %H:%M:%S") + ' To: ' + record.end_date.strftime("%Y-%m-%d %H:%M:%S")

    @api.onchange('start_date', 'end_date')
    def compute_pos_orders(self):
        for record in self:
            pos_orders = self.env['pos.order'].search(['&', ('date_order', '>=', record.start_date), (
                'date_order', '<=', record.end_date), ('partner_id', '=', record.customers.ids)])
            pos_orders = self.env['pos.order'].search(['&', ('date_order', '>=', record.start_date), (
                'date_order', '<=', record.end_date)])
            record.pos_orders = [(6, 0, pos_orders.ids)]

    @api.multi
    def calculate_sales(self):
        for record in self:
            if record.pos_customer_orders_report:
                for report_line in record.pos_customer_orders_report:
                    report_line.unlink()
            all_report_lines = []
            if record.customers:
                for customer in record.customers:
                    customer_pos_orders = self.env['pos.order'].search(['&', ('date_order', '>=', record.start_date), (
                        'date_order', '<=', record.end_date), ('partner_id', '=', customer.id)])

                    customer_report_lines = []
                    t_quantity = 0.0
                    t_sales = 0.0
                    t_discount = 0.0
                    products = record.products
                    if not products:
                        company_id = self.env.user.company_id.id
                        products = self.env['product.product'].search(['&',('available_in_pos','=',1), ('company_id','=', company_id)])
                    for product in products:
                            quantity = 0.0
                            sales = 0.0
                            discount = 0.0
                            for customer_pos_order in customer_pos_orders:
                                for order_line in customer_pos_order.lines:
                                    if product.id == order_line.product_id.id:
                                        quantity += order_line.qty
                                        sales += order_line.price_unit * order_line.qty
                                        discount = (
                                            product.lst_price * quantity) - sales
                                        
                            if quantity != 0.0:
                                t_quantity += quantity
                                t_sales += sales
                                t_discount += discount
                                
                                customer_report_lines.append((0, 0,
                                                              {'product': product.id, 'customer': customer.id, 'quantity': quantity, 'sales': sales, 'discount': discount}))

                    all_report_lines.append({'customer': customer.id, 'start_date': record.start_date, 'end_date': record.end_date, 'products': [
                        (6, 0, products.ids)], 'pos_orders': customer_pos_orders.ids,
                        'report_lines_ids': customer_report_lines, 'total_quantity': t_quantity, 'total_sales': t_sales, 'total_discount': t_discount})


            pos_orders = self.env['pos.order'].search(['&', ('date_order', '>=', record.start_date), (
                'date_order', '<=', record.end_date),('partner_id', '=', False)])
            if pos_orders:
                cash_report_lines = []
                c_t_quantity = 0.0
                c_t_sales = 0.0
                c_t_discount = 0.0
                products = record.products
                if not products:
                    company_id = self.env.user.company_id.id
                    products = self.env['product.product'].search(['&', ('available_in_pos', '=', 1), ('company_id', '=', company_id)])
                for product in products:
                        c_quantity = 0.0
                        c_sales = 0.0
                        c_discount = 0.0
                        for pos_order in pos_orders:
                            for order_line in pos_order.lines:
                                if product.id == order_line.product_id.product_tmpl_id.id:
                                    c_quantity += order_line.qty
                                    c_t_quantity += c_quantity
                                    c_sales += order_line.price_unit * order_line.qty
                                    c_t_sales += c_sales
                                    discount = (
                                        product.lst_price * c_quantity) - c_sales
                                    c_t_discount += c_discount
                        if c_quantity != 0.0:
                            cash_report_lines.append((0, 0,
                                                      {'product': product.id, 'quantity': c_quantity, 'sales': c_sales, 'discount': c_discount}))

                all_report_lines.append({'start_date': record.start_date, 'end_date': record.end_date, 'products': [
                    (6, 0, products.ids)], 'pos_orders': pos_orders.ids,
                    'report_lines_ids': cash_report_lines, 'total_quantity': c_t_quantity, 'total_sales': c_t_sales, 'total_discount': c_t_discount})

            if all_report_lines:
                record.pos_customer_orders_report = record.pos_customer_orders_report.create(
                    all_report_lines)
