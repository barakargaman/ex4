// calculator object constructor
var Calculator = function() {
    var that = this;

    this.defaultValue = 0;
    
    this.setDefaultValue = function(value) {
        that.defaultValue = parseInt(value, 10);
    };

    this.add = function(value) {
        that.value += value;
    };

    this.multiply = function(value) {
        that.value *= value;
    };

    this.reset = function() {
        that.value = that.defaultValue;
    };

    this.reset();
};

// calculator user interface object constructor
var CalculatorUI = function(ui) {
    var calculator = new Calculator(),
        input = function() {
            if (ui.input.val() === '') return 0; // if empty input - consider 0
            return parseInt(ui.input.val(), 10);
        };
    // show initialized value
    ui.screen.text(calculator.value);

    // set event handlers
    ui.input.on('keydown', function(e) {
        var key = parseInt(e.which, 10);

        if ($.inArray(key, [8, 46, 37, 39, 35, 36]) > -1) {
            return true; // allowed keys: backspace, delete, left, right, home, end
        }
        if (key >= 48 && key <= 57 && !e.shiftKey) {
            return true; // a digit
        }
        return false; // illegal key
    });

    ui.addButton.on('click', function() {
        calculator.add(input());
        ui.screen.text(calculator.value);
    });

    ui.multiplyButton.on('click', function() {
        calculator.multiply(input());
        ui.screen.text(calculator.value);
    });

    ui.settingsButton.on('click', function() {
        var newDefault = window.prompt('please enter new default value', calculator.defaultValue);
        if (newDefault === null) return false; // user clicked 'cancel'

        // check if positive / negative number by regex
        if (!/^-?\d+$/.test(newDefault)) {
            alert('invalid default value.');
            return false;
        }
        calculator.setDefaultValue(newDefault);
    });

    ui.clearButton.on('click', function() {
        calculator.reset();
        ui.screen.text(calculator.value);
        ui.input.val('');
    });
};

// when dom is loaded
$(document).ready(function() {
    // switch to calculator mode on header form submission
    $('#loginForm').on('submit', function(e) {
        // prevent page reload
        e.preventDefault();

        $form = $(this);

        // validate credentials
        if ('admin' == $form.find('#username').val() && 'admin' == $form.find('#password').val()) {
            var $calculator = $('#calculator');

            // hide page and show calculator
            $('#main').hide();

            // init calculator ui
            new CalculatorUI({
                'addButton': $calculator.find('#addButton'),
                'multiplyButton': $calculator.find('#multiplyButton'),
                'settingsButton': $calculator.find('#settingsButton'),
                'clearButton': $calculator.find('#clearButton'),
                'input': $calculator.find('#input'),
                'screen': $calculator.find('#screen')
            });

            // show calculator
            $calculator.show();
        }
    });
});