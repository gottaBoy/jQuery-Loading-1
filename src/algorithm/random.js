(function($) {
    $.fn.loading.algorithm('random', function(options, _) {
        var	inter = 0,
            z = 0;

        while (z < options.matrix.y * options.matrix.x) {
            setTimeout((function(y,x){ return function() {
                effect(pins[y][x]);
            }})(parseInt(Math.floor(Math.random() * (options.matrix.y))),parseInt(Math.floor(Math.random() * (options.matrix.x)))), inter);

            inter+= options.interval;
            z++;
        }
    });
}).call(this, jQuery);