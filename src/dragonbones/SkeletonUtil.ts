export class SkeletonUtil {

  private static readonly MOVEMENTID_UNNAMED: string = "unnamed";

  /**
   * 查找一个骨架所包含的所有骨架 
   * @param armature 第一级骨架
   * @param containSelf 包括自身
   * @param ignoreUnnamed 忽略未命名动作的骨架
   */
  public static getChildArmature(armature: dragonBones.Armature, containSelf: boolean = true, ignoreUnnamed: boolean = true): dragonBones.Armature[] {
    let result: dragonBones.Armature[] = containSelf ? [armature] : [];
    for (let slot of armature.getSlots()) {
      if (slot.childArmature && (!ignoreUnnamed || slot.childArmature.animation.lastAnimationName != this.MOVEMENTID_UNNAMED)) {
        // egret.log(slot.name);
        result = result.concat(this.getChildArmature(slot.childArmature, true, ignoreUnnamed));
      }
    }
    return result;
  }

  /**
   * 将一个骨架的动作混合时间清零，用来避免动作切换之间的回放补间
   */
  public static clearAnimationFadeInTime(animation: dragonBones.Animation): void {
    if (!animation) {
      return;
    }
    for (let name of animation.animationNames) {
      animation.animations[name].fadeInTime = 0;
    }
  }

  /**
   * 设置是否自动补间
   */
  public static setAutoTween(rawData: any, enable: boolean): void {
    if (!rawData || Number(rawData['version']) >= 4) {
      return;
    }
    if (rawData && Array.isArray(rawData['armature'])) {
      rawData['armature'].forEach((armature: any) => {
        if (Array.isArray(armature['animation'])) {
          armature['animation'].forEach((animation: any) => {
            if ('autoTween' in animation) {
              animation['autoTween'] = enable;
            }
          });
        };

      });
    }
  }

  /**
   * 设置一个骨架的循环播放次数
   * @param palyTimes Loop(0:loop forever, 1~+∞:loop times, -1~-∞:will fade animation after loop complete).
   */
  public static setAnimationLoop(animation: dragonBones.Animation, playTimes: number): void {
    if (!animation) {
      return;
    }
    animation.animationConfig.playTimes = playTimes;
    animation.lastAnimationState.playTimes = playTimes; //build childArmature 会产生lastAnimationState，这个值也要改
    for (let name of animation.animationNames) {
      animation.animations[name].playTimes = playTimes;
    }
  }
}