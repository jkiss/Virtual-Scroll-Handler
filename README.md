# virtual-scroll-handler

Allows you to handle scroll events in order to trigger and control animations, without having to deal with an actual DOM scrolling.
This class creates a virtual scrollbar and is mobile friendly. 

See it in action: https://thibautfoussard.com/

# Install

```bash
npm i virtual-scroll-handler
```

# Hello world

```javascript
import virtualScrollHandler from 'virtual-scroll-handler'

let scroller = new virtualScrollHandler({
    range: [0, 2000],
    triggers: [{
        y: 1000,
        callback: () => {
            console.log("Callback triggered");
        }
    }]
});

(function loop() {
    requestAnimationFrame(loop);
    scroller.update();
})();
```

# Options

## range[min, max]
Min & max deltaY.  
A single mouse scroll down event will typically increment the deltaY by 100, so a range from 0 to 2000 implies 20 scroll events to hit the bottom of the virtual scrollbar.

## startY
Y starting position within the provided range.  
Default is 0.

## lerpAmount
For each iteration of the linear interpolation, the amount to interpolate between the mouse position and the camera position. A smaller value will make the animation smoother.  
Default is .1  
Must be set between 0 and 1.

## lerpAmountSwipe
Similar to `lerpAmount` but only affects swipe gestures for mobile devices.
Default is lerpAmount * 4.  

## mobileSensibility
Controls the strength of a swipe on mobile devices.  
Default is 1.

## createScrollbar
Boolean.  
Will add a scrollbar in the DOM, before the closing `</body>` tag.  
Default is true.

## scrollbarPosition
Defines the position of the scrollbar in the window.  
Possible values are 'top', 'bottom', 'left' and 'right'.  
Default is 'right'.  


## customScrollbarStyles
String.  
Only active if `createScrollbar` is set to true.  
Adds custom css styles to the DOM.  
Note: Instances of virtual-scroll-handler are indexed with unique IDs starting from 0. This ID is referenced in the name of DOM classes and ids.  
Example: 
```javascript
const scrollHandler = new virtualScrollHandler({
    range: [0, 1000],
    customScrollbarStyles: `.vsh-scrollbar-0 {  /* <- this is the first instance, so the id is 0 */
            ...
        }`
});
```

## fadeOutDelay
Time in ms after which the scrollbar will fadeout once it has stopped moving.
Default is false.

## handleSize
Size of the scroll bar handle in percent of the viewport height.
Default is .1, since by default, the handle take 10% of the viewport height.

## triggers
Array of objects.  
This is where you declare when and what is going to happen.  
Each trigger is an object made of these options:

### y
The deltaY value which will trigger the action when reached.

### condition
Default is `>y`, meaning that the callback is triggered when the current virtual scroll position is above the `y` trigger value.

### callback
The callback function to trigger.

### once
Default is false.  
If set to true, the callback function will only be triggered once.


# Properties

## .completion
Returns a number between 0 and 1.

```javascript
let scroller = new scrollHandler({
    range: [0, 2000]
});

console.log(scroller.completion);
```

## active
Default is true.  
If set to false, the scroll is disabled.

## domElements
An object containing:  
.scrollbar: the DOM element of the whole scrollbar and its children  
.handle: the part of the scrollbar that moves vertically

```javascript
scroller.domElements.scrollbar.style.opacity = 0;
```

# Methods

## goTo( distance: number, animated: bool) 
Scroll to a point in the range of the scroller.  
The 'animated' parameter makes the scroll instant or animated. Default is true.
```javascript
scroller.goTo( 500, false );
```

# Example
```javascript
import scrollHandler from 'virtual-scroll-handler'

new scrollHandler({
    range: [0, 2000],
    startY: 0,
    triggers: [{
        y: 1000,
        condition: '<y',
        callback: () => {
            console.log("Callback triggered");
        },
        once: true
    }],
    createScrollbar: true,
    customScrollbarStyles: `.vsh-scrollbar { mix-blend-mode: difference; }`,
    fadeOutDelay: 500
});

(function loop() {
    requestAnimationFrame(loop);
    scroller.update();
    console.log(scroller.completion);
})();
```