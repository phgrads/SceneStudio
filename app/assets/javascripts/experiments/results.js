'use strict';

// TODO: Global scope for runtime debugging, pull declaration into scope below
define(function(require) {
  require(['jquery.datatables.bootstrap','jquery.datatables.tabletools'], function() {
    $(document).ready(function() {
      $.fn.dataTable.TableTools.defaults.sSwfPath = window.globals.base_url + '/swf/copy_csv_xls_pdf.swf';
      $('#resultsTable').dataTable({
        'order': [ 0, "desc" ]
      });
      var tt = new $.fn.dataTable.TableTools( $('#resultsTable') );
      $( tt.fnContainer() ).insertBefore('div.dataTables_wrapper');

      $('#resultsTable').on( 'draw.dt', function () {
        // Trigger window scroll event so images lazily load
        //$(window).trigger("scroll")
        $('body,html').animate({
          scrollTop: $(window).scrollTop() + 1
        }, 300);
      } );
    } );

  })
});