// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('nexcuse', ['ionic', 'ngCordova', 'nexcuse.controllers', 'nexcuse.services', 'nexcuse.directives'])

    .run(function($ionicPlatform, $http, $window) {
        $ionicPlatform.ready(function() {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);

            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });

        //$http.defaults.headers.post.Authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1OWVlYTc3NjE2Y2I1YjdhZDEzZWYwNzMiLCJuYW1lIjoiTmd1eWVuIFZhbiBUZW8iLCJpYXQiOjE1MDkwNzU5NDl9.Sp8NDwPSkbLuVBSAkoNoJiaopVBHStxoBVfTnanRoO0"; 
        /*if(!$window.localStorage['access_token']) {
        	$window.localStorage['access_token'] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1OWVlYTc3NjE2Y2I1YjdhZDEzZWYwNzMiLCJuYW1lIjoiTmd1eWVuIFZhbiBUZW8iLCJpYXQiOjE1MTAwMzk1MjN9.f_7O39pwXfOQH1iIcYOJq2arYlKfaB7bKQnDCAUCsdA";
        }*/
        $http.defaults.headers.post.Authorization = "Bearer " + $window.localStorage['access_token'];
        console.log($http.defaults.headers.post.Authorization);
    })

    .config(function($stateProvider, $urlRouterProvider) {
        $stateProvider

            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: 'templates/menu.html',
                controller: 'AppCtrl'
            })
			
			/******** login & register *******/
            .state('signin', {
                url: '/sign-in',
                templateUrl: 'templates/1.sign-in.html',
                controller: 'SignInCtrl'
            })
            .state('register_basic_name', {
                url: '/register_basic_name/:userId',
                templateUrl: 'templates/1.1.register.basic.name.html',
                controller: 'RegisterBasicNameCtrl'
            })
            .state('register_basic_avatar', {
                url: '/register_basic_avatar/:userId',
                templateUrl: 'templates/1.1.register.basic.avatar.html',
                controller: 'RegisterBasicAvatarCtrl'
            })

            /******* inbox *******/
            .state('app.inbox', {
                url: '/inbox',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/inbox.html',
                        controller: 'InboxCtrl as Inbox'
                    }
                }
            })

            .state('app.inboxgroup', {
                url: '/inboxgroup/:group_thread_id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/inboxgroup.html',
                        controller: 'InboxGroupCtrl as InboxGroup'
                    }
                }
            })
            .state('app.chat', {
                url: '/chat/:tx_id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/chat.html',
                        controller: 'ChatCtrl as Chat'
                    }
                }
            })
			
			/*********************/
            .state('app.notification', {
                url: '/notification',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/notification.html',
                        controller: 'NotificationCtrl as Notification'
                    }
                }
            })
			
			/*********************/
            .state('app.nexplore', {
                url: '/nexplore',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/nexplore.html',
                        controller: 'NexploreCtrl'
                    }
                }
            })

			/*********************/
            .state('app.settings', {
                url: '/settings',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/settings.html',
                        controller: 'SettingsCtrl'
                    }
                }
            });
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/inbox');
    });