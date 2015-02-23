'use strict';

var run = require('./index');

module.exports = function () {
  var argv = require('yargs')
    .usage('Usage: $0 --source ~/path/to/slack-export --channel general --channel random')
    .string('destination')
    .string('source')
    .array('channel')
    .require('source')
    .require('channel')
    .argv;

  run({
    channelNames: argv.channel,
    destinationPath: argv.destination,
    sourcePath: argv.source
  });
};
