angular.module('nexcuse.services', [])
    .service('config', function($window) {
        this.is_localhost = true;
        this.is_device = false;
        this.nex_server_ip = (this.is_localhost == false) ? 'http://172.28.7.50:3000/' : 'http://127.0.0.1:3000/';

        this.indexedDB = {}
        this.indexedDB.name = 'NEXCUSE.ME';
        this.indexedDB.objectStore = {};
        this.indexedDB.index = {};

        this.is_debug = {

        }
    })
	
    .service('localDB', function($q, $window, $http) {
        var self = this;
        self.localDB;

        self.ready = function() {
            var deferred = $q.defer();

            if (self.localDB) {
                deferred.resolve(self.localDB);
            } else {
                var request = indexedDB.open("nexcuse");
                var flag_onupgradeneeded = false;
                request.onupgradeneeded = function() {
                    /* ================================================================
                    The database did not previously exist, so create object stores and indexes.
                    1. create database: THREADS & MESSAGES & MYREQUEST, 
                    2. create Index for THREADS[request_id | last_msg_time]& MESSAGES [tx_id] & MYREQUEST, 
                    ===================================================================*/
                    flag_onupgradeneeded = true;

                    localDB = request.result;

                    var threadsStore = localDB.createObjectStore("THREADS", {
                        autoIncrement: true
                    });
                    var transactionStore = localDB.createObjectStore("TRANSACTIONS", {
                        keyPath: "_id"
                    });
                    var msgStore = localDB.createObjectStore("MESSAGES", {
                        keyPath: "_id"
                    });
                    var myrequestStore = localDB.createObjectStore("MYREQUESTS", {
                        keyPath: "_id"
                    });

                    // index for THREADS
                    threadsStore.createIndex("request_id", "request_id", {
                        unique: false
                    });
                    threadsStore.createIndex("last_msg_time", "last_msg.time", {
                        unique: false
                    });
                    threadsStore.createIndex("group_thread_id", "group_thread_id", {
                        unique: false
                    }); // using request_id for groupThread
                    threadsStore.createIndex("tx_id", "tx_id", {
                        unique: true
                    });

                    // index for MESSAGES
                    msgStore.createIndex("tx_id", "tx_id", {
                        unique: false
                    });

                };

                request.onsuccess = function() {
                    self.localDB = request.result;
                    deferred.resolve(flag_onupgradeneeded);
                };
            }
			
            return deferred.promise;
        }
    })
	
	/*****************************************************************************
    ///////////////////////////////// "settings" /////////////////////////////////
    *****************************************************************************/
	
    .service('settings', function($q, $window, $http, config) {
        var self = this;
    })

    /*****************************************************************************
    ///////////////////////////////// "me" ///////////////////////////////////////
    *****************************************************************************/
    .service('me', function($rootScope, $injector, $http, $window, $interval, $cordovaFileTransfer, $q, config) {
        var self = this;
        var key = 'access_token',
            key_name = 'name',
            key_id = '_id',
            key_avatar = 'avatar';
        self.access_token;
        self._id;
        self.name;
        self.avatar;

        self.is_init = false;
        $rootScope.oauth = {};
        /***  private functions ***/
        function _serialize(obj) {
            var str = [];
            for (var p in obj) {
                if (Array.isArray(obj[p])) {
                    for (var i in obj[p])
                        str.push(encodeURIComponent(p) + '[]=' + encodeURIComponent(obj[p][i]));
                } else {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
            }
            return str.join('&');
        }

        function _update_post_header_bearer(access_token) {
            $http.defaults.headers.post.Authorization = "Bearer " + access_token;
        }
        /////////////////////////////////////////

        this.ready = function() {
            var deferred = $q.defer();
            
			if (self.access_token) {
                deferred.resolve();
            } else {
                var _token = $window.localStorage[key];
                if (typeof _token != 'undefined' && _token != null) {
                    self.access_token = _token;
                    _update_post_header_bearer(self.access_token);
                    self._id = $window.localStorage[key_id];
                    self.name = $window.localStorage[key_name];
                    self.avatar = $window.localStorage[key_avatar];

                    deferred.resolve();
                } else {
                    deferred.reject();
                }
            }
            return deferred.promise;
        }

        this.checklogin = function() {
            var _token = $window.localStorage[key];
            if (typeof _token != 'undefined' && _token != null) {
                self.token = _token;
                _update_post_header_bearer(self.token);
                self.my_id = $window.localStorage[key_id];
                return true;
            } else {
                return false;
            }
        }

        this.signinup = function(username, password, callback) {
            var url = config.nex_server_ip + 'signinup?callback=JSON_CALLBACK&email=' + username + '&password=' + password;
            var request = $http.jsonp(url);
            request.success(function(data) {
                if (data.ret === 0) {
                    $window.localStorage[key] = data.access_token;
                    $window.localStorage[key_id] = data._id;
                    $window.localStorage[key_name] = data.name;
                    $window.localStorage[key_avatar] = data.avatar;

                    self.access_token = data.access_token;
                    _update_post_header_bearer(self.access_token);
                    self.my_id = data._id;
                    callback(data);
                } else {
                    callback(data);
                }
            });
        }

        this.change_my_password = function(access_token, old_password, new_password, callback) {
            var url = (!config.is_device) ? '/change_my_password' : config.nex_server_ip + 'change_my_password';
            $http({
                method: 'POST',
                url: url,
                data: _serialize({
                    fullname: name,
                    old_password: old_password,
                    new_password: new_password
                }), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(data) {
                if (data.ret === 0) {
                    $window.localStorage[key] = data.access_token;
                    self.access_token = data.access_token;
                    _update_post_header_bearer(self.access_token);
                    self.my_id = data._id;
                }
                callback(data);
            });
        }

        this.register_basic_name = function(_id, name, callback) {
            var url = (!config.is_device) ? '/signup_basic_name' : config.nex_server_ip + 'signup_basic_name';
            $http({
                method: 'POST',
                url: url,
                data: _serialize({
                    _id: _id,
                    name: name
                }), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(data) {
                if (data.ret === 0) {
                    $window.localStorage[key] = data.access_token;
                    $window.localStorage[key_id] = data._id;
                    $window.localStorage[key_name] = data.name;

                    self.access_token = data.access_token;
                    _update_post_header_bearer(self.access_token);
                    self.my_id = data._id;
                    callback(data);
                }
            });
        }

        this.register_basic_avatar = function(avatarURI, callback) {
            if (!config.is_device) return; // this feature only in device.

            var url_avatar = config.nex_server_ip + 'signup_basic_avatar';

            document.addEventListener('deviceready', function() {
                $cordovaFileTransfer.upload(url_avatar, avatarURI, options)
                    .then(function(results) {
                        var data = JSON.parse(results.response);
                        vlog.log('Success transfer file ' + JSON.stringify(data));
                        if (data.ret === 0) {
                            $window.localStorage[key] = data.access_token;
                            $window.localStorage[key_id] = data._id;
                            $window.localStorage[key_name] = data.name;
                            $window.localStorage[key_avatar] = data.avatar;

                            self.access_token = data.access_token;
                            _update_post_header_bearer(self.access_token);
                            callback(data);
                        }
                    }, function(err) {
                        vlog.log('Error transfer file ' + JSON.stringify(err));
                    }, function(progress) {
                        vlog.log('Progress transfer file ' + JSON.stringify(progress));
                    });
            }, false);
        }

        this.change_my_basic_nickname = function(access_token, name, callback) {
            var url = (!config.is_device) ? '/change_my_basic_nickname' : config.nex_server_ip + 'change_my_basic_nickname';
            $http({
                method: 'POST',
                url: url,
                data: _serialize({
                    nickname: name
                }), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(data) {
                $window.localStorage[key] = data.access_token;
                self.access_token = data.access_token;
                _update_post_header_bearer(self.access_token);
                callback(data);
            });
        }

        this.change_my_basic_fullname = function(access_token, name, callback) {
            var url = (!config.is_device) ? '/change_my_basic_fullname' : config.nex_server_ip + 'change_my_basic_fullname';
            $http({
                method: 'POST',
                url: url,
                data: _serialize({
                    fullname: name
                }), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(data) {
                callback(data);
            });
        }

        function onPause() {
            // Handle the pause event
            _stop_watchPosition();
        }

        function onResume() {
            setTimeout(function() {
                // Handle the resume event
                main.update_new_location(function() {
                    $rootScope.$broadcast('appresume');
                });
                _start_watchPosition();
            }, 0);
        }

        var watchPosition;

        function _stop_watchPosition() {
            if (angular.isDefined(watchPosition)) {
                $interval.cancel(watchPosition);
                watchPosition = undefined;
            }
        }

        function _start_watchPosition() {
            if (!angular.isDefined(watchPosition)) {
                watchPosition = $interval(function() {
                    main.update_new_location(function() {
                        main.check_change_location(function(ret) {
                            if (ret) {
                                main.is_noticed_change_location = true;
                                $rootScope.$apply();
                            }
                        });
                    });
                }, 5 * 60 * 1000);
            }
        }

        this.init = function(callback) {
            var url = config.nex_server_ip + 'init?callback=JSON_CALLBACK&access_token=' + self.access_token;
            var request = $http.jsonp(url);
            request.success(function(data) {
                if (data.ret === 0) {
                    self.is_init = true;

                    // init main module
                    main.update_fav_list(data.fav_list);

                    // --> radar - default is radar_here
                    //main.init_radar_here(self.access_token);
                    if (config.is_device) {
                        document.addEventListener("pause", onPause, false);
                        document.addEventListener("resume", onResume, false);
                    }

                    // init notification module
                    notification.init(self.access_token);

                    _start_watchPosition();
                    callback();
                }
            });
        }

        this.logout = function() {
            $window.localStorage.removeItem(key);
            $window.localStorage.removeItem(key_my_id);
            main.clear_radar();
            main.clear();
            notification.stop();
            notification.clear();
            self.is_init = false;
        }

    })

    /*****************************************************************************
    ///////////////////////////////// "Notification" /////////////////////////////
    *****************************************************************************/

    .service('Notification', function($window, $http, $q, config, me) {
        var self = this;

        self.NOTIFICATIONS = [];
        var flagStarted = false,
            flagActive = false;
        var last_notification_id = null;

        /***  private functions ***/
        function _serialize(obj) {
            var str = [];
            for (var p in obj) {
                if (Array.isArray(obj[p])) {
                    for (var i in obj[p])
                        str.push(encodeURIComponent(p) + '[]=' + encodeURIComponent(obj[p][i]));
                } else {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
            }
            return str.join('&');
        }
		
		////////////////////////////
        this.ready = function() {
            var deferred = $q.defer();
            if (flagStarted && flagActive) {
                deferred.resolve();
            } else {
                return __init();
            }

            return deferred.promise;
        }

        function __init() {
            // getNotifications --> buildNotifications
            var deferred = $q.defer();
            getNotifications(null, null, null).then(function(data) {
                if (data.data.length > 0) {
                    buildNotifications(data.data).then(function() {
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
            });

            return deferred.promise;
        }

        function buildNotifications(data) {
            var deferred = $q.defer();
            var count = 0;
            if (data.length > 0) {
                last_notification_id = data[0]._id;
            }

            data.forEach(function(notification, i) {
                self.NOTIFICATIONS.push(notification);
                count++;
                if (count == data.length) { // finish process data
                    deferred.resolve();
                }
            });

            return deferred.promise;
        }

        function getNotifications(filter, loc) {
            var url = config.nex_server_ip + 'getNotification?callback=JSON_CALLBACK&access_token=' + me.access_token + "&from_id=" + last_notification_id;
            return $http.jsonp(url);
        }

		///////////////////////////
        this.refresh = function() {
            var deferred = $q.defer();
            getNotifications(null, null, last_notification_id).then(function(data) {
                if (data.data.length > 0) {
                    buildNotifications(data.data).then(function() {
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }

    })

    /*****************************************************************************
    ///////////////////////////////// "My Request" /////////////////////////////
    *****************************************************************************/

    .service('MyRequest', function($window, $http, $q) { // For managing the Transaction. 


    })

    /*****************************************************************************
    ///////////////////////////////// "Message" /////////////////////////////
    *****************************************************************************/

    .service('Message', function($window, $http, $q, localDB) {
        var self = this;
        self.current_tx_id = null;
        self.MESSAGES = [];

        this.loadThreadAllMsg = function(tx_id) {
            var deferred = $q.defer();
            if (self.current_tx_id == tx_id) {
                deferred.resolve(self.MESSAGES);
            } else {
                self.current_tx_id = tx_id
                localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                    var tx = localDB.transaction(["MESSAGES"], "readonly");
                    var messagesStore = tx.objectStore("MESSAGES");
                    var messagesIndex = messagesStore.index("tx_id");

                    self.MESSAGES = [];

                    var messagesCursor = messagesIndex.openCursor(IDBKeyRange.only(tx_id), 'prev');
                    messagesCursor.onsuccess = function() {
                        var cursor = messagesCursor.result;

                        if (cursor) {
                            self.MESSAGES.push(cursor.value);
                            cursor.continue();
                        } else {
                            // No more matching records.
                            deferred.resolve(self.MESSAGES);
                        }
                    };
                });
            }

            return deferred.promise;
        }
    })

    /*****************************************************************************
    ///////////////////////////////// "NEXMAIN" /////////////////////////////
    *****************************************************************************/

    .service('NEXMAIN', function($window, $http, $q, localDB, config, me, Message) {
        var self = this;
        self.THREADS = null; // include THREADS[].MSG[]

        var flagStarted = false,
            flagActive = false;

        /////// Private functions /////////
        function _serialize(obj) {
            var str = [];
            for (var p in obj) {
                if (Array.isArray(obj[p])) {
                    for (var i in obj[p])
                        str.push(encodeURIComponent(p) + '[]=' + encodeURIComponent(obj[p][i]));
                } else {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
            }
            return str.join('&');
        }

        /******** ready & init flow ************/		
        this.ready = function() { // using Promise to make sure everything done before release for the App. 
            var deferred = $q.defer();
            if (flagStarted && flagActive) {
                deferred.resolve();
            } else if (flagStarted && !flagActive) { // activate
                flagActive = true;
                return getLastMessageId().then(function(last_msg_id) {
                    return getStart();
                }).then(function(data) {
                    return buildNewData(data);
                });
            } else {
                return __init();
            }

            return deferred.promise;
        }
		
        function __init() {
            var deferred = $q.defer();

            /*=====================================================
            0. getStartFromBackup --> buildNewTreadsFromBackup --> getStart --> buildNewData --> updateThreadsLastMessage --> loadThreads
            1. getLastMessageId --> getStart --> buildNewData --> updateThreadsLastMessage --> loadThreads
            ======================================================*/
            localDB.ready().then(function(flag_onupgradeneeded) {
                if (flag_onupgradeneeded) { // get from BACKUP and rebuild local indexedDB. 
                    getStartFromBackup().then(function(data) {
                        if (data.ret == 0) {
                            buildNewThreadsFromBackup(data.threads).then(function(last_msg_id) {
                                return getStart(last_msg_id)
                            }).then(function(data) {
                                return buildNewData(data);
                            }).then(function() {
                                return loadThreads();
                            }).then(function() {
                                deferred.resolve();
                            });
                        } else if (data.ret == 1) { // data.data.ret == 1 - return last_msg or null_msg
                            buildNewData(data.last_msg).then(function() {
                                return loadThreads();
                            }).then(function() {
                                deferred.resolve();
                            });
                        }
                    })
                } else { // normal init
                    getLastMessageId().then(function(last_msg_id) {
                        getStart(last_msg_id).then(function(data) {
                            return buildNewData(data);
                        }).then(function() {
                            return loadThreads();
                        }).then(function() {
                            deferred.resolve();
                        });
                    });
                }

            });

            return deferred.promise;
        }

        function getLastMessageId() {
            var deferred = $q.defer();
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["MESSAGES"], "readonly");
                var messageStore = transaction.objectStore("MESSAGES");

                var last_message_id = null;
                var messageCursor = messageStore.openCursor(null, 'prev');
                messageCursor.onsuccess = function() {
                    var cursor = messageCursor.result;

                    if (cursor) {
                        last_message_id = cursor.value._id;
                    }
                    deferred.resolve(last_message_id);
                };
            });

            return deferred.promise;
        }


        function getStart(last_msg_id) {
            var defer = $q.defer();

            if (last_msg_id != null) {
                var url = config.nex_server_ip + 'getStart?from_id=' + last_msg_id + '&callback=JSON_CALLBACK&access_token=' + me.access_token;
                $http.jsonp(url).success(function(data) {
                    defer.resolve(data);
                });
            } else {
                var url = config.nex_server_ip + 'getStart?callback=JSON_CALLBACK&access_token=' + me.access_token;
                $http.jsonp(url).success(function(data) {
                    defer.resolve(data);
                });
            }

            return defer.promise;
        }

        function getStartFromBackup() {
            var defer = $q.defer();
            var url = config.nex_server_ip + 'getStartFromBackup?callback=JSON_CALLBACK&access_token=' + me.access_token;
            $http.jsonp(url).success(function(data) {
                defer.resolve(data);
            });

            return defer.promise;
        }

        function buildNewThreadsFromBackup(threads) { // insert to indexedDB.THREADS.
            var deferred = $q.defer();
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["THREADS"], "readwrite");
                var objectStore = transaction.objectStore("THREADS");

                var last_msg_id;
                for (var i = 0; i < threads.length; i++) {
                    var objectStoreRequest = objectStore.add(threads[i]);
                }

                transaction.oncomplete = function(event) {
                    if (threads && threads.length > 0) {
                        deferred.resolve(threads[0].last_msg._id);
                    } else {
                        deferred.resolve(null);
                    }

                };
            });
            return deferred.promise;
        }

        function buildNewData(data) {
            var deferred = $q.defer();
            if (!Array.isArray(data)) {
                data = [data];
            }
            if (data && data.length > 0) {
                localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                    var transaction = localDB.transaction(["MESSAGES", "THREADS"], "readwrite");
                    var messageStore = transaction.objectStore("MESSAGES");
                    var threadsStore = transaction.objectStore("THREADS");

                    var temp_thread_delta = {
                        threads: [],
                        group_threads: []
                    };
					
                    var count = 0;
                    data.forEach(function(msg, i) {
                        //// insert new msg to @localDB.MESSAGES and push to self.MESSAGES[] (* if applicable)
                        var messageStoreRequest = messageStore.add(msg);
                        if (Message.current_tx_id == msg.tx_id) {
                            Message.MESSAGES.push(msg);
                        }

                        ////// process for transaction. 
                        if (msg.tx0 && msg.tx0.start) { // start a transaction
                            // create new thread = insert new Thread to @localDB & self.THREADS[]
                            var new_tmp_thread = {
                                tx_id: msg.tx_id,
                                responder: msg.tx0.start.responder,
                                quote_msg_id: msg._id,
                                request_id: msg.tx0.start.request_id,
                                last_msg: {
                                    _id: msg._id,
                                    msg: msg.msg,
                                    time: msg.time
                                },
                                tmp: true
                            };
                            var threadsStoreRequest = threadsStore.add(new_tmp_thread);

                            if (self.THREADS)
                                self.THREADS.push(new_tmp_thread);
                        }


                        ////  consolidate all the message base on 2 thread type (thread & group_thread) to temp_thread_delta
                        if (msg.tx0 && msg.tx0.start) { // group_thread
                            var index = -1;
                            for (var i = 0; i < temp_thread_delta.group_threads.length; i++) {
                                if (msg.tx0.start.request_id == temp_thread_delta.group_threads[i].request_id) {
                                    index = i;
                                    break;
                                }
                            }

                            if (index == -1) { // this is first
                                var temp_group_thread = {
                                    request_id: msg.tx0.start.request_id,
                                    responders: [msg.tx0.start.responder],
                                    last_msg: {
                                        msg: msg.msg,
                                        time: msg.time
                                    }
                                }
                                temp_thread_delta.group_threads.push(temp_group_thread);
                            } else {
                                temp_thread_delta.group_threads[index].responders.push(msg.tx0.start.responder);
                                temp_thread_delta.group_threads[index].last_msg = {
                                    msg: msg.msg,
                                    time: msg.time
                                };
                            }
                        } else { // normal thread
                            var index = -1;
                            for (var i = 0; i < temp_thread_delta.threads.length; i++) {
                                if (msg.tx_id == temp_thread_delta.threads[i].tx_id) {
                                    index = i;
                                    break;
                                }
                            }

                            if (index == -1) { // this is first
                                var temp_thread = {
                                    tx_id: msg.tx_id,
                                    last_msg: {
                                        msg: msg.msg,
                                        time: msg.time
                                    }
                                }
                                temp_thread_delta.threads.push(temp_thread);
                            } else {
                                temp_thread_delta.threads[index].last_msg = {
                                    msg: msg.msg,
                                    time: msg.time
                                };
                            }
                        }

                        count++;
                        if (count == data.length) { // finish process data
                            __process_threads_delta(temp_thread_delta).then(function() {
                                deferred.resolve();
                            });
                        }
                    });
                });
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        }

        function __process_threads_delta(thread_delta) {
            var deferred = $q.defer();
            var no_all_threads = thread_delta.threads.length + thread_delta.group_threads.length;
            var count = 0;

            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["THREADS"], "readwrite");
                var threadsStore = transaction.objectStore("THREADS");
				
				///////// group_thread delta //////////
                for (var k = 0; k < thread_delta.group_threads.length; k++) { // group_threads
                    var thread = thread_delta.group_threads[k];
                    //////// update last_msg for group_thread @localDB.THREADS & self.THREADS[]
                    var threadStoreIndex = threadsStore.index("group_thread_id");
                    var objectStoreRequest = threadStoreIndex.openCursor(IDBKeyRange.only(thread.request_id));

                    objectStoreRequest.onsuccess = function(event) {
                        if (event.target.result) {
                            var data = event.target.result.value;
                            data.responders = data.responders.concat(thread.responders);
                            data.last_msg = thread.last_msg;
                            data.is_view = false;

                            var requestUpdate = threadsStore.put(data, event.target.result.primaryKey);
                        }

                        ////////////////////////////
                        count++;
                        if (count == no_all_threads) {
                            deferred.resolve();
                        }
                    };

                    for (var i = 0; self.THREADS && i < self.THREADS.length; i++) {
                        if (self.THREADS[i].group_thread_id == thread.request_id) {
                            self.THREADS[i].responders = self.THREADS[i].responders.concat(thread.responders);
                            self.THREADS[i].last_msg = thread.last_msg;
                            self.THREADS[i].is_view = false;
                            break;
                        }
                    }
                }

				///////// thread delta //////////
                for (var j = 0; j < thread_delta.threads.length; j++) { // normal threads
                    var thread = thread_delta.threads[j];

                    //////// update last_msg for thread @localDB.THREADS & self.THREADS[]				
                    var threadStoreIndex = threadsStore.index("tx_id");

                    var objectStoreRequest = threadStoreIndex.openCursor(IDBKeyRange.only(thread.tx_id));
                    objectStoreRequest.onsuccess = function(event) {
                        if (event.target.result) {
                            var data = event.target.result.value;
                            data.last_msg = thread.last_msg;
                            data.is_view = false;

                            var requestUpdate = threadsStore.put(data, event.target.result.primaryKey);
                        }
                        ////////////////////////////////////
                        count++;
                        if (count == no_all_threads) { // finish process for all @localDB.THREADS, resolve.
                            deferred.resolve();
                        }
                    };

                    for (var i = 0; self.THREADS && i < self.THREADS.length; i++) {
                        if (self.THREADS[i].tx_id == thread.tx_id) {
                            self.THREADS[i].last_msg = thread.last_msg;
                            self.THREADS[i].is_view = false;
                            break;
                        }
                    }
                }
            });

            return deferred.promise;
        }

        function loadThreads() {
            var deferred = $q.defer();

            self.THREADS = [];

            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var tx = localDB.transaction(["THREADS"], "readonly");
                var threadsStore = tx.objectStore("THREADS");
                var threadsIndex = threadsStore.index("last_msg_time");

                var limit = 199,
                    i = 0,
                    last_thread_id; // threads to initial load. 
                var indexedThreads = threadsIndex.openCursor(null, 'prev');
                indexedThreads.onsuccess = function() {
                    var cursor = indexedThreads.result;

                    if (cursor && i < limit) {
                        self.THREADS.push(cursor.value);
                        cursor.continue();
                    } else {
                        // No more matching records.
                        deferred.resolve();
                    }
                };
            });
            return deferred.promise;
        }

		/******** 4 main flows ************/
		
		/////////// SendRequest flow ///////////////
        function _processSendRequest(requestData, responseData) {
			localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["MYREQUESTS", "THREADS"], "readwrite");

                var myrequestStore = transaction.objectStore("MYREQUESTS");
                var threadsStore = transaction.objectStore("THREADS");

                var my_request = requestData;
                my_request['_id'] = responseData._id;
                my_request['time'] = responseData.time;

                var new_group_thread = {
                    responders: [{
                        _id: null,
                        name: "me"
                    }],
                    group_thread_id: responseData._id,
                    last_msg: {
                        _id: null,
                        msg: responseData.msg,
                        time: responseData.time
                    },
                    is_view: true
                };

                myrequestStore.add(my_request);
                threadsStore.add(new_group_thread);

                // add new Thread & new Request(if loaded) to global var
                //self.MYREQUESTS.push(my_request);
                self.THREADS.push(new_group_thread);
            });
        }

        this.sendRequest = function(dataForm) {
            var request = {
                msg: dataForm.msg,
                cat: 1,
                subcat: 1,
                labels: ["Test"],
                expiry: 0,
                others: {
                    time: null,
                    loc: {
                        lat: 0,
                        lng: 0
                    }
                },
                asking: {
                    price: null,
                    currency: "SGD",
                    payment: null,
                    promo: null
                }
            };

            var url = (!config.is_device) ? '/sendRequest' : config.nex_server_ip + 'sendRequest';
            $http({
                method: 'POST',
                url: url,
                data: _serialize(request), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(response) {
                return _processSendRequest(request, response);
            });
        }


        ///////////// SendResponse flow /////////////
        function _processSendResponse(requestObject, requestData, responseData) {
            var _id = responseData._id,
                time = responseData.time,
                tx_id = responseData.tx_id;

            var deferred = $q.defer();
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["MESSAGES", "THREADS"], "readwrite");

                var messageStore = transaction.objectStore("MESSAGES");
                var threadsStore = transaction.objectStore("THREADS");


                var msg = {
                    _id: responseData._id,
                    tx_id: responseData.tx_id,
                    sender_id: me._id,
                    receiver_id: requestObject.requestor._id,
                    msg: requestData.msg,
                    time: responseData.time
                };
                var thread = {
                    tx_id: responseData.tx_id,
                    requestor: {
                        _id: requestObject.requestor._id,
                        name: requestObject.requestor.name
                    },
                    quote_msg_id: responseData._id,
                    request: requestObject,
                    last_msg: {
                        _id: responseData._id,
                        msg: requestData.msg,
                        time: responseData.time
                    },
                    is_view: true
                };

                threadsStore.add(thread);
                messageStore.add(msg);

                // add new Thread to global var
                self.THREADS.push(thread);
            });
        }

        this.sendResponse = function(dataForm, requestObject) {
            var request = {
                request_id: requestObject._id,
                requestor_id: requestObject.requestor._id,
                msg: dataForm.msg,
                quote: {
                    price: 15,
                    currency: "SGD"
                }
            };

            var url = (!config.is_device) ? '/sendResponse' : config.nex_server_ip + 'sendResponse';
            $http({
                method: 'POST',
                url: url,
                data: _serialize(request), // pass in data as strings	
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).success(function(response) {
                return _processSendResponse(requestObject, request, response);
            });
        }

        ///////////////// sendMessage flow //////////////
        function __update_THREAD(tx_id, msg, is_view) {
            for (var i = 0; i < self.THREADS.length; i++) {
                var thread = self.THREADS[i];

                if (thread.tx_id == tx_id) {
                    if (msg) {
                        thread.last_msg = msg;
                    }
                    if (is_view) {
                        thread.is_view = is_view;
                    }
                    if (thread.tmp) {
                        thread.tmp = false;
                    }
                    break;
                }
            }
        }

        function _processSendMessage(requestData, responseData) {
            var deferred = $q.defer();
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["MESSAGES", "THREADS"], "readwrite");

                var messageStore = transaction.objectStore("MESSAGES");
                var threadsStore = transaction.objectStore("THREADS");

                var threadStoreIndex = threadsStore.index("tx_id");

                var msg = {
                    _id: responseData._id,
                    tx_id: requestData.tx_id,
                    sender_id: me._id,
                    receiver_id: requestData.receiver_id,
                    msg: requestData.msg,
                    time: responseData.time
                };

                var objectStoreRequest = threadStoreIndex.openCursor(IDBKeyRange.only(requestData.tx_id));
                objectStoreRequest.onsuccess = function(event) {
                    var thread = event.target.result.value;
                    if (thread) {
                        thread.is_view = true;
                        thread.last_msg = {
                            _id: responseData._id,
                            msg: requestData.msg,
                            time: responseData.time
                        };
                        threadsStore.put(thread, event.target.result.primaryKey);
                        messageStore.add(msg);
                    }
                };
                // update self.THREADS & self.MESSAGES
                __update_THREAD(requestData.tx_id, msg, true);
                if (Message.current_tx_id == requestData.tx_id) {
                    Message.MESSAGES.push(msg);
                }
            });
        }

        this.sendMessage = function(msg, tx_id) {
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var transaction = localDB.transaction(["THREADS"], "readonly");
                var threadsStore = transaction.objectStore("THREADS");
                var threadsIndex = threadsStore.index("tx_id");
                var objectStoreRequest = threadsIndex.get(tx_id);

                objectStoreRequest.onsuccess = function(event) {
                    var data = event.target.result;
                    if (data) {
                        if (data.responder) {
                            var request = {
                                msg: msg,
                                tx_id: tx_id,
                                receiver_id: data.responder._id
                            };
                        } else {
                            var request = {
                                msg: msg,
                                tx_id: tx_id,
                                receiver_id: data.requestor._id
                            };
                        }

                        var url = (!config.is_device) ? '/sendMessage' : config.nex_server_ip + 'sendMessage';
                        $http({
                            method: 'POST',
                            url: url,
                            data: _serialize(request), // pass in data as strings	
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        }).success(function(response) {
                            return _processSendMessage(request, response);
                        });
                    }
                };
            });
        }
		
		/************ other functions ***********/
        
		////////////////////////////
        this.refresh = function() {
            return getLastMessageId().then(function(last_msg_id) {
                return getStart(last_msg_id);
            }).then(function(data) {
                return buildNewData(data);
            });
        }

        ////////////////////////////
        this.loadGroupThreads = function(request_id) {
            var deferred = $q.defer();
            localDB.ready().then(function(localDB, flag_onupgradeneeded) {
                var tx = localDB.transaction(["THREADS"], "readonly");
                var threadsStore = tx.objectStore("THREADS");
                var threadsIndex = threadsStore.index("request_id");

                var requestThreads = [];

                var indexedThreads = threadsIndex.openCursor(IDBKeyRange.only(request_id));
                indexedThreads.onsuccess = function() {
                    var cursor = indexedThreads.result;
                    if (cursor) {
                        requestThreads.push(cursor.value);
                        cursor.continue();
                    } else {
                        // No more matching records.
                        deferred.resolve(requestThreads);
                    }
                }
            });
            return deferred.promise;
        }
    })

    .service('realtime-socket', function($window) {

    })