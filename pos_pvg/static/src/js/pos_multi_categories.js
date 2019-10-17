odoo.define('pos_pvg.pos_multi_categories', function (require) {
    "use strict";

    var db = require('point_of_sale.DB');
    var models = require('point_of_sale.models');

    db.include({
        add_products: function (products) {
            this._super.apply(this, arguments);
            var product;
            var stored_categories = this.product_by_category_id;
            for (var i = 0, len = products.length; i < len; i++) {
                product = products[i];
                var search_string = this._product_search_string(product);
                var category_ids = products[i].pos_categ_ids;
                if (category_ids.length == 0) { category_ids = [this.root_category_id]; }
                for (var n = 0; n < category_ids.length; n++) {
                    var category_id = category_ids[n];
                    if (!stored_categories[category_id]) {
                        stored_categories[category_id] = [product.id];
                    } else {
                        stored_categories[category_id].push(product.id);
                    }
                    if (this.category_search_string[category_id] === undefined) {
                        this.category_search_string[category_id] = '';
                    }
                    this.category_search_string[category_id] += search_string;

                    var ancestors = this.get_category_ancestors_ids(category_id) || [];

                    for (var j = 0, jlen = ancestors.length; j < jlen; j++) {
                        var ancestor = ancestors[j];
                        if (!stored_categories[ancestor]) {
                            stored_categories[ancestor] = [];
                        }
                        stored_categories[ancestor].push(product.id);

                        if (this.category_search_string[ancestor] === undefined) {
                            this.category_search_string[ancestor] = '';
                        }
                        this.category_search_string[ancestor] += search_string;
                    }
                }

            }
        }
    });


    var _super_posmodel = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        initialize: function (session, attributes) {
            var product_model = _.find(this.models, function (model) { return model.model === 'product.product'; });
            product_model.fields.push('pos_categ_ids');
            return _super_posmodel.initialize.call(this, session, attributes);
        },
    });

})