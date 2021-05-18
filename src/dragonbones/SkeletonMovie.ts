import { Signal } from "./Signal";
import { SkeletonUtil } from "./SkeletonUtil";

export class SkeletonMovie extends egret.DisplayObjectContainer {

	static readonly SK_NAME_PREFIX: String = "armatures/skeleton_movie_";
	static readonly SK_MOVEMENT_PREFIX: String = "movie_";

	private _armature: dragonBones.Armature;
	private _movementList: string[];
	private _curtMovement: string;
	private _childArmatureList: dragonBones.Armature[];
	private _time: number = 0;
	private _pass: number;
	private _display: dragonBones.EgretArmatureDisplay;
	private _delay: number = 40
	private _onComplete: Signal
	private _backStart: boolean = false

	public constructor(armature: dragonBones.Armature) {
		super();
		this._armature = armature;
		this._onComplete = new Signal()
		this.initArmature();
	}

	public initArmature(): void {
		if (!this._armature) {
			return;
		}
		this._display = this._armature.display;
		this._display.disableBatch()
		this.addChild(this._display);
		this._movementList = this._armature.animation.animationNames.concat();
		this._curtMovement = this._movementList[0];
		this._childArmatureList = SkeletonUtil.getChildArmature(this._armature, false);
		this._display.addDBEventListener(dragonBones.EventObject.COMPLETE, this.completeHandler, this);
	}

	private completeHandler(): void {
		// console.log('complete')
		this.stop(this._backStart);
		this._onComplete.dispatch()
	}

	public play(loop: number = 0, delay: number = 40, backStart: boolean = false): void {
		if (!this._armature || this._armature.animation.isPlaying) {
			return;
		}
		this._delay = delay > 0 ? delay : 40
		this._backStart = backStart;
		loop = Math.abs(loop);
		this._time = 0;
		egret.startTick(this.onTick, this);
		this._armature.animation.play(this._curtMovement, loop);
		for (let i = 0, l = this._childArmatureList.length; i < l; ++i) {
			if (this._childArmatureList[i].animation.animationNames.indexOf(this._curtMovement) >= 0) {
				this._childArmatureList[i].animation.play(this._curtMovement, loop);
			}
		}
	}

	public stop(backStart: boolean = true): void {
		if (!this._armature) {
			return;
		}
		egret.stopTick(this.onTick, this);
		if (backStart) {
			this._armature.animation.play(this._curtMovement);
			for (let i = 0, l = this._childArmatureList.length; i < l; ++i) {
				if (this._childArmatureList[i].animation.animationNames.indexOf(this._curtMovement) >= 0) {
					this._childArmatureList[i].animation.play(this._curtMovement);
				}
			}
			this._armature.advanceTime(0);
			for (let i = 0, l = this._childArmatureList.length; i < l; ++i) {
				this._childArmatureList[i].advanceTime(0);
			}
		}
		this._armature.animation.stop();
		for (let i = 0, l = this._childArmatureList.length; i < l; ++i) {
			this._childArmatureList[i].animation.stop();
		}
	}

	private onTick(timeStamp: number): boolean {
		if (!this._armature) {
			return false;
		}
		if (!this._time) {
			this._time = timeStamp;
		}
		this._pass = timeStamp - this._time;
		if (this._pass < this._delay) {
			return false;
		}
		this._time = timeStamp;
		let passedTime = this._pass / 1000;
		this._armature.advanceTime(passedTime);
		const len = this._childArmatureList ? this._childArmatureList.length : -1;
		for (let i = 0; i < len; ++i) {
			this._childArmatureList[i].advanceTime(passedTime);
		}
		return false;
	}

	public get isPlaying(): boolean {
		return this._armature.animation.isPlaying;
	}

	public get timeScale(): number {
		return this._armature.animation.timeScale;
	}

	public set timeScale(val: number) {
		this._armature.animation.timeScale = val;
	}

	public get armatrue(): dragonBones.Armature {
		return this._armature;
	}

	public get movementList(): string[] {
		return this._movementList;
	}

	public get curtMovement(): string {
		return this._curtMovement;
	}

	public set curtMovement(val: string) {
		if (this._movementList.indexOf(val) != -1) {
			this._curtMovement = val;
			this.stop();
		}
	}

	public dispose(): void {
		this.stop(false);
		if (this._display) {
			this._display.removeDBEventListener(dragonBones.EventObject.COMPLETE, this.completeHandler, this)
			this._display = null;
		}
		if (this._armature) {
			this._armature.dispose();
			this._armature = null;
		}
		if (this._childArmatureList) {
			this._childArmatureList.length = 0;
			this._childArmatureList = null;
		}
		if (this._onComplete) {
			this._onComplete.dispose()
		}
		this._movementList = null;
	}

	public clearFadeInTime(): void {
		for (let i = 0, l = this._childArmatureList.length; i < l; ++i) {
			SkeletonUtil.clearAnimationFadeInTime(this._childArmatureList[i].animation);
		}
		SkeletonUtil.clearAnimationFadeInTime(this._armature.animation);
	}

	public setChildArmatureLoop(loop: number): void {
		for (let i = 0, len = this._childArmatureList.length; i < len; ++i) {
			SkeletonUtil.setAnimationLoop(this._childArmatureList[i].animation, loop);
		}
	}

	public get armatureName(): string {
		if (this._armature) {
			return this._armature.name
		}
		return null
	}

	public get display(): dragonBones.EgretArmatureDisplay {
		return this._display;
	}

	public get onComplete(): Signal {
		return this._onComplete
	}

	public get displayWidth(): number {
		return this._display ? this._display.width * this.scaleX : 0
	}

	public get displayHeight(): number {
		return this._display ? this._display.height * this.scaleY : 0
	}
}