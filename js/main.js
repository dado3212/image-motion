function drop(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var imageUrl = evt.dataTransfer.getData('URL');

    // Update form and image
    $('#image').css('background-image', 'url(' + imageUrl + ')');
    $('#image').removeClass('blank');
    $('form input[name="url"]').val(imageUrl);

    $('#chosen span').html(imageUrl);

    // Update all of the relevant images (and possible warning)
    $.post("similar.php", { url: imageUrl })
        .done(function (data) {
            var similar = JSON.parse(data);
            if (similar.status == "success") {
                var n = "";
                for (var url in similar.closest) {
                    var thumbnail = url.substring(0, url.length - 4) + "t" + url.substring(url.length - 4);
                    n += '<div class="image" style="background-image: url(' + thumbnail + ');" data-similarity="' + similar.closest[url] + '"></div>';
                }
                $('#similar').html(n);
            }
        });
}

function verify(evt) {
    if ($('form input[name="url"]').val() == "") {
        alert('Choose an image to upload!');
        evt.preventDefault();
        return false;
    } else {
        return true;
    }
}
