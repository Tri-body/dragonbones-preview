export function runEgret(renderMode = 'webgl', audioType = 0) {
  egret.runEgret({
    renderMode,
    audioType,
    calculateCanvasScaleFactor: function (context: any) {
      var backingStore = context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1;
      return (window.devicePixelRatio || 1) / backingStore;
    }
  });
}