angular.module('angular-login', [
  'loginService',
  'angular-login.mock',
  'angular-login.directives',
  'angular-login.home',
  'angular-login.pages',
  'angular-login.register',
  'angular-login.error',
  'ngAnimate'
])
.config(function ($urlRouterProvider) {
  $urlRouterProvider.otherwise('/');
})
.run(function ($rootScope, $window) {
  // google analytics
  $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams) {
    var realURL = toState.url;
    if (!!$window.ga) {
      for (var v in toParams) {
        realURL = realURL.replace(':' + v, toParams[v]);
      }
      $window.ga('send', 'pageview', realURL);
    }
  });

  var resolveDone = function () { $rootScope.doingResolve = false; };
  $rootScope.doingResolve = false;

  $rootScope.$on('$stateChangeStart', function () {
    $rootScope.doingResolve = true;
  });
  $rootScope.$on('$stateChangeSuccess', resolveDone);
  $rootScope.$on('$stateChangeError', resolveDone);
  $rootScope.$on('$statePermissionError', resolveDone);
})
.controller('BodyController', function ($scope, $state, $stateParams, loginService, $http, $timeout) {
  $scope.$state = $state;
  $scope.$stateParams = $stateParams;

  $scope.ls = loginService;
  $scope.login = {
    working: false,
    wrong: false
  };
  $scope.loginMe = function () {

    var loginPromise = $http.post('/login', $scope.login);
    $scope.login.working = true;
    $scope.login.wrong = false;

    loginService.loginUser(loginPromise);
    loginPromise.error(function () {
      $scope.login.wrong = true;
      $timeout(function () { $scope.login.wrong = false; }, 8000);
    });
    loginPromise.finally(function () {
      $scope.login.working = false;
    });
  };
  $scope.logoutMe = function () {
    loginService.logoutUser($http.get('/logout'));
  };
});
