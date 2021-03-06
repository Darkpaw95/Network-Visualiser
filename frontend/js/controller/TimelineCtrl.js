var app = angular.module('MaidSafe', ['ui-rangeSlider', 'ngReact']);

app.run([
  '$rootScope', '$location', function($rootScope, $location) {
    $rootScope.socketEndPoint = "http://" + $location.host() + ":" + socketPort;
  }
]);

app.service('vaultBehaviour', VaultBehaviourService);
app.service('socketService', SocketService);
app.service('dataManager', DataManagerService);
app.service('playbackService', PlaybackService);
app.service('vaultManager', VaultManagerService);

app.controller('timelineCtrl', [
  '$scope', '$rootScope', '$location', '$http', '$timeout', 'dataManager', 'playbackService', 'socketService', 'vaultManager',
  function($scope, $rootScope, $location, $http, $timeout, dataManager, playbackService, socketService, vaultManager) {

    $rootScope.sessionName = $location.search().sn;
    $scope.iconsTrayClosed = true;
    $scope.vaultManager = vaultManager;
    $scope.allVaultsExpanded = false;
    $scope.showLoader = true;
    $scope.alert = null;
    $scope.playerStatus = "";
    $scope.PLAYER_STATE = { PLAYING: "playing", STOPPED: "stopped", PAUSED: 'pause' };
    $scope.playerState = $scope.PLAYER_STATE.STOPPED;
    $scope.firstLogtime = null;
    $scope.playback = { currentState: 0, max_steps: 1000, incrementalSteps: 0 };
    $scope.currentPlayTime = null;
    $scope.maxTime = new Date();
    $scope.playingTime = new Date();
    socketService.stop();
    $scope.autoSeekIntervalPromise = null;
    $scope.changedOnPause = false;
    $scope.zoomClass = 'large';

    $scope.$watch('playback.currentState', function(newValue) {
      if ($scope.firstLogtime && String(newValue).indexOf(".") == -1) {
        if ($rootScope.playerPaused) {
          $scope.changedOnPause = true;
        } else {
          $scope.showLoader = true;
        }
        $scope.currentPlayTime = $scope.getPlayTime(parseFloat(newValue));
        if (!$scope.$$phase) {
          $scope.$apply();
        }
        if ($scope.autoSeekIntervalPromise) {
          $timeout.cancel($scope.autoSeekIntervalPromise);
          $scope.autoSeekIntervalPromise = null;
        }
        $scope.autoSeekIntervalPromise = $timeout(function() {
          if (!$rootScope.playerPaused) {
            $scope.stopHistoryPlayback();
            $scope.playHistory();
          }
        }, 1500);
      }
    });
    $scope.updatePlayingTime = function() {
      $scope.playback.currentState += $scope.playback.incrementalSteps;
      $scope.currentPlayTime += 1000;
      if ($scope.currentPlayTime >= $scope.maxTime) {
        $scope.pauseHistoryPlayback();
        $scope.setStatusAlert('Playback Completed');
      }
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    };
    $scope.setStatusAlert = function(msg) {
      $scope.alert = msg;
      $timeout(function() {
        $scope.alert = null;
      }, 5000);
    };
    $scope.toggleIconsTray = function() {
      $scope.iconsTrayClosed = !$scope.iconsTrayClosed;
    };
    $scope.toggleExpandAllLogs = function() {
      $scope.allVaultsExpanded = !$scope.allVaultsExpanded;
      vaultManager.expandAllVaultLogs($scope.allVaultsExpanded);
    };
    $scope.getPlayTime = function(playFrom) {
      var time = $scope.maxTime;
      var date = new Date(time - ((($scope.playback.max_steps - playFrom) / $scope.playback.max_steps) * (time - $scope.firstLogtime)));
      return date.getTime();
    };
    $scope.playHistory = function() {
      $scope.showLoader = true;
      $rootScope.playerPaused = false;
      var _time = new Date($scope.currentPlayTime).toISOString();
      $scope.playerState = $scope.PLAYER_STATE.PLAYING;
      $scope.vaultManager.vaultCollection = []; //clear the present state
      dataManager.clearState();
      dataManager.getActiveVaults(_time);
      $scope.playerStatus = "Buffering...";
    };
    $scope.pauseHistoryPlayback = function() {
      $rootScope.playerPaused = true;
      $scope.playerState = $scope.PLAYER_STATE.PAUSED;
      playbackService.pause();
    };
    $scope.resumeHistoryPlayback = function() {
      $rootScope.playerPaused = false;
      $scope.playerState = $scope.PLAYER_STATE.PLAYING;
      if ($scope.changedOnPause) {
        $scope.changedOnPause = false;
        $scope.stopHistoryPlayback();
        $scope.playHistory();
      } else {
        playbackService.resume();
      }

    };
    $scope.stopHistoryPlayback = function() {
      $scope.playerState = $scope.PLAYER_STATE.STOPPED;
      playbackService.stop();
    };
    $scope.changeZoomLevel = function(newZoomLevel) {
      if ($scope.zoomClass == newZoomLevel) {
        return;
      }

      $scope.zoomClass = newZoomLevel;
      $scope.vaultManager.refreshVaultCollection();
    };

    var onVaultsLoaded = function(time) {
      $scope.showLoader = false;
      if ($scope.vaultManager.vaultCollection.length == 0) {
        $scope.playerStatus = 'No active vaults';
        $timeout(function() {
          $scope.playerStatus = '';
        }, 3000);
      }
      if (time) {
        playbackService.play(time);
      }
    };
    var updatePlayerStatus = function(status) {
      switch (status) {
        case 0: //playing
          $scope.playerStatus = "";
          $scope.updatePlayingTime();
          break;

        case 3: //resume
          $scope.updatePlayingTime();
          break;
      }
    };
    dataManager.onNewVault($scope.vaultManager.addVault);
    dataManager.onVaultsLoaded(onVaultsLoaded);
    playbackService.onStatusChange(updatePlayerStatus);
    $http.get('/backend/timelineDates?sn=' + $rootScope.sessionName).then(function(res) {
      $scope.firstLogtime = new Date(res.data.beginDate).getTime() - 1000;
      var maxDate = res.data.endDate ? new Date(res.data.endDate) : new Date();
      $scope.maxTime = maxDate.getTime() + 10000;
      $scope.playback.incrementalSteps = 1000 / ((new Date($scope.maxTime).getTime() - $scope.firstLogtime) / $scope.playback.max_steps);
      $scope.currentPlayTime = $scope.firstLogtime;
    }, function() {
      $scope.setStatusAlert('Unable to Initialise Timeline');
    });
    $scope.showLoader = false;
  }
]);