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
    backbone: {
      exports: 'Backbone',
      deps: ['jquery', '_']
    }
  }
});
