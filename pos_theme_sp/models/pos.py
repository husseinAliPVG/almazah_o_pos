# -*- coding: utf-8 -*-

from odoo import fields, models,tools,api


class pos_config(models.Model):
    _inherit = 'pos.config' 

    allow_pos_theme = fields.Boolean("Set Theme")
    theme_type = fields.Selection([('1', 'Azure Theme'),('2','Royal Blue Theme'),('3','Pigeon Theme')])



