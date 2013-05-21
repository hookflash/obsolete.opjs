define(['text!templates/chat-layout.html', 'text!templates/chat-message-line.html',
    'backbone', '_', 'modules/user-view', 'layoutmanager'],
    function(chatLayout, chatMessageLine, Backbone, _, user) {
        'use strict';

        var ChatWindow = Backbone.Layout.extend({
            className: 'conversation-chat-window',
            template: _.template(chatLayout),
            events: {
//        'click .option-call': 'call',
                'click .option-video-call': 'videoCall',
                'click .send': 'send'
            },
            call: function() {
                this.trigger('send-connect-request', this.model, false);
            },
            videoCall: function() {
                this.trigger('send-connect-request', user.getModel().get('uid'), this.model, true);
            },
            afterRender: function(){
                var self = this;

                this.model.on('change', function(){
                    self.getMessage();
                });

                this.model.on('close', function(){
                    self.close();
                });

                this.getMessage();

                this.$el.find('textarea[name="chat-text"]').bind('keyup', function(e){
                    if(e.keyCode === 13 && !e.shiftKey){
                        e.preventDefault();
                        self.send();
                    }
                });
            },
            send: function(){
                var msg = this.$el.find('textarea[name="chat-text"]').val();
                if(!msg) return;

                var message = {
                    time: new Date().getTime(),
                    message: msg
                };

                this.trigger('chat-message', user.getModel().get('uid'), this.model, message);

                this.renderMessage(message);
            },
            hide: function(isVideo){
                this.$el.hide();
            },
            show: function(){
                this.$el.show();
                this.getMessage();
            },
            serialize: function() {
                return this.model.toJSON();
            },
            getMessage: function(){
                if(this.model.get('isNewMessage') && this.$el.is(':visible')){
                    var messages = this.model.get('newMessages');
                    if(messages && messages.length){
                        while(messages.length){
                            this.renderMessage(messages[0]);
                            messages.shift();
                        }
                    }
                    this.model.set('isNewMessage', false);
                }
            },
            renderMessage: function(message){
                var mounces = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                var d = new Date(message.time);

                message.time = [d.getDate(), mounces[d.getMonth()], (d.getHours() + ":" + d.getMinutes())].join(" ");

                if(!message.username){
                    message.username = user.getModel().get('fn');
                    message.isOwn = true;
                } else {
                    message.isOwn = false;
                }

                message.message = message.message.replace(/\n/gm, '<br>');

                this.$el.find('.conversation-chat-dialog').append(_.template(chatMessageLine, message));

                this.$el.find('.conversation-chat-dialog')[0].scrollTop = this.$el.find('.conversation-chat-dialog').get(0).scrollHeight;
                this.$el.find('textarea[name="chat-text"]').val("")

            },
            close: function(){
                this.remove();
            }
        });

        return ChatWindow;
    });
