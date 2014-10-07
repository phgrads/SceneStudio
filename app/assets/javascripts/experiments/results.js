'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['jquery.datatables.bootstrap','jquery.datatables.tabletools'], function() {
    $(document).ready(function() {
      $('#resultsTable').dataTable({
        'dom': 'T<"clear">lfrtip',
        'order': [[ 0, "desc" ]],
        tableTools: {
          "sSwfPath": "/swf/copy_csv_xls_pdf.swf"
        }
      });
    } );
  })
});