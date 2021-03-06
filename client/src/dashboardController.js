// -- Dashboard for managing user's meetings.

app.controller('DashboardController', function ($rootScope, $scope, $http, $location, $cookies, $cookieStore, $interval, socket, sharedMethods) {
  $rootScope.userid = $location.path().split('/')[2];
  if ($cookies.login !== '1' && $location.path().split('/')[2] !== $cookies.userid) {
    $location.url('/');
    return;
  }
  $rootScope.userid = $location.path().split('/')[2];
  $cookies.userid = $rootScope.userid;
  delete $cookies.login;
  $rootScope.loggedIn = true;
  if ($cookies.submit) {
    $http({
      url: '/user/' + $rootScope.userid,
      method: 'GET'
    })
    .success(function (data) {
      $rootScope.user = data[0];
      $rootScope.username = data[0].name.givenName;
    })
    .error(function (data) {
      console.log('ERROR');
      $location.url('/');
    });
    $location.url('/signup/' + $cookies.submit);
    return;
  }
  $http({
    url: '/user/' + $rootScope.userid,
    method: 'GET'
  })
  .success(function (data) {
    $rootScope.user = data[0];
    $rootScope.username = data[0].name.givenName;
  })
  .error(function (data) {
    console.log('ERROR');
    $location.url('/');
  });

  // $scope.both = [];

  $scope.getUserMeetings = function () {
    $http({
      url: '/meeting/owner/' + $rootScope.userid,
      method: 'GET'
    })
    .success(function (data) {
      $scope.both = [];
      $scope.hosting = data;

      $http({
        url: '/meeting/speaker/' + $rootScope.userid,
        method: 'GET'
      })
      .success(function (data) {
        $scope.speaking = data;
        var userId = $rootScope.userid;
        for(var i = 0; i < $scope.speaking.length; i++){
          var speaking = $scope.speaking[i].owner_id;
          if(speaking === userId){
            $scope.both.push($scope.speaking.splice(i, 1)[0]);
            i--;
          }
        }

        for(var j = 0; j < $scope.both.length; j++){
          var both = $scope.both[j]._id;
          for(h = 0; h < $scope.hosting.length; h++){
          var hosting = $scope.hosting[h]._id;
            if(both === hosting){
              var temp = $scope.hosting.splice(h, 1);
              h--;
            }
          }
        }

      })
      .error(function (data) {
        console.log('ERROR');
      });
    })
    .error(function (data) {
      console.log('ERROR');
    });

  };

  $scope.getUserMeetings();

  // the create new presentaur form
  $scope.meetingName = '';
  $scope.endTime = '';
  $scope.startTime = '';
  $scope.date = '';
  $scope.createMeeting = function () {
    $http({
      url: '/meeting/new',
      method: 'POST',
      data: {
        meetingName: $scope.meetingName,
        owner_id: $rootScope.userid,
        date: (new Date(Date.parse(($scope.date.toString()).split('-')))).toString().split(' ').slice(0, 4).join(' '),
        startTime: $scope.startTime,
        endTime: $scope.endTime
      }
    })
    .success(function (data) {
      $scope.meetingName = '';
      $scope.endTime = '';
      $scope.startTime = '';
      $scope.date = '';

      $scope.getUserMeetings();
    })
    .error(function (data) {
      console.log('ERROR! recieved:', data);
    });
  };

  $scope.parseDisplayTime = function (time) {
    // convert html time input to something readable and pretty
    time = time.split(':');
    if (time[0] > 12) {
      time[0] = time[0] - 12 + ':';
      time[2] = ' pm';
    } else {
      time[0] = parseInt(time[0], 10) + ':';
      time[0] === '0:' && (time[0] = '12:');
      time[2] = ' am';
    }
    return time.join('');
  };

  $scope.timeRemaining = '';
  $scope.countdown = function () {
    // for displaying time remaining for meeting/per speaker
    var end = new Date($scope.date + ' ' + $scope.endTime);
    $interval(function () {
      var now = new Date();
      var seconds = end.getSeconds() - now.getSeconds() + 60;
      var minutes = end.getMinutes() - now.getMinutes();
      var hours = end.getHours() - now.getHours();
      $scope.timeRemaining = hours + 'h' + ('0' + minutes).substr(-2) + 'm' + ('0' + seconds).substr(-2) + 's';
      console.log($scope.timeRemaining);
    }, 1000); // ...ish
  };
});