'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['jquery.datatables.bootstrap','jquery.datatables.tabletools'], function() {
    $(document).ready(function() {
      var sSwfPath = window.globals.base_url + '/swf/copy_csv_xls_pdf.swf';
      $('#resultsTable').dataTable({
        'dom': 'T<"clear">lfrtip',
        'order': [ 0, "desc" ],
        tableTools: {
//          "sSwfPath": sSwfPath
          "sSwfPath": '../../../swf/copy_csv_xls_pdf.swf'
        }
      });
    } );
  })
});