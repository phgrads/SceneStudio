
$('#new_scene').click(function(){
    var dialog = $('<div id="new_scene_dialog">\
      <form method="post" action="/newScene" id="new_scene_form">\
        Scene Name:<input id="scene_name" type="text" name="scene_name" class="required alphanumPlus">\
      </form>\
    </div>');

    $("#new_scene_form").validate({
        debug: true,
        submitHandler: function(form) {
            alert('validator submitting');
            form.submit();
        }
    });

    dialog.dialog({
        modal: true,
        title: "Create New Scene",
        buttons: [
            {text: "Cancel", click: function() {$(this).dialog("close")}},
            {text: "Submit", click: function() {
                alert('Submit!');
                $('#new_scene_form').submit();
            }}
        ]
    });
});