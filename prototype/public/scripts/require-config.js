require.config({
  deps: ['app'],
  paths: {
    jquery: 'lib/jquery',
    _: 'lib/lodash',
    backbone: 'lib/backbone',
    layoutmanager: 'lib/backbone.layoutmanager',
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
    },
    layoutmanager: {
      // LayoutManager does not technically export Backbone (it is a plugin for
      // Backbone). Declaring this precludes the need to include both Backbone
      // and LayoutManager when what is desired is Backbone extended with
      // LayoutManager.
      exports: 'Backbone',
      deps: ['backbone']
    }
  }
});
