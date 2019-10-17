# -*- coding: utf-8 -*-


{
    'name': 'pvg_purchase',
    'version': '1.0',
    'category': 'Purchase',
    'sequence': 6,
    'summary': 'Extensions for the Purchase',
    'description': "",
    'depends': ['purchase', 'stock'],
    'website': '',
    'data': [
        'security/ir.model.access.csv',
        'views/accruals_view.xml',
        'report/accruals_report.xml',
        'views/deliveries_view.xml',
        'report/deliveries_report.xml',
        'views/price_changes_view.xml',
        'report/price_changes_report.xml',
        'views/pv_price_history_view.xml',
        'report/pv_price_history_report.xml',
        'views/pp_price_history_view.xml',
        'report/pp_price_history_report.xml',
        'views/order_line.xml',
        'menu/menu.xml'
    ],
    'qweb': [

    ],
    'installable': True,
    'auto_install': False,
}
