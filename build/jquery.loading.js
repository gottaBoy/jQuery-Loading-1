/**
 * jQuery Loading - Shows loading progress animation, flexible and pretty =).
 *
 * Version: 0.2.5
 * Date: 2013-06-28 17:44:09
 *
 * Copyright 2013, Sergey Kamardin.
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Location: Moscow, Russia.
 * Contact: gobwas@gmail.com
 *
 *
 *         ___         ___           ___           ___           ___
 *        /\  \       /\__\         /\  \         /\__\         /\__\
 *       /::\  \     /:/ _/_       /::\  \       /:/  /        /:/ _/_
 *      /:/\:\__\   /:/ /\__\     /:/\:\  \     /:/  /        /:/ /\__\
 *     /:/ /:/  /  /:/ /:/ _/_   /:/ /::\  \   /:/  /  ___   /:/ /:/ _/_
 *    /:/_/:/  /  /:/_/:/ /\__\ /:/_/:/\:\__\ /:/__/  /\__\ /:/_/:/ /\__\
 *    \:\/:/  /   \:\/:/ /:/  / \:\/:/  \/__/ \:\  \ /:/  / \:\/:/ /:/  /
 *     \::/__/     \::/_/:/  /   \::/__/       \:\  /:/  /   \::/_/:/  /
 *      \:\  \      \:\/:/  /     \:\  \        \:\/:/  /     \:\/:/  /
 *       \:\__\      \::/  /       \:\__\        \::/  /       \::/  /
 *        \/__/       \/__/         \/__/         \/__/         \/__/
 *
 */


(function($){
	"use strict";

	/**
	 * Class definition.
	 *
	 * @param element
	 * @param options
	 * @constructor
	 */
	var Loading = function(element, options) {
		/**
		 * Generate uniqueId for instance.
		 * Uses for non-conflict with DOM elements ID.
		 *
		 * @private
		 * @return {String}
		 */
		var uniqueId = (function() {
			var chars = "abcdefghijklmnopqrstuvwxyz0123456789",
				_length = 50;

			return function(length)
			{
				var max = chars.length - 1,
					id  = '',
					symbol,
					i;

				length || (length = _length);

				for (var x = 0; x < length; x++) {
					i = parseInt(Math.floor(Math.random() * (max + 1)), 10);

					symbol = chars.charAt(i);

					Math.floor(Math.random() * 2) && (symbol = symbol.toUpperCase());

					id+= symbol;
				}

				return id;
			};
		})();

		/**
		 * Resolves which function to use as algorithm.
		 *
		 * @private
		 * @param name
		 *
		 * @throws {Error}
		 *
		 * @returns {Function}
		 */
		var algorithmResolver = function(name) {
			if (typeof name == 'function') {
				return name;
			}

			if (Loading.algorithm.hasOwnProperty(name)) {
				return Loading.algorithm[name];
			} else {
				throw new Error('Algorithm not found: "' + name + '"');
			}
		};

		/**
		 * Resolves which function to use as effect.
		 *
		 * @private
		 *
		 * @param name
		 *
		 * @throws {Error}
		 *
		 * @returns {Function}
		 */
		var effectResolver = function(name) {
			var effect;

			if (typeof name == 'function') {
				effect = name;
				effect.count = 1;
				return effect;
			}

			if (name instanceof Array) {
				var effects = [];
				for (var x = 0; x < name.length; x++) {
					effects.push(effectResolver(name[x]));
				}

				effect = function() {
					for (var x = 0; x < effects.length; x++) {
						effects[x].apply(null, arguments);
					}
				};
				effect.count = effects.length;

				return effect;

			} else {
				if (Loading.effect.hasOwnProperty(name)) {
					effect = Loading.effect[name];
					effect.count = 1;
					return effect;
				} else {
					throw new Error('Effect not found: "' + name + '"');
				}
			}
		};

		/**
		 * Normalizes given options.
		 *
		 * @private
		 *
		 * @param options
		 * @returns {*}
		 */
		var optionsNormalizer = function(options) {
			var	spinner = options.spinner,
				matrix  = options.spinner.matrix,
				pin     = options.spinner.pin,
				answer  = $.extend({}, options);

			if (!matrix.x || !matrix.y) {
				answer.spinner.matrix.x = Math.floor(spinner.width / (pin.width + pin.margin.left + pin.margin.right));
				answer.spinner.matrix.y = Math.floor(spinner.height / (pin.height + pin.margin.top + pin.margin.bottom));
			} else {
				answer.spinner.pin.width = Math.floor((spinner.width - ((pin.margin.right + pin.margin.left) * matrix.x)) / matrix.x);
				answer.spinner.pin.height = Math.floor((spinner.height - ((pin.margin.top + pin.margin.bottom) * matrix.y)) / matrix.y);
			}

			answer.spinner.matrix.x-= 1;
			answer.spinner.matrix.y-= 1;

			if (answer.spinner.pin.width <= 0 || answer.spinner.pin.height <= 0) {
				throw new Error('There is not enough space for spinner.');
			}

			return answer;
		};

		/**
		 * Creates background element.
		 *
		 * @private
		 *
		 * @returns {HTMLElement}
		 */
		var createBackground = function(options, dimensions) {
			var background = $('<div/>');

			var hardCss = {
				position: 'absolute'
			};

			var css = $.extend({}, options.css, hardCss, dimensions);

			css.background =
				options.img ?
					options.color + ' url('+options.img+') ' + options.position :
					options.color;

			options.borderRadius && (css['border-radius'] = options.borderRadius);

			background.css(css);

			return background;
		};

		/**
		 * Creates pin.
		 *
		 * @param {Object} options
		 * @param {Object} position
		 *
		 * @returns {HTMLElement}
		 */
		var createPin = function(options, position) {
			var pin = $('<div/>');

			pin
				.css({
					position:   'absolute',
					width:      options.width,
					height:     options.height,
					top:        position.y * (options.height +options.margin.top + options.margin.bottom),
					left:       position.x * (options.width +options.margin.left + options.margin.right)
				})
				.attr({
					'class': 'loading-pin'
				});

			return pin;
		};

		/**
		 * Creates matrix of pins.
		 *
		 * @param options
		 * @returns {Array}
		 */
		var createPins = function(options) {
			var pins = [];

			for (var x = 0; x <= options.matrix.x; x++) {
				pins[x] || (pins[x] = []);
				for (var y = 0; y <= options.matrix.y; y++) {
					pins[x][y] = createPin(options.pin, {x:x, y:y});
				}
			}

			return pins;
		};

		/**
		 * Creates spinner element.
		 *
		 * @private
		 *
		 * @returns {HTMLElement}
		 */
		var createSpinner = function(options, dimensions, pins) {
			var spinner = $('<div/>');

			spinner.css({
				position: 'absolute',
				left:     (dimensions.width - options.width) /2,
				top:      (dimensions.height - options.height) / 2,
				width:    options.width,
				height:   options.height
			});

			for (var x = 0; x < pins.length; x++) {
				for (var y = 0; y < pins[x].length; y++) {
					spinner.append(pins[x][y]);
				}
			}

			return spinner;
		};

		// Constructor

		options || (options = {});

		this.target  = element;
		this.id      = uniqueId(50);
		this.options = optionsNormalizer($.extend(true, {}, $.fn.loading.defaults, options));

		this.dimensions = {
			width:  this.target.outerWidth(),
			height: this.target.outerHeight()
		};

		if (/^relative|absolute$/gi.test(this.target.css('position'))) {
			$.extend(this.dimensions, {
				top: 0,
				left: 0
			});
		} else {
			$.extend(this.dimensions, {
				top:    this.target.offset().top,
				left:   this.target.offset().left
			});
		}

		this.runtime = {
			progress: 0,
			interval: null
		};

		this.pins = createPins(this.options.spinner);

		this.background = createBackground(this.options.background, this.dimensions);
		this.spinner    = createSpinner(this.options.spinner, this.dimensions, this.pins);

		this.algorithm = algorithmResolver(this.options.algorithm);
		this.algorithmData = null;

		this.effect = effectResolver(this.options.effect);

		this.counter = 0;

		this.update(options.runtime);
	};

	Loading.prototype = (function() {
		/**
		 * Checking runtime options.
		 *
		 * @private
		 * @static
		 */
		var _checkRuntime = function() {
			if ((typeof this.runtime.progress == 'number' && this.runtime.progress >= 100)) {
				_destruct.call(this);
				return;
			}

			if (typeof this.runtime.interval == 'number' && this.runtime.interval != this.actualInterval) {
				this.pause();
				this.resume(this.runtime.interval);
			}
		};

		/**
		 * Deletes Loading instance.
		 *
		 * @private
		 * @static
		 */
		var _destruct = function() {
			clearInterval(this.intervalId);

			// maybe here must apply easeOut fx, then on fx ends, remove all divs
			this.background.remove();

			this.target.removeData('loading');
		};

		return {
			/**
			 * Save reference to the constructor.
			 */
			constructor: Loading,

			/**
			 * Initializes runtime parameters.
			 *
			 * @param options Runtime options
			 */
			update: function(options) {
				options || (options = {});
				$.extend(true, this.runtime, options);
			},

			/**
			 * Shows loading element.
			 */
			show: function() {
				this.background.append(this.spinner).appendTo(this.target);
			},

			/**
			 * Starts animation.
			 */
			start: function(interval)
			{
				this.actualInterval = interval || this.options.spinner.interval;

				if (this.actualInterval > 0x7fffffff) this.actualInterval = 0x7fffffff;

				var loading = this,
					matrix = {x: this.options.spinner.matrix.x, y: this.options.spinner.matrix.y},
					effectInterval = Math.round(this.actualInterval/this.effect.count);

				this.intervalId = setInterval(function() {
					loading.algorithmData = loading.algorithm(matrix, loading.algorithmData);
					loading.effect(loading.pins[loading.algorithmData.x][loading.algorithmData.y], effectInterval, loading.runtime);
					loading.counter++;

					// call private method
					_checkRuntime.call(loading);
				}, this.actualInterval);
			},

			/**
			 * Pauses animation.
			 */
			pause: function()
			{
				clearInterval(this.intervalId);
			},

			/**
			 * Resumes animation.
			 *
			 * @param interval
			 */
			resume: function(interval)
			{
				this.start(interval);
			}
		};
	})();

	/**
	 * Container for algorithm functions.
	 * @type {Object}
	 */
	Loading.algorithm = {};

	/**
	 * Container for effect functions.
	 * @type {Object}
	 */
	Loading.effect    = {};

	/**
	 * jQuery plugin definition.
	 * @param options
	 */
	$.fn.loading = function(options) {
		var loading;

		if (!this.data('loading')) {
			loading = new Loading(this, options);
			this.data({loading: loading});

			loading.show();
			loading.start();
		} else {
			loading = this.data('loading');

			loading.update(options);
		}
	};

	/**
	 * Gives an ability for adding custom algorithms.
	 *
	 * @param {String} name
	 * @param {Function} algorithm
	 */
	$.fn.loading.algorithm = function(name, algorithm) {
		Loading.algorithm[name] = algorithm;
	};

	/**
	 * Gives an ability for adding custom effects.
	 *
	 * @param {String} name
	 * @param {Function} effect
	 */
	$.fn.loading.effect = function(name, effect) {
		Loading.effect[name] = effect;
	};

})(jQuery);


(function($) {
	"use strict";

	$.fn.loading.defaults = {
		opacity:    0.9,
		//speedIn:    300,
		//speedOut:   1000,

		algorithm: 'snake',
		effect:    ['simple'],

		spinner: {
			width:   35,
			height:  35,
			matrix: {
				x: null,
				y: null
			},
			pin: {
				width:  7,
				height: 7,
				margin: {
					top:    1,
					right:  1,
					bottom: 0,
					left:   0
				}
			},
			interval: 100
		},

		background: {
			color:        'white',
			img:          null,
			borderRadius: 1,
			// raw css
			css: {
				opacity: 0.8
			}
		}
	};
})(jQuery);



(function($) {
    "use strict";

    $.fn.loading.algorithm('linear', function(matrix, _) {

    });
}).call(this, jQuery);




(function($) {
    "use strict";

    $.fn.loading.algorithm('random', function(options, _) {
        /*var	inter = 0,
            z = 0;

        while (z < options.matrix.y * options.matrix.x) {
            setTimeout(
                (function(y,x){
                    return function() {
                        effect(pins[y][x]);
                    };
                })(parseInt(Math.floor(Math.random() * (options.matrix.y)), 10),parseInt(Math.floor(Math.random() * (options.matrix.x)), 10)), inter);

            inter+= options.interval;
            z++;
        }*/
    });
}).call(this, jQuery);


(function($) {
    "use strict";

    $.fn.loading.algorithm('snake', (function()
    {
        var axisReverse = function (axis) {
            return axis == 'x' ? 'y' : 'x';
        };

        var checkIsInMatrix = function(x, y, _) {
            var okay = true;

            okay = okay && (_.matrix.x[0] <= x && x <= _.matrix.x[1]);
            okay = okay && (_.matrix.y[0] <= y && y <= _.matrix.y[1]);

            return okay;
        };

        var Path = function(_, reverseAxis, reverseSign, zeroMove) {
            this.x = _.x;
            this.y = _.y;
            this.axis = reverseAxis ? axisReverse(_.axis) : _.axis;
            this.sign = reverseSign ? -1 * _.sign : _.sign;

            if (!zeroMove) {
                this[this.axis]+= this.sign;
            }
        };

        // todo refactor as hash
        var resolvers = [
            function(_) {
                var path = new Path(_, false, false);
                return checkIsInMatrix(path.x, path.y, _) ? path : false;
            },
            function(_) {
                var path = new Path(_, true, true);
                return checkIsInMatrix(path.x, path.y, _) ? path : false;
            },
            function(_) {
                var path = new Path(_, true, false);
                return checkIsInMatrix(path.x, path.y, _) ? path : false;
            },
            function(_) {
                var path = new Path(_, false, true, true);
                return checkIsInMatrix(path.x, path.y, _) ? path : false;
            }
        ];

        var resolvePath = function(_) {
            var path;

            for (var x = 0; x < resolvers.length; x++) {
                path = resolvers[x](_);
                if (path instanceof Path) {
                    return path;
                }
            }

            return false;
        };

        var likeStart = function(path, _) {
            return path.x == _.start.x && path.y == _.start.y;
        };

        var moveMatrix = function(_, sign) {
            var x = [_.matrix.x[0] - sign, _.matrix.x[1] + sign],
                y = [_.matrix.y[0] - sign, _.matrix.y[1] + sign];

            if ((0 <= x[0] && x[0] <= x[1]) && (0 <= y[0] && y[0] <= y[1])) {
                _.matrix.x = x;
                _.matrix.y = y;

                return true;
            }

            return false;
        };

        var moveStart = function(_, sign) {
            var x,y;

            if (sign) {
                x = _.start.x - sign;
                y = _.start.y - sign;
            } else {
                x=  _.x;
                y = _.y;
            }

            if (checkIsInMatrix(x,y,_)) {
                _.start.x = x;
                _.start.y = y;

                return true;
            }

            return false;
        };

        var countPath = function(_) {
            var x = _.matrix.x[1] - _.matrix.x[0],
                y = _.matrix.y[1] - _.matrix.y[0],
                len;

            if (x === 0 && y === 0) {
                return 1;
            } else if (x === 0) {
                len = y + 1;
            } else if (y === 0) {
                len = x + 1;
            } else {
                len = 2 * (x + y);
            }

            return len;
        };

        var reverse = function(_) {
            _.sign *= -1;
            _.reversed *= -1;
        };

        var reset = function(matrix) {
            var _ = {
                x: 0,
                y: 0,

                axis: 'x',
                sign: 1,
                matrix: {
                    x: [0, matrix.x],
                    y: [0, matrix.y]
                },
                path: 0,
                reversed: -1
            };

            _.fullPath = countPath(_);

            return _;
        };

        return function(matrix, _) {

            if (!_) {
                _ = reset(matrix);

                _.path++;
                return _;
            }

            if (_.path == _.fullPath) {
                if (!moveMatrix(_, _.reversed)) {
                    reverse(_);
                    _.path = 0;

                    //_ = reset(matrix);
                    _.path++;
                    return _;
                }

                _.path = 0;
                _.fullPath = countPath(_);
            }

            var resolved = resolvePath(_);

            if (resolved) {
                _.x    = resolved.x;
                _.y    = resolved.y;
                _.axis = resolved.axis;
                _.sign = resolved.sign;

                _.path++;
                return _;
            } else {
                throw new Error('Cant resolve path');
            }
        };

    })());

}).call(this, jQuery);


(function($) {
    "use strict";

    $.fn.loading.effect('fancy', function(pin, interval, runtime) {
        pin
            .css({
                background: "#"+((1<<24)*Math.random()|0).toString(16)
            })
            .animate({width: '-=2', height: '-=2', top: '+=1', left: '+=1'}, interval/2)
            .animate({width: '+=2', height: '+=2', top: '-=1', left: '-=1'}, interval/2);
    });
}).call(this, jQuery);


(function($) {
    "use strict";

    $.fn.loading.effect('jump', function(pin, interval, runtime) {
        var rnd = Math.floor(Math.random() * 7 + 1);
        pin
            .animate({top: '-=' + rnd}, interval/3 * 2)
            .animate({top: '+=' + rnd}, interval/3);
    });
}).call(this, jQuery);


(function($) {
    "use strict";

    $.fn.loading.effect('simple-progress', function(pin, interval, runtime) {
        if (!pin.data('simple-progress-init')) {
            pin
                .css({
                    background: 'green',
                    opacity: runtime.progress/100
                })
                .data('simple-progress-init', true);
        }

        pin
            .data('simple-progress-sign', pin.data('simple-progress-sign') ? false : true)
            .animate({
                opacity: pin.data('simple-progress-sign') ? 1 : runtime.progress/100
            }, interval);
    });
}).call(this, jQuery);


(function($) {
    "use strict";

    $.fn.loading.effect('simple', function(pin, interval, runtime) {
        if (!pin.data('simple-init')) {
            pin
                .css({
                    background: 'green',
                    opacity: 0
                })
                .data('simple-init', true);
        }

        pin
            .data('simple-sign', pin.data('simple-sign') ? false : true)
            .animate({
                opacity: pin.data('simple-sign') ? 1 : 0
            }, interval);
    });
}).call(this, jQuery);