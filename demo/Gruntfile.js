module.exports = function(grunt) {

  'use strict';

  grunt.initConfig({
    jshint: {
      options: {
        undef: true,
        unused: true,
        strict: true,
        quotmark: 'single'
      },
      dev: {
        options: {
          node: true
        },
        files: {
          src: ['Gruntfile.js']
        }
      },
      client: {
        options: {
          browser: true,
          devel: true,
          globals: {
            require: true,
            define: true
          }
        },
        files: {
          src: ['public/scripts/modules/*.js', 'public/scripts/*.js']
        }
      },
      clientTests: {
        options: {
          browser: true,
          globals: {
            define: true,
            assert: true,
            suite: true,
            suiteSetup: true,
            test: true
          }
        },
        files: {
          src: ['test/client/tests/*.js']
        }
      }
    },
    requirejs: {
      compile: {
        options: {
          almond: true,
          mainConfigFile: 'public/scripts/require-config.js',
          out: 'public/scripts/dist/op.js',
          name: 'app'
        }
      }
    },
    mocha: {
      index: ['test/client/index.html']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-mocha');

  grunt.registerTask('test', ['mocha']);
  grunt.registerTask('default', ['jshint', 'test']);
  grunt.registerTask('dist', ['default', 'requirejs']);
};
