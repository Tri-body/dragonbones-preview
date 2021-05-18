export class Signal {

    public memorize: boolean = false
    public active: boolean = true
    private _bindings: SignalBinding[] = []
    private _prevParams: any = null
    private _shouldPropagate: boolean = true

    public validateListener(listener: any, fnName: string): void {
        if (typeof listener !== 'function') {
            throw new Error('listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName))
        }
    }

    private _registerListener(listener: Function, isOnce: boolean, thisObj: any, priority: number): SignalBinding {
        const prevIndex: number = this._indexOfListener(listener, thisObj)
        let binding: SignalBinding
        if (prevIndex !== -1) {
            binding = this._bindings[prevIndex]
            if (binding.isOnce() !== isOnce) {
                throw new Error('You cannot add' + (isOnce ? '' : 'Once') + '() then add' + (!isOnce ? '' : 'Once')
                    + '() the same listener without removing the relationship first.')
            }
        } else {
            binding = new SignalBinding(this, listener, isOnce, thisObj, priority)
            this._addBinding(binding)
        }
        if (this.memorize && this._prevParams) {
            binding.execute(this._prevParams)
        }
        return binding
    }

    private _addBinding(binding: SignalBinding) {
        let n: number = this._bindings.length
        do {
            --n
        } while (this._bindings[n] && binding.priority <= this._bindings[n].priority)
        this._bindings.splice(n + 1, 0, binding)
    }

    private _indexOfListener(listener: Function, thisObj: any): number {
        let n: number = this._bindings.length
        let cur: SignalBinding
        while (n--) {
            cur = this._bindings[n]
            if (cur.getListener() === listener && cur.thisObj === thisObj) {
                return n
            }
        }
        return -1
    }

    public has(listener: Function, thisObj: any = null): boolean {
        return this._indexOfListener(listener, thisObj) !== -1
    }

    public add(listener: Function, thisObj: any = null, priority: number = 0): SignalBinding {
        this.validateListener(listener, 'add')
        return this._registerListener(listener, false, thisObj, priority)
    }

    public addOnce(listener: Function, thisObj: any = null, priority: number = 0): SignalBinding {
        this.validateListener(listener, 'addOnce')
        return this._registerListener(listener, true, thisObj, priority)
    }

    public remove(listener: Function, thisObj: any = null): Function {
        this.validateListener(listener, 'remove')
        const i: number = this._indexOfListener(listener, thisObj)
        if (i !== -1) {
            this._bindings[i]._destroy() // no reason to a SignalBinding exist if it isn't attached to a signal
            this._bindings.splice(i, 1)
        }
        return listener
    }

    public removeAll() {
        let n: number = this._bindings.length
        while (n--) {
            this._bindings[n]._destroy()
        }
        this._bindings.length = 0
    }

    public getNumListeners(): number {
        return this._bindings.length
    }

    public halt() {
        this._shouldPropagate = false
    }

    public dispatch(...paramsArr: any[]) {
        if (!this.active) {
            return
        }
        let n: number = this._bindings.length
        let bindings: SignalBinding[]
        if (this.memorize) {
            this._prevParams = paramsArr
        }
        if (!n) {
            return
        }
        bindings = this._bindings.slice(0)
        this._shouldPropagate = true
        do {
            n--
        } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false)
    }

    public forget() {
        this._prevParams = null
    }

    public dispose() {
        this.removeAll()
        delete this._bindings
        delete this._prevParams
    }

    public toString(): string {
        return '[Signal active:' + this.active + ' numListeners:' + this.getNumListeners() + ']'
    }
}

class SignalBinding {

    public thisObj: any
    public priority: number
    public active: boolean = true
    public params: any[] = null
    private _listener: Function
    private _signal: Signal
    private _isOnce: boolean

    public constructor(signal: Signal, listener: Function, isOnce: boolean, thisObj: any, priority: number = 0) {
        this._listener = listener
        this._isOnce = isOnce
        this.thisObj = thisObj
        this._signal = signal
        this.priority = priority || 0
    }

    public execute(paramsArr?: any): any {
        let handlerReturn: any
        let params: any
        if (this.active && !!this._listener) {
            params = this.params ? this.params.concat(paramsArr) : paramsArr
            handlerReturn = this._listener.apply(this.thisObj, params)
            if (this._isOnce) {
                this.detach()
            }
        }
        return handlerReturn
    }

    public detach() {
        return this.isBound() ? this._signal.remove(this._listener, this.thisObj) : null
    }

    public isBound(): boolean {
        return (!!this._signal && !!this._listener)
    }

    public isOnce(): boolean {
        return this._isOnce
    }

    public getListener() {
        return this._listener
    }

    public getSignal() {
        return this._signal
    }

    public _destroy() {
        delete this._signal
        delete this._listener
        delete this.thisObj
    }

    public toString(): string {
        return '[SignalBinding isOnce:' + this._isOnce + ', isBound:' + this.isBound() + ', active:' + this.active + ']'
    }
}