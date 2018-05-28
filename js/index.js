var cube = document.querySelector('.cube');
var currentClass = '';

/*
 * target is either undefined or a value between 1 and 6.
 */
function changeSide(target) {
    var showClass;
    if (target) {
        showClass = 'show-' + target;
    } else {
        showClass = 'show-' + (Math.floor(Math.random() * 6) + 1);
        while (showClass === currentClass || isPairClass(showClass, currentClass)) {
            showClass = 'show-' + (Math.floor(Math.random() * 6) + 1);
        }
    }
    if (currentClass) {
        cube.classList.remove(currentClass);
    }
    cube.classList.add(showClass);
    currentClass = showClass;
}

// set initial side

function randomRoll() {
    var i;
    for (i = 0; i < (Math.floor(Math.random() * 5) + 8); i++) {
        setTimeout(function () {
            changeSide();
        }, i * 250);
    }
    return i;
}

function rollToValue(value) {
    var i = randomRoll();
    i++;
    setTimeout(function() {
       changeSide(value)
    }, i * 250)
}
