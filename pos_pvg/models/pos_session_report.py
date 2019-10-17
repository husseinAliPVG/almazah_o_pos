from odoo import api, fields, models


class PosSession(models.Model):
    _inherit = 'pos.session'

    orders_count = fields.Integer(string=u'No of Orders', compute='compute_orders_count')
    net_sales = fields.Float(string=u'Total Sales', compute='compute_net_sales')
    vat_amount = fields.Float(string=u'VAT (5%)')
    sales_revenue = fields.Float(string=u'Total Sales With VAT')
    sales_discount = fields.Float(string=u'Total Discount')
    total_item_discount = fields.Integer(string=u'Total Item Discount')
    debt_customers = fields.One2many('pos.session.debt.customer', inverse_name='pos_session', string=u'Debt Customers')
    categories_sales = fields.One2many('pos.session.category.sales', inverse_name='pos_session', string=u'Categories Sales')

    @api.onchange('state')
    def compute_orders_count(self):
        for record in self:
            if record.state == 'closed':
                record.orders_count = len(record.order_ids.ids)

    @api.onchange('state')
    def compute_net_sales(self):
        for record in self:
            if record.state == 'closed':
                net_sales = 0.0
                vat_amount = 0.0
                sales_revenue = 0.0
                sales_discount = 0.0
                total_item_discount = 0.0
                debt_customers = []
                for order in record.order_ids:
                    vat_amount += order.amount_tax
                    # net_sales += order.amount_total - order.amount_tax
                    sales_revenue += order.amount_total
                    for order_line in order.lines:
                        if order_line.discount > 0:
                            sales_discount += (order_line.discount * (order_line.price_unit * order_line.qty)) / 100
                            total_item_discount += order_line.qty
                        net_sales += order_line.price_unit * order_line.qty
                    for statement in order.statement_ids:
                        if statement.journal_id.debt:
                            debt_customers.append({'id': order.partner_id.id, 'name': order.partner_id.display_name,
                                                   'debt': statement.amount})

                record.net_sales = net_sales
                record.vat_amount = vat_amount
                record.sales_revenue = sales_revenue
                record.sales_discount = sales_discount
                record.total_item_discount = total_item_discount

                if debt_customers:
                    for debt_customer in record.debt_customers:
                        debt_customer.unlink()
                    customers = self.env['res.partner'].search(
                        [('customer', '=', 1), ('company_id', '=', self.env.user.company_id.id)])
                    customers_debt = []
                    for customer in customers:
                        debt_amount = 0.0
                        for debt_customer in debt_customers:
                            if debt_customer['id'] == customer.id:
                                debt_amount += debt_customer['debt']
                        customers_debt.append({'name': customer.name, 'debt': debt_amount})
                    record.debt_customers = customers_debt

                    pos_categories = self.env['pos.category'].search([('id', '!=', 0)])
                    categories_sales = []
                    for pos_category in pos_categories:
                        order_lines = self.env['pos.order.line'].search([('order_id', 'in', record.order_ids.ids), ('product_id.pos_categ_id', '=', pos_category.id)])
                        sales = 0.0
                        for order_line in order_lines:
                            sales += order_line.price_unit * order_line.qty
                        if sales > 0.0:
                            categories_sales.append({'name': pos_category.name, 'sales': sales})
                    if categories_sales:
                        record.categories_sales = categories_sales


class posSessionDebtCustomers(models.Model):
    _name = 'pos.session.debt.customer'

    name = fields.Char(string=u'Customer')
    debt = fields.Float(string=u'Debt')
    pos_session = fields.Many2one('pos.session', string=u'POS Session')


class posSessionCategorySales(models.TransientModel):
    _name = 'pos.session.category.sales'

    name = fields.Char(string=u'Category')
    sales = fields.Float(string=u'Sales')
    pos_session = fields.Many2one('pos.session', string=u'POS Session')
