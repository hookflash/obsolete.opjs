require.config({
  deps: ['app'],
  paths: {
    jquery: 'lib/jquery',
    _: 'lib/lodash',
    backbone: 'lib/backbone',
    text: 'lib/text',
    templates: '../templates'
  },
  shim: {
    _: {
      exports: '_'
    },
    backbone: {
      exports: 'Backbone',
      deps: ['jquery', '_']
    }
  }
});
