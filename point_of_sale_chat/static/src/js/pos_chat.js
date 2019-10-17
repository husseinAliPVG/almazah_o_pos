odoo.define('point_of_sale_chat.chrome', function (require) {
"use strict";
    // 1.first import the right imports to implement.
    // 2. copy the way the systray menu works and implement here .
    // 3. design the MessageWidget on the top of the chat. MAJOR WORK HEREE!!!
    // 4. create the events for when there is a click of those buttons.
    // 5. insert the gui in the chrome and create an event to execute the gui.
    var chrome = require('point_of_sale.chrome');
    var core = require('web.core');
    // var MailManager = require('mail.Manager');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var gui = require('point_of_sale.gui');
    var config = require('web.config');
    var QWeb = core.qweb;
    var _t = core._t;

// register the service for sending of mails
require('mail.Manager.Notification');
require('mail.Manager.Window');
require('mail.Manager.DocumentThread');

// core.serviceRegistry.add('mail_service', MailManager);


    var MessageWidget = PosBaseWidget.extend({
        template:'POSMessageWidget',
        events: {
            "click .o_mail_preview": "_on_click_message_item",
            "click .pos-new_message": "_on_click_new_message",
            "click .pos-live-chat-filter": "_on_click_filter",
        },
        renderElement: function(){
            var self = this;
            return this._super();
        },
        show: function(options){
            options = options || {};
            var self = this;
            this._super(options);
            this.list    = options.list  || [];
            this._$filterButtons = this.$(".pos-live-chat-filter")
            this._$previews = this.$('.o_mail_systray_dropdown_items');
            this.renderElement();
        },
        _on_click_new_message: function () {
            this.gui.close_popup();
            this.call('mail_service', 'openBlankThreadWindow');
        },

        _on_click_filter: function (ev) {
            ev.stopPropagation();
            this._$filterButtons.removeClass('pos-live-chat-selected');
            var $target = $(ev.currentTarget);
            $target.addClass('pos-live-chat-selected');
            this._filter = $target.data('filter');
            this._update_channels_preview();
        },

        _update_channels_preview: function () {
           var self = this;
           this._$previews.html(QWeb.render('Spinner'));
           this._getPreviews().then(self._renderPreviews.bind(self));
            },

        _getPreviews: function () {
                return this.call('mail_service', 'getSystrayPreviews', this._filter);
        },

        _renderPreviews: function (channels_preview) {
            this.close();
            this.gui.show_popup('message',{list:channels_preview});
        },
        close: function(){
            if (this.$el) {
                this.$el.addClass('oe_hidden');
            }
        },
        _on_click_message_item: function(ev){
           var $target = $(ev.currentTarget);
            var previewID = $target.data('preview-id');

            if (previewID === 'mail_failure') {
                this._clickMailFailurePreview($target);
            } else if (previewID === 'mailbox_inbox') {
                // inbox preview for non-document thread,
                // e.g. needaction message of channel
                var documentID = $target.data('document-id');
                var documentModel = $target.data('document-model');
                if (!documentModel) {
                    this._openDiscuss('mailbox_inbox');
                } else {
                    this._openDocument(documentModel, documentID);
                }
            } else {
                // preview of thread
                this.call('mail_service', 'openThread', previewID);
            }
            this.close();
        },
    });
    gui.define_popup({name:'message', widget: MessageWidget});
    
    chrome.Chrome.include({
        events: {
            "click .pos-message": "on_click_pos_message",
        },
        build_widgets: function(){
            var self = this;
            this._super();

            if(self.pos.config.enable_pos_chat){
                $('div.pos_chat').show();
            }else{
                $('div.pos_chat').hide();
            }

        },
        on_click_pos_message: function () {
            var self = this;
            if (this.gui.current_popup) {
                this.gui.close_popup();
            }
            else{
                 this._updatePreviews();
            }
        },
        renderElement: function(){
//              DO SOME WORK HERE
            this._$filterButtons = this.$('.o_filter_button');
            this._$previews = this.$('.o_mail_systray_dropdown_items');
            this.filter = false;
            this._updateCounter();
            var mailBus = this.call('mail_service', 'getMailBus');
            mailBus.on('update_needaction', this, this._updateCounter);
            mailBus.on('new_channel', this, this._updateCounter);
            mailBus.on('update_thread_unread_counter', this, this._updateCounter);
            return this._super();
        },
        _updateCounter: function () {
            /* DO SOME WORK HERE */
            var counter = this._computeCounter();
            this.$('.o_notification_counter').text(counter);
            this.$el.toggleClass('o_no_notification', !counter);
            if (this._isShown()) {
                this._updatePreviews();
            }
        },

        _computeCounter: function () {
            var channels = this.call('mail_service', 'getChannels');
            var channelUnreadCounters = _.map(channels, function (channel) {
                return channel.getUnreadCounter();
            });
            var unreadChannelCounter = _.reduce(channelUnreadCounters, function (acc, c) {
                return c > 0 ? acc + 1 : acc;
            }, 0);
            var inbox =  this.call('mail_service', 'getMailbox', 'inbox')
            var inboxCounter = 0;
            if (inbox !== undefined){
                inboxCounter = inbox.getMailboxCounter();
            }
            var mailFailureCounter = this.call('mail_service', 'getMailFailures').length;

            return  unreadChannelCounter + inboxCounter+ mailFailureCounter;
        },

        _getPreviews: function () {
            return this.call('mail_service', 'getSystrayPreviews', this._filter);
        },

        _renderPreviews: function (previews) {
            this.gui.show_popup('message',{list:previews});
        },

         _updatePreviews: function () {
            // Display spinner while waiting for conversations preview
            this._$previews.html(QWeb.render('Spinner'));
            this._getPreviews()
                .then(this._renderPreviews.bind(this));
        },

        close: function(){
            if (this.$el) {
                this.$el.addClass('oe_hidden');
            }
        },
        _isShown: function () {
        return this.$el.hasClass('show');
    },
    });
});
