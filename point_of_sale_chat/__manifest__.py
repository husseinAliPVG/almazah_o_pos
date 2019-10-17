# -*- coding: utf-8 -*-

{
    "name": "POS Chat",
    "summary": "Chat With POS.",
    "description": """
        This module will manage live chat option in POS.
    """,
    "version": "12.0.1.0.0",
    "category": "POS",
    "author": "Dickson Chibuzor",
    "website": "",

    "depends": [
        "web",
        "point_of_sale",
        "mail",
    ],
    'data': [
        'views/pos_config.xml',
        'views/template.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],

}
