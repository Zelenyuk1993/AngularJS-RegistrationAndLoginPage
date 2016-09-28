angular.module('angular-login.grandfather', ['ui.router', 'templates-app'])
.config(function ($stateProvider) {
  $stateProvider
    .state('app', {
      abstract: true,
      template: '<ui-view></ui-view>',
      resolve: {
        'login': function (loginService, $q, $http) {
          var roleDefined = $q.defer();

          if (loginService.pendingStateChange) {
            return loginService.resolvePendingState($http.get('/user'));
          } else {
            roleDefined.resolve();
          }
          return roleDefined.promise;
        }
      }
    });
});
