import { Injectable, NgZone, OnDestroy } from '@angular/core';

@Injectable()
export class SessionTimeoutService implements OnDestroy {
    private timeoutId: any;
    private idleTime = 15 * 60 * 1000;
    private onTimeoutCallback: () => void = () => { };

    constructor(private ngZone: NgZone) { }

    start(onTimeout: () => void, idleTime: number = this.idleTime): void {
        this.idleTime = idleTime;
        this.onTimeoutCallback = onTimeout;
        this.setupTimer();
        this.setupActivityListeners();
    }

    private setupTimer(): void {
        this.ngZone.runOutsideAngular(() => {
            this.clearTimer();
            this.timeoutId = setTimeout(() => { this.ngZone.run(() => this.triggerTimeout()); }, this.idleTime);
        });
    }

    private setupActivityListeners(): void {
        const resetTimer = this.resetTimer.bind(this);
        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((event) => window.addEventListener(event, resetTimer, true));
    }

    private resetTimer(): void {
        this.setupTimer();
    }

    private triggerTimeout(): void {
        if (this.onTimeoutCallback) { this.onTimeoutCallback(); }
    }

    private clearTimer(): void {
        if (this.timeoutId) { clearTimeout(this.timeoutId); }
    }

    ngOnDestroy(): void {
        this.clearTimer();
        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach((event) => window.removeEventListener(event, this.resetTimer, true));
    }
}
