angular.module('nexcuse.controllers', ['nexcuse.services'])

    .controller('AppCtrl', function($scope, $ionicModal, $timeout) {

    })

    /*****************************************************************************
    ///////////////////////////////// Login & Register View  /////////////////////
    *****************************************************************************/

    .controller('SignInCtrl', function($scope, $state, me) {
        $scope.isLoginFalse = false;

        function init() {
            if (me.checklogin()) {
                $state.go('app.inbox');
            }
        }

        $scope.sign_in = function(username, password) {
            me.signinup(username, password, function(data) {
                if (data.ret === 0) {
                    $state.go('app.inbox');
                } else if (data.ret === 1) {
                    $state.go('register_basic_name', {
                        userId: data._id
                    });
                } else {
                    $scope.isLoginFalse = true;
                }
            });
        };

        init();
    })

    .controller('RegisterBasicNameCtrl', function($scope, $state, $stateParams, me) { // this will have the upload picture. 
        $scope.register_basic_name = function(name) {
            if (name == null || name == "") return;

            me.register_basic_name($stateParams.userId, name, function(data) {
                if (data.ret === 0) {
                    $state.go('register_basic_avatar', {
                        userId: $stateParams.userId
                    });
                }
            });
        }
    })

    .controller('RegisterBasicAvatarCtrl', function($scope, $state, $stateParams, $http, $cordovaCamera, $ionicActionSheet, me, config) { // this will have the upload picture. 
        var avatarURI;

        function _choose_image(type) {
            if (config.is_device) {
                document.addEventListener('deviceready', function() {
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.FILE_URI,
                        sourceType: type === 0 ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 128,
                        targetHeight: 128,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageURI) {
                        var image = document.getElementById('myImage');
                        image.src = imageURI;
                        avatarURI = imageURI;
                    }, function(err) {
                        // error
                        console.log('Error to get picture from device.');
                    });
                }, false);
            }
        }

        $scope.register_basic = function() {
            me.register_basic_avatar(avatarURI, function(data) {
                if (data.ret === 0) {
                    $state.go('app.inbox');
                }
            });
        }

        $scope.showActionsheet = function(i) {
            $ionicActionSheet.show({
                buttons: [{
                        text: 'Take Photo'
                    },
                    {
                        text: 'Choose From Library'
                    }
                ],
                cancelText: 'Cancel',
                cancel: function() {},
                buttonClicked: function(index) {
                    switch (index) {
                        case 0:
                            _choose_image(0);
                            break;
                        case 1:
                            _choose_image(1);
                            break;
                    }
                    return true;
                }
            });
        };
    })

    /*****************************************************************************
    ///////////////////////////////// Inbox view ////////////////////////////////
    *****************************************************************************/

    .controller('InboxCtrl', function($scope, $state, $ionicModal, me, NEXMAIN) {
        var vm = this;
        vm.THREADS;

        function __init() {
            me.ready().then(
                function() {
					NEXMAIN.ready().then(function() {
                        vm.THREADS = NEXMAIN.THREADS;
                    });
                },
                function() {
                    $state.go('signin');
                }
            );

            $ionicModal.fromTemplateUrl('./templates/_sendrequest_modal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.modal = modal;
            });
        }

        __init();

         /////// pop-up Create Request ////////

        vm.openSendRequestModal = openSendRequestModal;
        vm.closeSendRequestModal = closeSendRequestModal;

        function openSendRequestModal() {
            $scope.modal.show();
        }

        function closeSendRequestModal() {
            // clean all data before close the modal
            $scope.modal.hide();
        }

        ///////// interactive to Threads //////////
        $scope.go = function(thread) {
            if (thread.group_thread_id)
                $state.go('app.inboxgroup', {
                    group_thread_id: thread.group_thread_id
                });
            else
                $state.go('app.chat', {
                    tx_id: thread.tx_id
                });
        }

        $scope.getUserName = function(thread) {
            if (thread.requestor)
                return thread.requestor.name;
            else if (Array.isArray(thread.responders))
                return "[" + thread.responders[thread.responders.length - 1].name + "] (" + thread.responders.length + ")";
            else
                return thread.responder.name;
        }

        $scope.refresh = function() {
            NEXMAIN.refresh().then(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }

    })

    /*****************************************************************************
    ///////////////////////////////// InboxGroup view ////////////////////////////////
    *****************************************************************************/

    .controller('InboxGroupCtrl', function($scope, $stateParams, $ionicModal, $state, NEXMAIN) {
        console.log($stateParams.group_thread_id);
        var vm = this;

        function __init() {
            NEXMAIN.loadGroupThreads($stateParams.group_thread_id).then(function(THREADS) {
                vm.THREADS = THREADS;
            });
        }

        __init();

        $scope.go = function(tx_id) {
            $state.go('app.chat', {
                tx_id: tx_id
            });
        }
    })

    /*****************************************************************************
    ///////////////////////////////// SendRequest popup view ////////////////////////////////
    *****************************************************************************/

    .controller('SendRequestCtrl', function($scope, NEXMAIN) {
        var vm = this;
        vm.sendRequest = sendRequest;
        
        function sendRequest(message) {
            NEXMAIN.sendRequest(message);
            $scope.Inbox.closeSendRequestModal();
        }

    })

    /*****************************************************************************
    ///////////////////////////////// Notification view ////////////////////////////////
    *****************************************************************************/

    .controller('NotificationCtrl', function($scope, $stateParams, $ionicModal, me, Notification) {
        var vm = this;

        function __init() {
            me.ready().then(
                function(success) {},
                function(reject) {
                    $state.go('signin');
                }
            ).then(function() {
                return Notification.ready();
            }).then(function() {
                vm.NOTIFICATIONS = Notification.NOTIFICATIONS;
            });
            
			$ionicModal.fromTemplateUrl('./templates/_sendresponse_modal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.modal = modal;
            });
        }

        __init();

        //////////////////////////////////////////////////
        vm.openSendResponseModal = openSendResponseModal;
        vm.closeSendResponseModal = closeSendResponseModal;

        function openSendResponseModal(notification) {
            $scope.selectedNotification = notification;
            $scope.modal.show();
        }

        function closeSendResponseModal() {
            // clean all data before close the modal
            $scope.modal.hide();
        }

        $scope.refresh = function() {
            Notification.refresh().then(function() {
                $scope.$broadcast('scroll.refreshComplete');
            });
        }
    })

    /*****************************************************************************
    ///////////////////////////////// SendResponse popup /////////////////////////
    *****************************************************************************/

    .controller('SendResponseCtrl', function($scope, NEXMAIN) {
        var vm = this;
        vm.sendResponse = sendResponse;

        function sendResponse(message) {
            NEXMAIN.sendResponse(message, $scope.selectedNotification);
            $scope.Notification.closeSendResponseModal();
        }
    })

    /*****************************************************************************
    ///////////////////////////////// Chat view ////////////////////////////////
    *****************************************************************************/

    .controller('ChatCtrl', function($scope, $timeout, $ionicScrollDelegate, $stateParams, me, NEXMAIN, Message) {
        var vm = this;

        vm.hideTime = true;
        vm.data = {}; // data = new sent/received for each msg.
        vm.myId = me._id;
        vm.messages = [];

        var alternate,
            isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

        vm.sendMessage = sendMessage;



        function _checkAuthenticate() {

        }

        function _checkDataReady() {

        }

        function _initComponents() {

        }

        function __init() {
            me.ready().then(
                function(success) {},
                function(reject) {}
            ).then(function() {
                return Message.loadThreadAllMsg($stateParams.tx_id);
            }).then(function(messages) {
                vm.messages = messages;
            });
        }

        __init();

        function sendMessage(isTmpThread) {
            NEXMAIN.sendMessage($scope.data.message, $stateParams.tx_id);
            $ionicScrollDelegate.scrollBottom(true);
        };


        $scope.inputUp = function() {
            if (isIOS) $scope.data.keyboardHeight = 216;
            $timeout(function() {
                $ionicScrollDelegate.scrollBottom(true);
            }, 300);

        };

        $scope.inputDown = function() {
            if (isIOS) $scope.data.keyboardHeight = 0;
            $ionicScrollDelegate.resize();
        };

        $scope.closeKeyboard = function() {
            // cordova.plugins.Keyboard.close();
        };

    })

    .controller('NexploreCtrl', function($scope, $stateParams, my, data) {
        function __init() {
			my.ready().then(
                function(success) {},
                function(reject) {}
            );
        }

        __init();
    })

    .controller('SettingsCtrl', function($scope, my, data) {
        function __init() {
            my.ready().then(
                function(success) {
                },
                function(reject) {
                },
                function(notify) {
                    console.log(notify);
                }
            );
        }

        __init();

    });