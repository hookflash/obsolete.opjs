define(['rolodex/q'], function(Q) {

    function Transport(options) {
        this.api = options.api || {};
        this.pending = {};
        this.listeners = {};
        this.mesanger = options.mesanger;
        this.open();
    }

    Transport.prototype.on = function (name, handler) {
        var list = this.listeners[name];
        if (list) {
            list.push(handler);
        }
        else {
            this.listeners[name] = [handler];
        }
        return this;
    };

    Transport.prototype.off = function (name, handler) {
        var list = this.listeners[name];
        if (list) {
            list.splice(list.indexOf(handler), 1);
            if (!list.length) {
                delete this.listeners[name];
            }
        }
        return this;
    };

    Transport.prototype.emit = function (name, data) {
        var list = this.listeners[name];
        if (!list) {
            if (name === 'error') {
                throw data;
            }
            return this;
        }

        list.forEach(function (handler) {
            handler(data);
        });
        return this;
    };

    Transport.prototype.open = function () {
        var transport = this;

        this.mesanger.on("contact.message", function(to, from, message) {

            if(!message.type || message.type !== 'call') return;

            if(message.blob.session.type === 'offer')
                transport.api.invite(message);
            else if(message.blob.session.type === 'answer')
                transport.emit('getReply', message);
            else if(message.blob.session.type === 'reject')
                transport.emit('rejected', message);
            else if(message.blob.session.type === 'candidate')
                transport.api.update(message);
            else if(message.blob.session.type === 'callend')
                transport.api.bye(message);
        });
    };

    Transport.prototype.fail = function (request, reason) {
        if (reason instanceof Error) {
            reason = reason.stack;
        }
    };

    Transport.prototype.request = function (method, request) {
        var id;
        do { id = (Math.random() * 0x100000000).toString(32); } while (id in this.pending);

        var deferred = Q.defer();
        request.type = 'call';
        request.$id = id;
        this.mesanger.sendMessage(request.to, request.from, request);

        this.pending[id] = deferred;
        return deferred.promise;
    };

    Transport.prototype.onFail = function (fail) {
        var deferred = this.pending[fail.$id];
        if (!deferred) {
            throw new Error('Received failure with invalid $id: ' + fail.$id);
        }
        delete this.pending[fail.$id];
        deferred.reject(fail.$reason);
    };

    var requestHandlers = function (to, from, blob) {
        return this.request('reject', {
            from: from,
            to: to,
            blob: blob
        });
    };

    ['peerLocationFind', 'doAnswer', 'doReject'].forEach(function(method){
        Transport.prototype[method] = requestHandlers;
    });

    return Transport;
});
