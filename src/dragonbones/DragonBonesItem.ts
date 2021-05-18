import { Asset } from "./Asset";
import { SkeletonMovie } from "./SkeletonMovie";
import { SkeletonUtil } from "./SkeletonUtil";
import { DragonBonesXmlUtil, dbToNew } from 'dragonbones-converter'
import * as JSZip from 'jszip'

export class DragonBonesItem {

  private _skeletonJson: any;
  private _textureJson: any;
  private _textureBmd: egret.BitmapData;
  private _factory: dragonBones.EgretFactory;
  private _key: string;
  private _data: dragonBones.DragonBonesData
  private _version: string
  private _isBinData: boolean

  public async init(zipRawData: any, key: string, toV3: boolean = false) {
    this.dispose();
    this._key = key;
    const zip = await JSZip.loadAsync(zipRawData);

    let zipObj: JSZip.JSZipObject

    //texture data
    if (zipObj = zip.file(Asset.TEXTURE_JSON) || this.findFileBySuffix(zip, Asset.TEX_JSON)) {
      const texJsonStr = await zipObj.async('text')
      this._textureJson = JSON.parse(texJsonStr);
    } else if (zipObj = zip.file(Asset.TEXTURE_XML)) {
      const texXmlStr = await zipObj.async('text')
      this._textureJson = DragonBonesXmlUtil.parseXmlStrToJson(texXmlStr)
    }

    //skelton data
    if (zipObj = zip.file(Asset.SKELETON_JSON) || this.findFileBySuffix(zip, Asset.SKE_JSON)) {
      const jsonStr = await zipObj.async('text')
      this._skeletonJson = JSON.parse(jsonStr)
      this._version = this._skeletonJson['version']
      if (this._version === '3.3' || this._version === '2.3') {
        SkeletonUtil.setAutoTween(this._skeletonJson, false)  // fix回放bug
      }
      if (this._version !== '5.5') {
        this._skeletonJson = dbToNew(this._skeletonJson, this._textureJson)
      }
      this._version += ' json'
    } else if (zipObj = zip.file(Asset.SKELETON_BIN) || this.findFileBySuffix(zip, Asset.SKE_BIN)) {
      this._skeletonJson = await zipObj.async('arraybuffer')
      this._version = '5.5 binary'
      this._isBinData = true
    } else if (zipObj = zip.file(Asset.SKELETON_XML)) {
      const xmlStr = await zipObj.async('text')
      this._skeletonJson = DragonBonesXmlUtil.parseXmlStrToJson(xmlStr, toV3)
      this._version = '2.3 xml'
      SkeletonUtil.setAutoTween(this._skeletonJson, false)  // fix回放bug
      this._skeletonJson = dbToNew(this._skeletonJson, this._textureJson)
    }

    // skeleton texture
    if (zipObj = zip.file(Asset.TEXTURE_PNG) || this.findFileBySuffix(zip, Asset.TEX_PNG)) {
      const tex = await zipObj.async('arraybuffer')
      this._textureBmd = await this.createTexture(tex)
    }

  }

  private findFileBySuffix(zip: JSZip, suffix: string) {
    for (let key in zip.files) {
      if (key.charAt(0) !== '.' && key.substr(-suffix.length) === suffix) {
        return zip.file(key)
      }
    }
    return null
  }

  private createTexture(data: ArrayBuffer): Promise<egret.BitmapData> {
    return new Promise((resolve: Function) => {
      egret.BitmapData.create('arraybuffer', data, bmd => {
        resolve(bmd)
      })
    })
  }

  public getFactory(): dragonBones.EgretFactory {
    if (!this._factory) {
      if (this._skeletonJson && this._textureJson && this._textureBmd) {
        const texture = new egret.Texture();
        texture.bitmapData = this._textureBmd;
        this._factory = new dragonBones.EgretFactory();
        this._data = this._factory.parseDragonBonesData(this._skeletonJson);
        this._factory.parseTextureAtlasData(this._textureJson, texture);
        return this._factory;
      } else {
        egret.error(`create EgretFactory fail!`);
      }
    }
    return this._factory;
  }

  public dispose(): void {
    if (this._factory) {
      this._factory.clear(true);
      this._factory = null;
    }
    this._version = null;
    this._textureBmd = null;
    this._skeletonJson = null;
    this._textureJson = null;
    this._data = null;
    this._key = null;
    this._isBinData = false
  }

  public get name(): string {
    return this._key;
  }

  public createMovie(name: string): SkeletonMovie {
    if (name && this.getFactory()) {
      return new SkeletonMovie(this._factory.buildArmature(name));
    }
    return null;
  }

  public getArmatureNames(): string[] {
    if (this.getFactory() && this._data) {
      return this._data.armatureNames.concat();
    }
  }

  public get rawVersion(): string {
    return this._version
  }

  public get isBinData(): boolean {
    return this._isBinData
  }

  public get skeletonData(): any {
    return this._skeletonJson
  }
}