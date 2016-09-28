/**
 * Login service
 *
 * @author Dima Zelenyuk
 */


angular.module('loginService', ['ui.router'])
.provider('loginService', function () {
  var userToken = localStorage.getItem('userToken'),
      errorState = 'app.error',
      logoutState = 'app.home';

  this.$get = function ($rootScope, $http, $q, $state) {


    var setHeaders = function (token) {
      if (!token) {
        delete $http.defaults.headers.common['X-Token'];
        return;
      }
      $http.defaults.headers.common['X-Token'] = token.toString();
    };

    var setToken = function (token) {
      if (!token) {
        localStorage.removeItem('userToken');
      } else {
        localStorage.setItem('userToken', token);
      }
      setHeaders(token);
    };

    var getLoginData = function () {
      if (userToken) {
        setHeaders(userToken);
      } else {
        wrappedService.userRole = userRoles.public;
        wrappedService.isLogged = false;
        wrappedService.doneLoading = true;
      }
    };

    var managePermissions = function () {
      $rootScope.$on('$stateChangeStart', function (event, to, toParams, from, fromParams) {

        if (wrappedService.userRole === null) {
          wrappedService.doneLoading = false;
          wrappedService.pendingStateChange = {
            to: to,
            toParams: toParams
          };
          return;
        }

        if (to.accessLevel === undefined || to.accessLevel.bitMask & wrappedService.userRole.bitMask) {
          angular.noop();
        } else {
          event.preventDefault();
          $rootScope.$emit('$statePermissionError');
          $state.go(errorState, { error: 'unauthorized' }, { location: false, inherit: false });
        }
      });


      $rootScope.$on('$stateChangeError', function (event, to, toParams, from, fromParams, error) {

        var errorObj, redirectObj;
        // in case the promise given to resolve function is an $http request
        // the error is a object containing the error and additional informations
        error = (typeof error === 'object') ? error.status.toString() : error;
        // in case of a random 4xx/5xx status code from server, user gets loggedout
        // otherwise it *might* forever loop (look call diagram)
        if (/^[45]\d{2}$/.test(error)) {
          wrappedService.logoutUser();
        }

        if (angular.isDefined(to.redirectMap) && angular.isDefined(to.redirectMap[error])) {
          if (typeof to.redirectMap[error] === 'string') {
            return $state.go(to.redirectMap[error], { error: error }, { location: false, inherit: false });
          } else if (typeof to.redirectMap[error] === 'object') {
            redirectObj = to.redirectMap[error];
            return $state.go(redirectObj.state, { error: redirectObj.prefix + error }, { location: false, inherit: false });
          }
        }
        return $state.go(errorState, { error: error }, { location: false, inherit: false });
      });
    };


    var wrappedService = {
      loginHandler: function (user, status, headers, config) {


        setToken(user.token);
        angular.extend(wrappedService.user, user);
        wrappedService.isLogged = true;
        wrappedService.userRole = user.userRole;
        return user;
      },
      loginUser: function (httpPromise) {
        httpPromise.success(this.loginHandler);
      },
      logoutUser: function (httpPromise) {
        setToken(null);
        this.userRole = userRoles.public;
        this.user = {};
        this.isLogged = false;
        $state.go(logoutState);
      },
      resolvePendingState: function (httpPromise) {
        var checkUser = $q.defer(),
            self = this,
            pendingState = self.pendingStateChange;

        httpPromise.success(self.loginHandler);

        httpPromise.then(
          function success(httpObj) {
            self.doneLoading = true;
            if (pendingState.to.accessLevel === undefined || pendingState.to.accessLevel.bitMask & self.userRole.bitMask) {
              checkUser.resolve();
            } else {
              checkUser.reject('unauthorized');
            }
          },
          function reject(httpObj) {
            checkUser.reject(httpObj.status.toString());
          }
        );

        self.pendingStateChange = null;
        return checkUser.promise;
      },

      userRole: null,
      user: {},
      isLogged: null,
      pendingStateChange: null,
      doneLoading: null
    };

    getLoginData();
    managePermissions();

    return wrappedService;
  };
});
