/*  REWRITE PENDING - TODO:
 *  - Code was "hacked" together to achieve immediate results - revisions
 *    and rewrite of majority of code to be performed before performing
 *    new development.
 *  - Re-work is being performed to provide named events using pub-sub.
 *    pub/sub will provide greater flexibility by loosely coupling functions 
 *    and elements. Any future development will be more easily implemented.
 *  - In addition to pub-sub, create a mode switching function which can be
 *    called to change the state of the application. The caller does not need
 *    to understand what needs to be disabled/enabled, only the named state
 *    to switch to. Avoids duplicate code (DRY).
 *  - After rewrite, implement key combinations with modifier keys.
 *  - Eliminate all global variables - wrap all of it in an object instead
 */
 
var keys = {};
var keys_keys = [];
var select_key;
var current_key;
var unsuccessful_presses = 0, successful_presses = 0, start_time = 0, end_time = 0, ordering = 0;
var row = '<tr><td>%s</td><td style="padding-left: 27px;"></td></tr>';
var capturing = false, benchmarking = false;

function export_config() {
    $('#export_txt').val('['+JSON.stringify(keys)+', '+JSON.stringify(keys_keys)+']');
}

function color_change(e) {
    keys[e.data.value].color = $(this).val(); 
    export_config();
}

function name_change(data) {
    if(data.content) {
        keys[data.$el.parent().data('key_number')].name = data.content;
        export_config();
    }
}

function disable_benchmarking() {
    if(benchmarking) {
        $('#content').text('');
        clearInterval(timer);
        clearTimeout(timeout);
        benchmarking = false;
        $('#benchmark_btn').attr('value', 'Start Benchmark');
        $(document).off('keyup');
        $('#capture_btn').toggle(true);
        $('#clear_btn').toggle(true);
        $('body').css('background-color', '#FFFFFF');
        $('#content #key_name').remove();
    }
}

function disable_capturing() {
    // Avoid disabling keydown event when benchmarking
    if(capturing) {
        $(document).off('keydown');
        capturing = false;
        $('#capture_btn').attr('value', 'Capture Key Presses');
        $('#keys_table td').click(function() { disable_benchmarking(); });
        $('#keys_table span').click(function() { disable_benchmarking(); });
    }
}

function click_name() {
    disable_capturing();
}

function capture_keys(e) {
    // Assign key to keys array
    if(keys[e.which] === undefined) {
        keys_keys.push(e.which);
        keys[e.which] = {'color': '#f80c12', 'name': 'Key ' + e.which};
        $('#keys_table tr:last').after(sprintf(row, keys[e.which].name));
        $('#keys_table tr:last').data('key_number', e.which);
        $('#keys_table tr:last td:last').append($('select[name="colorpicker"]').clone().attr('name', 'colorpicker'+e.which));
        $('#keys_table tr:last td:first').editable({event: 'click', closeOnEnter: true, lineBreaks: false, callback: name_change}).click(click_name);
        $('select[name="colorpicker'+e.which+'"]').simplecolorpicker({picker: true}).on('change', {'value': e.which}, color_change);
        export_config();
    }
}

function enable_capturing() {
    if(!capturing) {
        $(document).keydown(capture_keys);
        capturing= true;
        $('#capture_btn').attr('value', 'Stop Capturing');
    }
}

function display_key() {
    $('body').css('background-color', keys[current_key].color);
    $('#content').prepend($('body>#key_name').clone().text(keys[current_key].name).css('display', 'block'));
}

function display_stats() {
    presses_per_minute = successful_presses * (6000000 / (last_time - start_time));
    presses_per_minute = Math.round(presses_per_minute )/100;

    $('#kpm').text(presses_per_minute);
    $('#accuracy').text(accuracy_percent + '%');
}

function remove_div() {
    $(this).remove();
}

function random_key() {
    return keys_keys[Math.floor((Math.random()*keys_keys.length))];
}

function benchmark(e) {
    if(!benchmarking) return;
    // Check if matched
    if(e.which != current_key) {
        ++unsuccessful_presses;
    } else {
        last_time = new Date().getTime();
        ++successful_presses;

        $('#content>#key_name').css('color', '#dfdfdf').css('z-index', -1).animate({'margin-top': '300px', 'opacity': 0}, 500, remove_div);
        current_key = random_key();
        display_key();
    }
    accuracy_percent = Math.round(successful_presses / (successful_presses + unsuccessful_presses) * 10000)/100;
    display_stats();
}

jQuery(function($) {
    $('#capture_btn').click(function() {
        if(!capturing) {
            enable_capturing();
        } else {
            disable_capturing();
        }
    });

    $('#import_btn').click(function() {
        try {
            $('#keys_table tr:gt(0)').remove();
            keys = JSON.parse($('#export_txt').val());
            keys_keys= keys[1];
            keys = keys[0];

            for(var key in keys_keys) {
                if(keys[keys_keys[key]] === undefined || keys[keys_keys[key]].name === undefined || keys[keys_keys[key]].name === undefined) {
                    throw('A key or the corresponding name and/or color is missing.');
                }
                $('#keys_table tr:last').after(sprintf(row, keys[keys_keys[key]].name));
                $('#keys_table tr:last').data('key_number', keys_keys[key]);
                $('#keys_table tr:last td:last').append($('select[name="colorpicker"]').clone().attr('name', 'colorpicker'+keys_keys[key]));
                $('#keys_table tr:last td:first').editable({event: 'click', closeOnEnter: true, lineBreaks: false, callback: name_change});
                $('select[name="colorpicker'+keys_keys[key]+'"]').simplecolorpicker({picker: true}).on('change', {'value': keys_keys[key]}, color_change);
                $('select[name="colorpicker'+keys_keys[key]+'"]').simplecolorpicker('selectColor', keys[keys_keys[key]].color);
            }
            $('#keys_table td').click(function(){
                disable_benchmarking();
            });
            $('#config').toggle(false);
        } catch(e) {
            keys_keys = [];
            keys = {};
            alert('Corrupted config - ' + e);
            export_config();
        }
    });

    $('#config_btn').click(function() {
        $('#config').toggle();
    });

    $('#history_btn').click(function() {
        $('#history').toggle();
    });

    $('#clear_btn').click(function() {
        $('#keys_table tr:gt(0)').remove();
        keys = {};
        keys_keys = [];
        export_config();
    });

    $('#benchmark_btn').click(function() {
        if(keys_keys.length === 0) {
            alert('You must have at least one key specified.');
            return;
        }
        if(benchmarking === false || benchmarking === undefined) {
            $('#capture_btn').toggle(false);
            $('#clear_btn').toggle(false);
            $('#config').toggle(false);
            disable_capturing();
            $(document).keyup(benchmark);
            $('#benchmark_btn').attr('value', 'Stop Benchmark');
            $('#content #key_name').remove();

            count = 3;
            $('#content').text(count--);
            timer = setInterval(function() {
                if(!benchmarking) return;
                $('#content').text(count);
                count--;
            }, 1000);

            benchmarking = true;
            timeout = setTimeout(function() {
                if(!benchmarking) return;
                clearInterval(timer);
                $('#content').text('');
                successful_presses = 0;
                unsuccessful_presses = 0;
                start_time = new Date().getTime();
                current_key = random_key();
                display_key();
                setTimeout(function() {
                    if(!benchmarking) return;
                    disable_benchmarking();
                    last_time = start_time + $('#minutes').val()*60000;
                    display_stats();
                    // store some historical stats in another panel
                    newval = $('#benchmark_txt').val()+ $('#minutes').val() + ',' + accuracy_percent + ',' + presses_per_minute + "\n" ;
                    $('#benchmark_txt').val(newval);
                }, Math.abs($('#minutes').val()*60000));
            }, 3000);
        } else {
            disable_benchmarking();
        }
    });

    $('#export_txt').focus(function(){
        disable_capturing();
        disable_benchmarking();
    });

    $('#minutes').focus(function(){
        disable_capturing();
        disable_benchmarking();
    });

    // Hide config/history panels, and initialize the config
    $('#config').toggle(false);
    $('#history').toggle(false);
    export_config();
});
