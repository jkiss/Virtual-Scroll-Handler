import Hammer from 'hammerjs'
import normalizeWheel from 'normalize-wheel';

export default class VirtualScrollHandler {
    constructor(opt) {
        let options = typeof opt == 'object' ? opt : {};
        this.container = options.container != undefined ? options.container : window;
        this.container.addEventListener('mousewheel', this.updateScrollDeltaValue.bind(this));
        this.container.addEventListener('wheel', this.updateScrollDeltaValue.bind(this));
        this.deltaY = this.currentY = typeof options.startY == 'number' ? options.startY : 0;
        this.lerpAmount = this.lerpAmountScroll = options.lerpAmount != undefined ? options.lerpAmount : .1;
        this.lerpAmountSwipe = options.lerpAmountSwipe != undefined ? options.lerpAmountSwipe : this.lerpAmount * 4;
        this.mobileSensibility = options.mobileSensibility ?? 1;
        this.amp = options.amp > 1 ? options.amp : 1;
        this.triggers = typeof options.triggers == 'object' ? options.triggers : [];
        this.range = typeof options.range != 'object' ? false : options.range;
        this.completion = 0;
        this.scrollbarCreation = typeof options.createScrollbar != 'boolean' ? true : options.createScrollbar;
        this.scrollbarPosition = options.scrollbarPosition || 'right';
        this.scrollbarDirection = ( this.scrollbarPosition == 'top' || this.scrollbarPosition == 'bottom' ) ? 'horizontal' : 'vertical';
        this.swipeStrength = typeof options.swipeStrength == 'number' ? options.swipeStrength : 75;
        this.customScrollbarStyles = typeof options.customScrollbarStyles == 'string' ? options.customScrollbarStyles : false;
        this.fadeOutDelay = typeof options.fadeOutDelay == 'number' ? options.fadeOutDelay : false;
        this.fadeOutTimeout;
        this.active = true;
        this.handleSize = typeof options.handleSize == 'number' ? options.handleSize : .1;
        this.distanceToScroll = - (100 * (this.handleSize-1)) / this.handleSize;
        const hammer = new Hammer.Manager(document.body, { inputClass: Hammer.TouchInput });
        hammer.add( new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }) );
        hammer.on('pan', this.updateSwipeDeltaValue.bind(this));

        if (this instanceof VirtualScrollHandler) {
            if (typeof VirtualScrollHandler[VirtualScrollHandler.instanceCounter] != 'number') VirtualScrollHandler[VirtualScrollHandler.instanceCounter] = 0;
            else VirtualScrollHandler[VirtualScrollHandler.instanceCounter]++;
        }        
        this.instanceId = VirtualScrollHandler[VirtualScrollHandler.instanceCounter];     
        
        this.lerpAnimation = true;
        if (this.scrollbarCreation) this.createScrollbar();
    }

    createScrollbar() {
        let styleTag = document.createElement('style');
        styleTag.id = `virtual-scroll-handler-${this.instanceId}`;
        styleTag.innerHTML = /* css */`.vsh-scrollbar-${this.instanceId} {
            position: fixed;
            ${ this.scrollbarPosition == 'bottom' ? 'bottom' : 'top' }: 10px;
            ${ this.scrollbarPosition == 'left' ? 'left' : 'right' }: 10px;
            ${ this.scrollbarDirection == 'vertical' ? 'height' : 'width' }: calc(100% - 20px);
            ${ this.scrollbarDirection == 'vertical' ? 'width' : 'height' }: 2px;
            background: #333333;
            mix-blend-mode: difference;
            z-index: 10000;
        }

        .vsh-scrollbar-${this.instanceId}--out {
            opacity: 0;
            transition: .5s opacity linear;
        }

        .vsh-scrollbar__handle-${this.instanceId} {
            position: absolute;
            ${ this.scrollbarDirection == 'vertical' ? 'width' : 'height' }: 300%;
            ${ this.scrollbarDirection == 'vertical' ? 'height' : 'width' }: ${this.handleSize * 100}%;
            ${ this.scrollbarDirection == 'vertical' ? 'top' : 'left' }: 0;
            ${ this.scrollbarDirection == 'vertical' ? 'left' : 'top' }: -100%;
            cursor: grab;
        }

        .vsh-scrollbar__handle-${this.instanceId}:after{
            content: '';
            position: absolute;
            background: white;
            ${ this.scrollbarDirection == 'vertical' ? 'width' : 'height' }: 33.33%;
            ${ this.scrollbarDirection == 'vertical' ? 'height' : 'width' }: 100%;
            ${ this.scrollbarDirection == 'vertical' ? 'top' : 'left' }: 0;
            ${ this.scrollbarDirection == 'vertical' ? 'left' : 'top' }: 33.33%;
        }`; 

        if (this.customScrollbarStyles) {
            styleTag.innerHTML += this.customScrollbarStyles;
        }

        document.head.appendChild(styleTag);

        let scrollbarTag = document.createElement('div');
        scrollbarTag.id = `vsh-scrollbar-${this.instanceId}`;
        scrollbarTag.classList.add(`vsh-scrollbar-${this.instanceId}`);
        if (this.fadeOutDelay) {
            scrollbarTag.classList.add(`vsh-scrollbar-${this.instanceId}--out`);
        }
        document.body.appendChild(scrollbarTag);
        
        let handleTag = document.createElement('div');
        handleTag.id = `vsh-scrollbar__handle-${this.instanceId}`;
        handleTag.classList.add(`vsh-scrollbar__handle-${this.instanceId}`);
        scrollbarTag.appendChild(handleTag);

        this.domElements = {
            scrollbar: scrollbarTag,
            handle: handleTag
        }

        setTimeout(function(){
            this.handleDrag();

            this.domElements.scrollbar.addEventListener('mouseenter', () => {
                this.domElements.scrollbar.classList.remove(`vsh-scrollbar-${this.instanceId}--out`);
                clearTimeout(this.fadeOutTimeout);
            });
            this.domElements.scrollbar.addEventListener('mouseleave', () => {
                this.resetFadeOutTimeout();
            });
        }.bind(this), 100);
    }

    handleDrag() {
        let position = {prevY:0, y:0};
        let hammertime = new Hammer(this.domElements.handle);
        let windowSize = this.getWindowSize();
        window.addEventListener('resize', function() {
            windowSize = this.getWindowSize();
        }.bind(this));
        
        let window_axis = this.scrollbarDirection == 'vertical' ? 1 : 0;
        let delta_axis = this.scrollbarDirection == 'vertical' ? 'deltaY' : 'deltaX';

        this.domElements.handle.addEventListener('mousedown', () => {
            this.preventFadeOut = true;
        });

        window.addEventListener('mouseup', () => {
            this.preventFadeOut = false;
            this.resetFadeOutTimeout();
        });

        hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        hammertime.on('panstart', function() {
            if (!this.active) return; 

            this.lerpAnimation = false;
            position.prevY = this.currentY / this.range[1] * windowSize[window_axis];
        }.bind(this));

        hammertime.on('pan', function(evt) {
            if (!this.active) return;

            position.y = position.prevY + evt[delta_axis];
            position.y = clamp(position.y, 0, windowSize[window_axis]);
            
            this.currentY = this.deltaY = position.y / windowSize[window_axis] * this.range[1];

            this.domElements.handle.style.transform = `translateY(${position.y / windowSize[window_axis] * this.distanceToScroll}%)`;
        }.bind(this));
        
        hammertime.on('panend', function() {
            if (!this.active) return;
            
            this.lerpAnimation = true;
        }.bind(this));
    }

    getWindowSize() {
        return [ window.innerWidth, window.innerHeight ];
    }

    updateScrollDeltaValue(evt) {
        if (!this.active) return;

        let newDeltaY;
        // deltaMode 0 => pixel value
        // deltaMode 1 => lines value
        //let tDeltaY = evt.deltaMode == 0 ? evt.deltaY : evt.deltaY * 35;
        let pixelRatio = window.devicePixelRatio || 1;
        let evtDeltaY = (normalizeWheel(evt).pixelY / pixelRatio) * this.amp;
        if (this.range) {
            newDeltaY = clamp((this.deltaY + evtDeltaY), this.range[0], this.range[1]);
        } else {
            newDeltaY = this.deltaY + evtDeltaY;
        }
        this.deltaY = newDeltaY;
        this.lerpAmount = this.lerpAmountScroll;

        this.resetFadeOutTimeout();
    }

    resetFadeOutTimeout() {
        if (this.fadeOutDelay && this.scrollbarCreation) {
            this.domElements.scrollbar.classList.remove(`vsh-scrollbar-${this.instanceId}--out`);
            clearTimeout(this.fadeOutTimeout);
            this.fadeOutTimeout = setTimeout(() => {
                if ( !this.preventFadeOut ) {
                    this.domElements.scrollbar.classList.add(`vsh-scrollbar-${this.instanceId}--out`);
                }
            }, this.fadeOutDelay);
        }
    }

    updateSwipeDeltaValue(ev) {  
        if (!this.active) return;

        if (this.fadeOutTimeout && this.scrollbarCreation) {
            this.domElements.scrollbar.classList.remove(`vsh-scrollbar-${this.instanceId}--out`);
            clearTimeout(this.fadeOutTimeout);
        }

        let newDeltaY;
        if (this.range) {
            newDeltaY = clamp((this.deltaY + this.swipeStrength * -ev.velocityY * this.mobileSensibility * this.amp), this.range[0], this.range[1]);
        } else {
            newDeltaY = this.deltaY + this.swipeStrength * -ev.velocityY * this.mobileSensibility * this.amp;
        }
        this.deltaY = newDeltaY;
        this.lerpAmount = this.lerpAmountSwipe;

        if (this.fadeOutDelay && this.scrollbarCreation) {
            this.fadeOutTimeout = setTimeout(() => {
                this.domElements.scrollbar.classList.add(`vsh-scrollbar-${this.instanceId}--out`);
            }, this.fadeOutDelay);
        }
    }

    update() {
        let newY;
        if (this.lerpAnimation) {
            newY = lerp (this.currentY, this.deltaY, this.lerpAmount);
        } else {
            newY = this.deltaY;
        }
        this.currentY = Math.round(newY * 100) / 100;
        
        this.checkTriggers();
        this.updateCompletion();
        
        if (this.scrollbarCreation) {
            if (this.scrollbarPosition == 'left' || this.scrollbarPosition == 'right') {
                this.domElements.handle.style.transform = 'translate3d(0,'+(this.completion * this.distanceToScroll)+'%,0)';
            } else {
                this.domElements.handle.style.transform = 'translate3d('+(this.completion * this.distanceToScroll)+'%,0,0)';
            }
        }
    }

    checkTriggers() {
        this.triggers.forEach(trigger => {                        
            if (trigger.condition == '>y' || trigger.condition == undefined) {
                if (this.currentY >= trigger.y && !trigger.triggered) {
                    trigger.callback();
                    trigger.triggered = true;
                }
                if (this.currentY < trigger.y && trigger.triggered && !trigger.once) {
                    trigger.triggered = false;
                }
            }
            else if (trigger.condition == '<y') {
                if (this.currentY <= trigger.y && !trigger.triggered) {
                    trigger.callback();
                    trigger.triggered = true;
                }
                if (this.currentY > trigger.y && trigger.triggered && !trigger.once) {
                    trigger.triggered = false;
                }
            }
        });
    }

    updateCompletion() {
        if (this.range) this.completion = (this.currentY - this.range[0]) / (this.range[1] - this.range[0]);
    }

    goTo(distance, animated = true) {
        if (animated) this.deltaY = distance;
        else {
            this.lerpAnimation = false;
            this.deltaY = distance;
            setTimeout(() => {
                this.lerpAnimation = true;
            }, 50); /* need to fix that */
        }
    }
}

function lerp (start, end, amt){
    return (1-amt)*start+amt*end;
}

function clamp(num, min, max) {
    return num <= min ? min : num >= max ? max : num;
}