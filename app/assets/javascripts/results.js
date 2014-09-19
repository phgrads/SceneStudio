'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['jquery.datatables.bootstrap'], function() {
    $(document).ready(function() {
      $('#resultsTable').dataTable();
    } );
  })
});