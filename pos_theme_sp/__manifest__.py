# -*- coding: utf-8 -*-

{
    'name': 'POS Theme',
    'sequence':1,
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'Spellbound Soft Solutions',
    'website': 'http://www.spellboundss.com',
    'summary': 'POS Theme',
    'description': """
        POS Theme With Attractive Look.
    """,
    'depends': ['point_of_sale','pos_restaurant'],
    'data': [
        'views/views.xml',
        'views/templates.xml'
    ],
    'license': 'OPL-1',
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'images': [
        'static/description/bannermain.jpg',
    ],
    'installable': True,
    'auto_install': False,
    'price': 20,
    'currency': 'EUR',
}
