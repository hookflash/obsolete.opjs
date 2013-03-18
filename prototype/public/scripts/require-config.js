require.config({
  deps: ['app'],
  paths: {
    jquery: 'lib/jquery',
    _: 'lib/lodash',
    backbone: 'lib/backbone'
  },
  shim: {
    backbone: {
      exports: 'Backbone',
      deps: ['jquery', '_']
    }
  }
});
