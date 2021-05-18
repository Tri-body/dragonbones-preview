import { DragonBonesItem } from "./dragonbones/DragonBonesItem";
import { SkeletonMovie } from "./dragonbones/SkeletonMovie";
import { GUI } from 'dat.gui'

export class App extends egret.DisplayObjectContainer {

    private _item: DragonBonesItem;
    private _movie: SkeletonMovie;
    private _bg: egret.Bitmap;
    private _movieMap: { [key: string]: SkeletonMovie };
    private _isLoading: boolean;
    private _armatures: string[];
    private _movements: string[];
    private _curtArmature: string;
    private _isLoop: boolean = true;
    private _toV3: boolean = true;
    private _backStart: boolean = true;
    private _stageBg: egret.Shape

    private _playCtrl: dat.GUIController
    private _armaturesCtrl: dat.GUIController
    private _movementsCtrl: dat.GUIController
    private _scaleCtrl: dat.GUIController
    private _typeCtrl: dat.GUIController
    private _sizeCtrl: dat.GUIController

    constructor() {
        super()
        this.once(egret.Event.ADDED_TO_STAGE, this.addToStage, this)
    }

    private addToStage() {
        document.ondragover = document.ondrop = (e) => {
            e.preventDefault();
        }
        document.body.ondrop = (e) => {
            e.preventDefault();
            this.loadFile(e.dataTransfer.files[0]);
        }
        this.initUI();
        this.initVscEx();
    }

    private initUI() {
        const gui = new GUI({ width: 250 })
        const controls = {
            btnPlay: this.clickBntPlay.bind(this),
            armatures: null,
            movements: null,
            loop: true,
            back: true,
            scale: 1,
            mask: false,
            fps: this.showFps.bind(this),
            setFps: 60,
            bgColor: '#000000',
            type: '',
            size: '',
            toV3: false

        }
        this._playCtrl = gui.add(controls, 'btnPlay').name('播放')
        this._armaturesCtrl = gui.add(controls, 'armatures', []).name('骨架').onChange(this.onArmatureChange.bind(this))
        this._movementsCtrl = gui.add(controls, 'movements', []).name('动作').onChange(this.onMovementChange.bind(this))
        gui.add(controls, 'loop').name('循环').onChange(this.changeLoop.bind(this))
        gui.add(controls, 'back').name('返回').onChange(this.changeBackStart.bind(this))
        this._scaleCtrl = gui.add(controls, 'scale', 0.1, 2, 0.1).name('缩放').onChange(this.changeScale.bind(this))
        gui.add(controls, 'mask').name('遮罩').onChange(this.changeMask.bind(this))
        gui.add(controls, 'fps').name('显示FPS')
        gui.add(controls, 'setFps', 1, 60, 1).name('设置FPS').onChange(this.setFps.bind(this))
        this._typeCtrl = gui.add(controls, 'type').name('格式')
        this._sizeCtrl = gui.add(controls, 'size').name('尺寸')
        gui.addColor(controls, 'bgColor').name('底色').onChange(this.changeStageBgClr.bind(this))
        gui.add(controls, 'toV3').name('转换V3').onChange(this.setV3.bind(this))

        document.onkeydown = (e: KeyboardEvent) => {
            if (!this._movie) return false
            if (e.key === 'w' || e.key === 'ArrowUp') {
                this.moveY(-10)
            } else if (e.key === 's' || e.key === 'ArrowDown') {
                this.moveY(10)
            } else if (e.key === 'a' || e.key === 'ArrowLeft') {
                this.moveX(-10)
            } else if (e.key === 'd' || e.key === 'ArrowRight') {
                this.moveX(10)
            }
        }

        this._stageBg = new egret.Shape()
        this.changeStageBgClr('#000000')
        this.addChildAt(this._stageBg, 0)
        this.stage.addEventListener(egret.Event.RESIZE, this.onResize, this)
        this.onResize()
    }

    private initVscEx() {
        if (typeof window['acquireVsCodeApi'] === 'function') {
            var vscode = window['acquireVsCodeApi']()
            window.addEventListener('message', event => {
                const data = event.data || {}
                switch (data.type) {
                    case 'select_file':
                        this.loadUrl(data.uri, 'preview')
                        break;
                    default:
                        break;
                }
            })
            vscode.postMessage({
                type: 'onload'
            })
        }
    }

    private moveX(val: number) {
        if (this._movie) {
            this._movie.x += val
        }
    }

    private moveY(val: number) {
        if (this._movie) {
            this._movie.y += val
        }
    }

    private setV3(val: boolean) {
        this._toV3 = val
    }

    private setFps(val: number) {
        this.stage.frameRate = val
    }

    private onResize(): void {
        this.x = (this.stage.stageWidth - 1024) * 0.5
        this.scaleX = this.scaleY = Number(this._scaleCtrl.getValue())
    }

    private changeMask(val: boolean) {
        if (val) {
            this.mask = new egret.Rectangle(0, 0, 1024, 768)
        } else {
            this.mask = null
        }
    }

    private changeStageBgClr(val: string) {
        this._stageBg.graphics.beginFill(parseInt(val.replace('#', ''), 16))
        this._stageBg.graphics.drawRect(0, 0, 1024, 768)
        this._stageBg.graphics.endFill()
    }

    private changeBackStart(value: boolean) {
        this._backStart = value
    }

    private updateInfo(info: string) {
        this._sizeCtrl.setValue(info || '')
    }

    private changeScale(value: number) {
        if (this._movie) {
            this._movie.scaleX = this._movie.scaleY = value
            this.updateInfo(`宽: ${this._movie.displayWidth.toFixed(0)}, 高: ${this._movie.displayHeight.toFixed(0)}`)
        } else {
            this.updateInfo('')
        }
        if (this._bg) {
            this._bg.scaleX = this._bg.scaleY = value
        }
    }

    private changeLoop(value: boolean) {
        this._isLoop = value
        this.stopCurtMovie()
    }

    private clickBntPlay() {
        if (this._movie) {
            if (this._movie.isPlaying) {
                this.stopCurtMovie()
            } else {
                this.playCurtMovie()
            }
        }
    }

    private onArmatureChange(val: string) {
        this._curtArmature = val
        this.refreshCurtMovie()
    }

    private onMovementChange(val: string) {
        if (this._movie) {
            this._movie.curtMovement = val
            this.stopCurtMovie()
        }
    }

    private updateSelectOptions(ctrl: dat.GUIController, list: string[]): void {
        if (!ctrl || !ctrl['__select'] || !list) {
            return;
        }
        let option: HTMLOptionElement;
        ctrl['__select'].options.length = 0;
        for (const value of list) {
            option = document.createElement('option');
            option.text = value;
            ctrl['__select'].add(option);
        }
    }

    private loadUrl(url: string, name: string): void {
        if (!this._isLoading && url) {
            this._isLoading = true;
            this.cleanFile()
            App.loadBinary(url).then(result => {
                this._isLoading = false
                this.realCreate(result, name).catch(reason => {
                    console.error(reason)
                })
            }).catch(reason => {
                this._isLoading = false
                console.error(reason);
            })
        }
    }

    private loadFile(file: File): void {
        if (!this._isLoading && file) {
            this._isLoading = true;
            this.cleanFile()
            const reader = new FileReader();
            reader.onload = (e: Event) => {
                this._isLoading = false
                this.realCreate(reader.result as ArrayBuffer, file.name).catch(reason => {
                    console.error(reason)
                })
            };
            reader.onerror = (e: Event) => {
                this._isLoading = false
                console.error('' + e);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    private cleanFile(): void {
        this.removeCurtMovie()
        if (this._movieMap) {
            for (const name in this._movieMap) {
                if (this._movieMap[name]) {
                    this._movieMap[name].dispose();
                }
            }
            this._movieMap = null
        }
        if (this._bg) {
            if (this.contains(this._bg)) {
                this.removeChild(this._bg)
            }
            const texture = this._bg.texture
            this._bg.texture = null
            texture.dispose()
            this._bg = null
        }
        this._scaleCtrl.setValue(1)
        if (this._item) {
            this._item.dispose()
            this._item = null
        }
        this.onResize()
    }

    private async realCreate(zipBin: ArrayBuffer, name: string) {
        this._item = new DragonBonesItem()
        await this._item.init(zipBin, name, this._toV3)
        this._typeCtrl.setValue(this._item.rawVersion)
        this._armatures = this._item.getArmatureNames()
        this.updateSelectOptions(this._armaturesCtrl, this._armatures)
        let movie: SkeletonMovie
        this._movieMap = {};
        let armature: string;
        this._curtArmature = null;
        for (armature of this._armatures) {
            if (!this._curtArmature && (armature.indexOf('main') > -1 || armature.indexOf('skeleton_movie_1') > -1)) {
                this._curtArmature = armature;
                // this._armaturesCtrl['__select'].selectedIndex = this._armatures.indexOf(armature)
                this._armaturesCtrl.setValue(armature)
            }
            movie = this._item.createMovie(armature);
            if (movie) {
                this._movieMap[armature] = movie;
                movie.clearFadeInTime()
                movie.stop()
            }
        }
        if (!this._curtArmature) {
            this._curtArmature = armature;
            // this._armaturesCtrl['__select'].selectedIndex = this._armatures.indexOf(armature)
            this._armaturesCtrl.setValue(armature)
        }
        this.refreshCurtMovie()
    }

    private refreshCurtMovie(): void {
        if (!this._movie || this._movie.armatureName !== this._curtArmature) {
            this.removeCurtMovie();
            this._movie = this._movieMap[this._curtArmature];
            if (this._movie) {
                this.updateSelectOptions(this._movementsCtrl, this._movie.movementList)
                this.addChild(this._movie);
                this.changeScale(1.0)
            }
        }
    }

    private removeCurtMovie(): void {
        this.stopCurtMovie();
        if (this.contains(this._movie)) {
            this.removeChild(this._movie);
        }
        this._movie = null
    }

    private playCurtMovie(): void {
        if (this._movie) {
            // if (this._isLoop) {
            //     this._movie.play(0, 40, this._backStart);
            // } else {
            this._movie.onComplete.add(this.onPlayComplete, this)
            this._movie.play(1, 40, this._backStart);
            // }
            this._playCtrl.name('停止')
        }
    }

    private onPlayComplete(): void {
        if (this._isLoop) {
            this._movie.play(1, 40, this._backStart);
        } else {
            this._movie.onComplete.remove(this.onPlayComplete, this)
            this._playCtrl.name('播放')
        }
    }

    private stopCurtMovie(): void {
        if (this._movie) {
            this._movie.stop(true);
            this._movie.onComplete.remove(this.onPlayComplete, this)
            this._playCtrl.name('播放')
        }
    }

    static loadBinary(url: string) {
        return new Promise<ArrayBuffer>(function (resolve: Function, reject: Function) {
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.responseType = 'arraybuffer'
            xhr.onload = function () {
                xhr.onload = undefined
                xhr.onerror = undefined
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response)
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText
                    })
                }
            }
            xhr.onerror = function () {
                xhr.onload = undefined
                xhr.onerror = undefined
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                })
            }
            xhr.send()
        })
    }

    static parseResUrl(prefix: string, name: string): string {
        if (!prefix || !name) {
            return name
        }
        return prefix + name.substring(0, 3) + '/' + name + '/1024x768/skeleton.zip'
    }

    static getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    showFps(): void {
        const list = document.querySelectorAll('.egret-player')
        if (list && list[0] && list[0]['egret-player']) {
            list[0]['egret-player'].player.displayFPS(true, undefined, undefined, { bgAlpha: '0.3', size: 12, textColor: '0xffffff', x: 1, y: 1 })
        }
    }
}