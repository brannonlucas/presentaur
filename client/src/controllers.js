app

// -- Splash page.  Will handle authentication for DJs.

.controller('SplashController', function ($rootScope, $scope, $http, $location, sharedMethods) {
  $scope.meetingName = '';
  $scope.createMeeting = function () {
    $http({
      url: '/meeting/new',
      method: 'POST',
      data: {
        meetingName: $scope.meetingName
      }
    })
    .success(function (data) {
      $rootScope.id = data._id;
      sharedMethods.createMeeting($scope.meetingName, $rootScope.id);
      $scope.meetingName = '';
      $location.url('/account/' + $rootScope.id);
    })
    .error(function (data) {
      console.log('ERROR! recieved:', data);
    });
  };
})


// -- Currently handles creation of new meetings.

.controller('NewController', function ($rootScope, $scope, $http, $location, sharedMethods) {
  if (!$rootScope.userid) {
    $location.url('/');
    return;
  }
  $cookieStore.put('userid', $rootScope.userid);
  $scope.meetingName = '';
  $scope.createMeeting = function () {
    $http({
      url: '/meeting/new',
      method: 'POST',
      data: {
        meetingName: $scope.meetingName
      }
    })
    .success(function (data) {
      $rootScope.id = data._id;
      sharedMethods.createMeeting($scope.meetingName, $rootScope.id);
      $scope.meetingName = '';
      $location.url('/dashboard/' + $rootScope.userid);
    })
    .error(function (data) {
      console.log('ERROR! recieved:', data);
    });
  };
})


// -- DEPRECATED.
// -- Gives you links to send out to speakers, access your dashboard, and view presentation
// .controller('AccountController', function ($scope, sharedMethods) {
//   $scope.meeting = sharedMethods.getMeeting();
// })


// -- Form for signing up to present at a meeting.

.controller('SignupController', function ($rootScope, $scope, $http, $location, $cookies, $cookieStore, sharedMethods) {
  $rootScope.id = $location.path().split('/')[2];
  $scope.speakers = [];

  $http({
    url: '/meeting/' + $rootScope.id,
    method: 'GET'
  })
  .success(function (data) {
    console.log(data);
    sharedMethods.updateMeeting(data[0]);
    $scope.meeting = data[0];
    if (data[0].speakers) {
      $scope.current = data[0].current;
      $scope.speakers = data[0].speakers;
      $scope.queue = $scope.speakers.slice($scope.current);
    }
    $scope.meetingName = data[0].meetingName;
  })
  .error(function (data) {
    console.log('ERROR');
  });

  $scope.addPresenter = function () {
    $scope.speakers.push({name: $scope.speaker.name, url:$scope.speaker.url, user_id: $rootScope.userid});
    sharedMethods.updateCurrent($scope.current);
    $scope.meeting = sharedMethods.getMeeting();
    sharedMethods.updateMeeting($scope.meeting);

    $http({
      url: '/meeting/new',
      method: 'POST',
      data: sharedMethods.getMeeting()
    });

    $scope.speaker = {name: $rootScope.username || '', url: ''};
  };
  $scope.speaker = {
    name: $rootScope.username || '',
    url: ''
  };
})


// -- Dashboard for managing user's meetings.

.controller('DashboardController', function ($rootScope, $scope, $http, $location, $cookies, $cookieStore, socket, sharedMethods) {
  $rootScope.userid = $location.path().split('/')[2];
  if (!$rootScope.userid) {
    $location.url('/');
    return;
  }
  $cookieStore.put('userid', $rootScope.userid);

  $http({
    url: '/user/' + $rootScope.userid,
    method: 'GET'
  })
  .success(function (data) {
    $rootScope.user = data[0];
    $rootScope.username = data[0].name.givenName;
    $rootScope.loggedIn = true;
  })
  .error(function (data) {
    console.log('ERROR');
    $location.url('/');
  });

  $scope.both = [];

  $scope.getUserMeetings = function () {
    $http({
      url: '/meeting/owner/' + $rootScope.userid,
      method: 'GET'
    })
    .success(function (data) {
      console.log('Fetched meetings:', data);
      $scope.hosting = data;
    })
    .error(function (data) {
      console.log('ERROR');
    });

    $http({
      url: '/meeting/speaker/' + $rootScope.userid,
      method: 'GET'
    })
    .success(function (data) {
      console.log('Fetched meetings:', data);
      $scope.speaking = data;
      for (var i = 0; i < $scope.speaking.length; i++) {
        for (var j = 0; j < $scope.hosting.length; j++) {
          if ($scope.hosting[j].owner_id === $scope.speaking[i].owner_id) {
            $scope.both.push($scope.speaking.splice(i, 1)[0]);
            i--;
            break;
          }
        }
      }
    })
    .error(function (data) {
      console.log('ERROR');
    });
  };

  $scope.getUserMeetings();

  // the create new presentaur form
  $scope.meetingName = '';
  $scope.createMeeting = function () {
    console.log('Posting meeting', $scope.meetingName);
    $http({
      url: '/meeting/new',
      method: 'POST',
      data: {
        meetingName: $scope.meetingName,
        owner_id: $rootScope.userid
      }
    })
    .success(function (data) {
      $rootScope.id = data._id;
      sharedMethods.createMeeting($scope.meetingName, $rootScope.id);
      $scope.meetingName = '';

      $scope.getUserMeetings();
    })
    .error(function (data) {
      console.log('ERROR! recieved:', data);
    });
  };
})


// -- Controller for DJing/MCing a meeting.

.controller('DjController', function ($rootScope, $scope, $http, $location, socket, sharedMethods) {
  $rootScope.id = $location.path().split('/')[2];
  var room = $rootScope.id;

  $http({
    url: '/meeting/' + $rootScope.id,
    method: 'GET'
  })
  .success(function (data) {
    sharedMethods.updateMeeting(data[0]);
    $scope.meeting = data[0];
    $scope.current = data[0].current;
    $scope.speakers = data[0].speakers;
    $scope.queue = $scope.speakers.slice($scope.current);
    $scope.meetingName = data[0].meetingName;
  })
  .error(function (data) {
    console.log('ERROR');
  });

  //Socket info to connect to room unique to presentation
  socket.on('connect', function (data) {
    socket.emit('dj join', room);
  });


  $scope.remove = function (speaker) {
    $scope.speakers.splice($scope.speakers.indexOf(speaker), 1);
    sharedMethods.updateQueue($scope.speakers);
    $scope.queue = $scope.speakers.slice($scope.current);

    $http({
      url: '/meeting/new',
      method: 'POST',
      data: sharedMethods.getMeeting()
    });
  };
  $scope.moveSpeaker = function (speaker, direction) {
    var temp;
    var position = $scope.speakers.indexOf(speaker);
    if (direction === 'up') {
      if (position > 0) {
        temp = $scope.speakers[position-1];
        $scope.speakers[position-1] = $scope.speakers[position];
        $scope.speakers[position] = temp;
      }
    } else {
      if (position < $scope.speakers.length-1){
        temp = $scope.speakers[position+1];
        $scope.speakers[position+1] = $scope.speakers[position];
        $scope.speakers[position] = temp;
      }
    }
    sharedMethods.updateQueue($scope.speakers);
    $scope.queue = $scope.speakers.slice($scope.current);

    $http({
      url: '/meeting/new',
      method: 'POST',
      data: sharedMethods.getMeeting()
    });
  };
  $scope.fade = true;
  $scope.started = false;

  $scope.fadeout = function () {
    $scope.current++;
    sharedMethods.updateCurrent($scope.current);
    $scope.queue = $scope.speakers.slice($scope.current);
    socket.emit('fade out');
    $scope.fade = false;

    $http({
      url: '/meeting/new',
      method: 'POST',
      data: sharedMethods.getMeeting()
    });
  };
  $scope.fadein = function () {
    if ($scope.current < $scope.speakers.length) {
      socket.emit('fade in');
      $scope.fade = true;
    }
  };
  $scope.fullscreen = function () {
    socket.emit('fullscreen');
    if (!$scope.started) {
      $scope.started = true;
      $scope.fade = false;
    }
  };
  $scope.startOver = function () {
    $scope.current = 0;
    sharedMethods.updateCurrent($scope.current);
    $scope.queue = $scope.speakers.slice($scope.current);
    socket.emit('start over');

    $http({
      url: '/meeting/new',
      method: 'POST',
      data: sharedMethods.getMeeting()
    });
  };
})


// -- Container page for slideshows to overlay presentaur functionality

.controller('PresentController', function ($rootScope, $scope, $sce, $location, $http, $timeout, socket, sharedMethods) {
  $rootScope.id = $location.path().split('/')[2];
  var room = $rootScope.id;

  $http({
    url: '/meeting/' + $rootScope.id,
    method: 'GET'
  })
  .success(function (data) {
    sharedMethods.updateMeeting(data[0]);
    $scope.speakers = sharedMethods.getQueue();
    $scope.speaker = $scope.speakers[0];
    $scope.presentation = $sce.trustAsResourceUrl($scope.speaker.url);
    $scope.speakerName = $scope.speaker.name;
    $scope.current = data[0].current;
  })
  .error(function (data) {
    console.log('ERROR');
  });
  $scope.frameSize = 'windowed';
  $scope.transition = 'fadein';
  $scope.started = false;

  //socket.io stuff

  //Connects to room unique to meeting
  socket.on('connect', function (data) {
    socket.emit('presentation join', room);
  });

  socket.on('fade out', function () {
    $scope.current++;
    sharedMethods.updateCurrent($scope.current);
    console.log(sharedMethods.getMeeting().current);
    if ($scope.current < $scope.speakers.length) {
      $scope.speaker = $scope.speakers[$scope.current];
      $scope.speakerName = $scope.speaker.name;
      $timeout(function () {
        $scope.presentation = $sce.trustAsResourceUrl($scope.speaker.url);
      }, 1000);
    } else {
      $scope.speakerName = '';
    }
    $scope.transition = 'fadeout';
  });

  socket.on('fade in', function () {
    $scope.transition = 'fadein';
  });

  socket.on('fullscreen', function () {
    $scope.frameSize = $scope.frameSize === 'windowed' ? 'fullscreen' : 'windowed';
    if (!$scope.started) {
      $scope.started = true;
      $scope.transition = 'fadeout';
    }
  });

  socket.on('start over', function () {
    $scope.current = 0;
    $scope.frameSize = 'windowed';
    sharedMethods.updateCurrent(0);
    $scope.started = false;
    $scope.speaker = $scope.speakers[$scope.current];
    $scope.speakerName = $scope.speaker.name;
    $scope.presentation = $sce.trustAsResourceUrl($scope.speaker.url);
  });
});