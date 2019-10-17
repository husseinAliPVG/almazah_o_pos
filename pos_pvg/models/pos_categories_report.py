from odoo import api, fields, models


class posCategoriesReport(models.Model):
    _name = "pos.categories.report"
    _description = "POS Categories Orders Report"

    name = fields.Char(string=u'Name', compute='compute_name')
    start_date = fields.Datetime(string=u'Start Date')
    end_date = fields.Datetime(string=u'End Date')
    pos_categories = fields.Many2many(string=u'Categories', comodel_name='pos.category',
                                      relation='pos_categories_report_category_rel', column1='pos_category_id',
                                      column2='pos_categories_report_id')
    report_categories = fields.One2many(string=u'Report Categories',
                                        comodel_name='pos.categories.r.category',
                                        inverse_name='categories_report')

    @api.onchange('start_date', 'end_date', 'customer')
    def compute_name(self):
        for record in self:
            if record.start_date and record.end_date:
                record.name = 'From: ' + record.start_date.strftime(
                    "%Y-%m-%d %H:%M:%S") + ' To: ' + record.end_date.strftime("%Y-%m-%d %H:%M:%S")

    @api.multi
    def calculate_report_lines(self):
        for record in self:
            if record.report_categories:
                for report_category in record.report_categories:
                    for product in report_category.categories_report_products:
                        product.unlink()
                    report_category.unlink()

            pos_orders_ids = self.env['pos.order'].search(['&', ('date_order', '>=', record.start_date), (
                'date_order', '<=', record.end_date), ('company_id', '=', self.env.user.company_id.id)]).ids

            posCategories = record.pos_categories
            if not posCategories:
                posCategories = self.env['pos.category'].search([('id', '!=', 0)])
            total_qty = 0.0
            total_sales = 0.0
            pos_categories = []
            pos_category_qty = 0.0
            pos_category_sales = 0.0
            for posCategory in posCategories:
                pos_products = self.env['product.product'].search(
                    ['&', ('available_in_pos', '=', 1), ('company_id', '=', self.env.user.company_id.id),
                     ('pos_categ_id', '=', posCategory.id)])

                pos_category_products = []
                pos_category_products_total_qty = 0.0
                pos_category_products_total_sales = 0.0
                for pos_product in pos_products:
                    pos_category_products_qty = 0.0
                    pos_category_products_sales = 0.0
                    pos_order_lines = self.env['pos.order.line'].search([('product_id', '=', pos_product.id),
                                                                         ('order_id', 'in', pos_orders_ids)])
                    for pos_order_line in pos_order_lines:
                        pos_category_products_qty += pos_order_line.qty
                        pos_category_products_sales += pos_order_line.price_subtotal

                    if pos_category_products_qty > 0 and pos_category_products_sales > 0:
                        pos_category_products_total_qty += pos_category_products_qty
                        pos_category_products_total_sales += pos_category_products_sales
                        pos_category_qty += pos_category_products_qty
                        pos_category_sales += pos_category_products_sales
                        pos_category_products.append({
                            'name': pos_product.id,
                            'qty': pos_category_products_qty,
                            'sales': pos_category_products_sales,
                        })
                    for pos_category_product in pos_category_products:
                        pos_category_product['qty_per'] = (pos_category_product['qty'] / pos_category_products_total_qty) * 100
                        pos_category_product['sales_per'] = (pos_category_product['sales'] / pos_category_products_total_sales) * 100
                if pos_category_qty > 0 and pos_category_sales > 0:
                    total_qty += pos_category_qty
                    total_sales += pos_category_sales
                    pos_categories.append({
                        'name': posCategory.id,
                        'products': pos_products.ids,
                        'qty': pos_category_qty,
                        'sales': pos_category_sales,
                        'categories_report_products': pos_category_products
                    })
                    pos_category_qty = 0.0
                    pos_category_sales = 0.0
            if pos_categories:
                for pos_category in pos_categories:
                    pos_category['qty_per'] = (pos_category['qty'] / total_qty) * 100
                    pos_category['sales_per'] = (pos_category['sales'] / total_sales) * 100

                record.report_categories = pos_categories


class posCategoriesReportCategory(models.Model):
    _name = "pos.categories.r.category"
    _description = "POS Categories Orders Report Category"

    name = fields.Many2one(string=u'Category', comodel_name='pos.category', ondelete='set null')
    pos_products = fields.Many2many(string=u'POS Products', comodel_name='product.product',
                                    relateion='pos_categories_report_products_rel', column1='product_id',
                                    column2='category_id')
    qty = fields.Float(string=u'Quantity')
    qty_per = fields.Float(string=u'Qty%')
    sales = fields.Float(string=u'Net Sales')
    sales_per = fields.Float(string=u'Sales%')
    categories_report = fields.Many2one(string=u'Report', comodel_name='pos.categories.report', ondelete='set null')
    categories_report_products = fields.One2many(string=u'Products', comodel_name='pos.categories.r.product',
                                             inverse_name='categories_report_category')


class posCategoriesReportProduct(models.Model):
    _name = "pos.categories.r.product"
    _description = "pos Categories Orders Report Product"

    name = fields.Many2one('product.product', string=u'Product', ondelete='set null')
    qty = fields.Float(string=u'Quantity')
    qty_per = fields.Float(string=u'Qty%')
    sales = fields.Float(string=u'Net Sales')
    sales_per = fields.Float(string=u'Sales%')
    categories_report_category = fields.Many2one('pos.categories.r.category', string=u'Report Category',
                                             ondelete='set null')
