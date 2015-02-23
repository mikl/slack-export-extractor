'use strict';

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var ncp = require('ncp');
var path = require('path');

module.exports = function (config) {
  if (!config.destinationPath) {
    config.destinationPath = path.resolve(config.sourcePath, '__extracted_export');
  }

  async.auto({
    channelData: function (callback) {
      fs.readFile(path.join(config.sourcePath, 'channels.json'), { encoding: 'utf-8' }, function (err, data) {
        if (err) {
          callback(err);
        }

        callback(null, JSON.parse(data));
      });
    },

    userData: function (callback) {
      fs.readFile(path.join(config.sourcePath, 'users.json'), { encoding: 'utf-8' }, function (err, data) {
        if (err) {
          callback(err);
        }

        callback(null, JSON.parse(data));
      });
    },

    destinationFolder: function (callback) {
      fs.mkdir(config.destinationPath, function (err) {
        // Ignore the error if the folder already exists.
        if (err && err.code !== 'EEXIST') {
          callcack(err);
        }
        else {
          callback(null, config.destinationPath);
        }
      });
    },

    filteredChannels: ['channelData', function (callback, results) {
      // For each given channel name, find the matching channel name.
      async.map(config.channelNames, function (name, callback) {
        var candidate = _.find(results.channelData, { name: name });

        if (candidate) {
          callback(null, candidate);
        }
        else {
          callback('Channel ' + name + ' could not be found');
        }
      }, callback);
    }],

    filteredUsers: ['filteredChannels', 'userData', function (callback, results) {
      var userIds = [];

      results.filteredChannels.forEach(function (channel) {
        userIds = userIds.concat(channel.members);
      });

      var uniqueUserIds = _.uniq(userIds);

      console.info('Found', userIds.length, 'users,', uniqueUserIds.length, 'unique users.');

      var filteredUsers = _.filter(results.userData, function (user) {
        return uniqueUserIds.indexOf(user.id) != -1
      });

      callback(null, filteredUsers);
    }],

    copyChannelFiles: ['destinationFolder', 'filteredChannels', function (callback, results) {
      async.each(results.filteredChannels, function (channel, callback) {
        var sourcePath = path.join(config.sourcePath, channel.name);
        var destPath = path.join(config.destinationPath, channel.name);
        ncp(sourcePath, destPath, callback);
      }, callback);
    }],

    writeChannelsJSON: ['destinationFolder', 'filteredChannels', function (callback, results) {
      var filePath = path.join(results.destinationFolder, 'channels.json');
      fs.writeFile(filePath, JSON.stringify(results.filteredChannels, null, 4), { encoding: 'utf-8' }, callback);
    }],

    writeUsersJSON: ['destinationFolder', 'filteredUsers', function (callback, results) {
      var filePath = path.join(results.destinationFolder, 'users.json');
      fs.writeFile(filePath, JSON.stringify(results.filteredUsers, null, 4), { encoding: 'utf-8' }, callback);
    }],

  }, function (err, results) {
    if (err) {
      console.error('ERROR:', err);
    }
    else {
      console.log('All done, find the filtered export in', results.destinationFolder);
    }
  });
};
