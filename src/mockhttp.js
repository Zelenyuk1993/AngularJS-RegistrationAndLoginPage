angular.module('angular-login.mock', ['ngMockE2E'])
.factory('delayHTTP', function ($q, $timeout) {
  return {
    request: function (request) {
      var delayedResponse = $q.defer();
      $timeout(function () {
        delayedResponse.resolve(request);
      }, 700);
      return delayedResponse.promise;
    },
    response: function (response) {
      var deferResponse = $q.defer();

      if (response.config.timeout && response.config.timeout.then) {
        response.config.timeout.then(function () {
          deferResponse.reject();
        });
      } else {
        deferResponse.resolve(response);
      }

      return $timeout(function () {
        deferResponse.resolve(response);
        return deferResponse.promise;
      });
    }
  };
})
.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.interceptors.push('delayHTTP');
}])
.constant('loginExampleData', {
    version: '0.2.0'
})
.run(function ($httpBackend, $log, loginExampleData) {
  var userStorage = angular.fromJson(localStorage.getItem('userStorage')),
      emailStorage = angular.fromJson(localStorage.getItem('emailStorage')),
      tokenStorage = angular.fromJson(localStorage.getItem('tokenStorage')) || {},
      loginExample = angular.fromJson(localStorage.getItem('loginExample'));

  // Check and corrects old localStorage values, backward-compatibility!
  if (!loginExample || loginExample.version !== loginExampleData.version) {
    userStorage = null;
    tokenStorage = {};
    localStorage.setItem('loginExample', angular.toJson(loginExampleData));
  }

  if (userStorage === null || emailStorage === null) {
    userStorage = {
      'Krasav4k1997': { name: 'Andrey', username: 'Krasav4k1997', password: '12345', email: 'Krasav4k@mail.ru', userRole: userRoles.user, tokens: [] },
      'Dim4k1993': { name: 'Dima', username: 'Dim4k1993', password: '54321', email: 'dimaszelenyuk@gmail.com', userRole: userRoles.admin, tokens: [] }
    };
    emailStorage = {
      'Krasav4k@mail.ru': 'Krasav4k1997',
      'dimaszelenyuk@gmail.com': 'Dim4k1993'
    };
    localStorage.setItem('userStorage', angular.toJson(userStorage));
    localStorage.setItem('emailStorage', angular.toJson(emailStorage));
  }


  var randomUUID = function () {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomToken = '';
    for (var i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        randomToken += '';
        continue;
      }
      var randomPoz = Math.floor(Math.random() * charSet.length);
      randomToken += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomToken;
  };


  $httpBackend.when('POST', '/login').respond(function (method, url, data, headers) {
    var postData = angular.fromJson(data),
        user = userStorage[postData.username],
        newToken,
        tokenObj;
    $log.info(method, '->', url);

    if (angular.isDefined(user) && user.password === postData.password) {
      newToken = randomUUID();
      user.tokens.push(newToken);
      tokenStorage[newToken] = postData.username;
      localStorage.setItem('userStorage', angular.toJson(userStorage));
      localStorage.setItem('tokenStorage', angular.toJson(tokenStorage));
      return [200, { name: user.name, userRole: user.userRole, token: newToken }, {}];
    } else {
      return [401, 'wrong combination username/password', {}];
    }
  });


  $httpBackend.when('GET', '/logout').respond(function (method, url, data, headers) {
    var queryToken, userTokens;
    $log.info(method, '->', url);

    if (queryToken = headers['X-Token']) {
      if (angular.isDefined(tokenStorage[queryToken])) {
        userTokens = userStorage[tokenStorage[queryToken]].tokens;
        userTokens.splice(userTokens.indexOf(queryToken));
        delete tokenStorage[queryToken];
        localStorage.setItem('userStorage', angular.toJson(userStorage));
        localStorage.setItem('tokenStorage', angular.toJson(tokenStorage));
        return [200, {}, {}];
      } else {
        return [401, 'auth token invalid or expired', {}];
      }
    } else {
      return [401, 'auth token invalid or expired', {}];
    }
  });

  $httpBackend.when('GET', '/user').respond(function (method, url, data, headers) {
    var queryToken, userObject;
    $log.info(method, '->', url);

    if (queryToken = headers['X-Token']) {
      if (angular.isDefined(tokenStorage[queryToken])) {
        userObject = userStorage[tokenStorage[queryToken]];
        return [200, { token: queryToken, name: userObject.name, userRole: userObject.userRole }, {}];
      } else {
        return [401, 'auth token invalid or expired', {}];
      }
    } else {
      return [401, 'auth token invalid or expired', {}];
    }
  });

  $httpBackend.when('POST', '/user').respond(function (method, url, data, headers) {
    var postData = angular.fromJson(data),
        newUser,
        errors = [];
    $log.info(method, '->', url);

    if (angular.isDefined(userStorage[postData.username])) {
      errors.push({ field: 'username', name: 'used' });
    }

    if (angular.isDefined(emailStorage[postData.email])) {
      errors.push({ field: 'email', name: 'used' });
    }

    if (errors.length) {
      return [409, {
        valid: false,
        errors: errors
      }, {}];
    } else {
      newUser = angular.extend(postData, { userRole: userRoles[postData.role], tokens: [] });
      delete newUser.role;

      userStorage[newUser.username] = newUser;
      emailStorage[newUser.email] = newUser.username;
      localStorage.setItem('userStorage', angular.toJson(userStorage));
      localStorage.setItem('emailStorage', angular.toJson(emailStorage));
      return [201, { valid: true, creationDate: Date.now() }, {}];
    }
  });

});
