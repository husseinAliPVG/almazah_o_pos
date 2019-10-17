# -*- coding: utf-8 -*-

from odoo import fields, models


class POSConfig(models.Model):
    _inherit = 'pos.config'

    enable_pos_chat = fields.Boolean(string="Enable POS Chat")
